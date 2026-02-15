// Export job execution for data portability and compliance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
serve(async (req) => { const format = new URL(req.url).searchParams.get("format") || "csv"; return new Response(JSON.stringify({ format, status: "export_queued" })) })
