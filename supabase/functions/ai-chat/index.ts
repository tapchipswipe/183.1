import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, conversation_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let companyContext = "";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, full_name")
          .eq("user_id", user.id)
          .single();

        if (profile?.company_id) {
          const [products, customers, suppliers, transactions] = await Promise.all([
            supabase.from("products").select("name, category, price, quantity").eq("company_id", profile.company_id).limit(50),
            supabase.from("customers").select("name, city, country").eq("company_id", profile.company_id).limit(50),
            supabase.from("suppliers").select("name, city, country").eq("company_id", profile.company_id).limit(50),
            supabase.from("transactions").select("type, amount, currency, status, transaction_date").eq("company_id", profile.company_id).order("transaction_date", { ascending: false }).limit(100),
          ]);

          companyContext = `
User: ${profile.full_name || "Unknown"}
Products (${products.data?.length || 0}): ${JSON.stringify(products.data?.slice(0, 20) || [])}
Customers (${customers.data?.length || 0}): ${JSON.stringify(customers.data?.slice(0, 20) || [])}
Suppliers (${suppliers.data?.length || 0}): ${JSON.stringify(suppliers.data?.slice(0, 20) || [])}
Recent Transactions (${transactions.data?.length || 0}): ${JSON.stringify(transactions.data?.slice(0, 30) || [])}`;
        }
      }
    }

    const systemPrompt = `You are a smart AI Business Advisor embedded in a business intelligence platform. You help users understand their business data, identify trends, and provide actionable recommendations.

You have access to the user's business data:
${companyContext || "No business data available yet. Encourage the user to add products, customers, suppliers, and transactions."}

Guidelines:
- Be concise and data-driven in your responses
- Reference specific numbers from the data when relevant
- Suggest actionable business insights
- If asked about something not in the data, say so honestly
- Format responses with markdown for readability`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
