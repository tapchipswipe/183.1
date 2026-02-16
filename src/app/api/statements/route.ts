import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type ExtractedTransaction = {
  occurred_at: string;
  amount: number;
  currency?: string;
  description?: string;
  product?: string;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function extractJson(text: string) {
  // Try to find a JSON object inside free-form LLM output.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("No JSON found in model output");
  const slice = text.slice(first, last + 1);
  return JSON.parse(slice);
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const mime = file.type || "application/octet-stream";
    const dataUrl = `data:${mime};base64,${base64}`;

    const openaiKey = env("OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey: openaiKey });
    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

    const prompt =
      "You are One82 Statement Analyzer. Extract ALL card transactions from this statement image/PDF page.\n" +
      "Return STRICT JSON only with this shape:\n" +
      "{\n" +
      '  "currency": "USD",\n' +
      '  "total_volume": 0,\n' +
      '  "total_fees": 0,\n' +
      '  "confidence": 0.0,\n' +
      '  "transactions": [\n' +
      '    {"occurred_at":"2026-02-15T08:30:00Z","amount":45.99,"currency":"USD","description":"Coffee","product":"Coffee"}\n' +
      "  ]\n" +
      "}\n" +
      "Use ISO timestamps in UTC when possible. Amounts must be positive numbers.";

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Return strict JSON only. No backticks. No extra text." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        } as any,
      ],
      temperature: 0.2,
      max_tokens: 1800,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const extracted = extractJson(raw) as {
      currency?: string;
      total_volume?: number;
      total_fees?: number;
      confidence?: number;
      transactions?: ExtractedTransaction[];
    };

    const currency = String(extracted.currency ?? "USD").toUpperCase();
    const totalVolume = Number(extracted.total_volume ?? 0);
    const totalFees = extracted.total_fees == null ? null : Number(extracted.total_fees);
    const confidence = extracted.confidence == null ? null : Number(extracted.confidence);
    const transactions = Array.isArray(extracted.transactions) ? extracted.transactions : [];

    // Ensure merchant exists for this user.
    const ownerId = userData.user.id;
    const { data: merchantRow, error: merchantError } = await supabase
      .from("merchants")
      .upsert(
        { owner_user_id: ownerId, business_name: "My Business", store_type: null },
        { onConflict: "owner_user_id" },
      )
      .select("id")
      .single();
    if (merchantError) throw merchantError;
    const merchantId = (merchantRow as any).id as string;

    // Insert statement record (optional table may not exist if migration not applied yet).
    let statementId: string | null = null;
    const { data: stData } = await supabase
      .from("merchant_statements")
      .insert({
        merchant_id: merchantId,
        file_name: file.name,
        file_type: mime,
        extracted_json: extracted,
        currency,
        total_volume: totalVolume,
        total_fees: totalFees,
        confidence,
      })
      .select("id")
      .maybeSingle();
    statementId = (stData as any)?.id ?? null;

    // Insert transactions
    const rows = transactions
      .filter((t) => t && t.occurred_at && Number.isFinite(Number(t.amount)))
      .map((t) => ({
        merchant_id: merchantId,
        occurred_at: new Date(t.occurred_at).toISOString(),
        amount: Number(t.amount),
        currency: String(t.currency ?? currency).toUpperCase(),
        description: (t.description ?? t.product ?? "Statement transaction").slice(0, 500),
        product_name: (t.product ?? null)?.slice(0, 250) ?? null,
        source: "statement",
        statement_id: statementId,
        raw: t,
      }));

    let inserted = 0;
    if (rows.length) {
      const { error: txErr } = await supabase.from("transactions").insert(rows);
      if (txErr) throw txErr;
      inserted = rows.length;
    }

    return NextResponse.json({
      inserted_transactions: inserted,
      currency,
      total_volume: totalVolume,
      total_fees: totalFees,
      confidence,
      message: "Statement imported successfully.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

