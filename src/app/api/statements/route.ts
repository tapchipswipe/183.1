import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Placeholder endpoint: do NOT accept raw PDFs/images here yet.
  // Next step: upload to Supabase Storage, then run OCR/Vision server-side.
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "");
  const size = Number(body?.size ?? 0);

  return NextResponse.json({
    received: true,
    name,
    size,
    message: "Statement received. Connect OCR/Vision extraction on the server to parse transactions.",
  });
}

