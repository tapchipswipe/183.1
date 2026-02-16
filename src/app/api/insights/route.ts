import { NextResponse } from "next/server";
import { getOpenAIClient } from "../../../lib/ai/openai";
import { getClaudeClient } from "../../../lib/ai/claude";
import { generateHeuristicInsight, type One82Transaction } from "../../../lib/one82-core";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const transactions = (body?.transactions ?? []) as One82Transaction[];
  const prompt = String(body?.prompt ?? "Analyze these transactions and produce 1-3 actionable insights.");

  const openai = getOpenAIClient();
  if (openai) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are One82 AI. Return concise, actionable insights as JSON." },
        { role: "user", content: `${prompt}\n\nTransactions:\n${JSON.stringify(transactions).slice(0, 120_000)}` },
      ],
      temperature: 0.3,
    });

    return NextResponse.json({
      provider: "openai",
      raw: completion.choices[0]?.message?.content ?? "",
    });
  }

  const claude = getClaudeClient();
  if (claude) {
    const msg = await claude.messages.create({
      model: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 700,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nTransactions:\n${JSON.stringify(transactions).slice(0, 120_000)}`,
        },
      ],
    });

    const text = msg.content?.map((c) => ("text" in c ? c.text : "")).join("\n") ?? "";
    return NextResponse.json({ provider: "claude", raw: text });
  }

  // No keys configured: return deterministic heuristic output so UI can still function.
  return NextResponse.json({
    provider: "heuristic",
    insight: generateHeuristicInsight(transactions),
  });
}

