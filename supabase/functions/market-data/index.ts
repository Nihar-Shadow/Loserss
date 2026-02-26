// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractJson(text: string): unknown {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const end = cleaned.lastIndexOf(start !== -1 && cleaned[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  cleaned = cleaned.substring(start, end + 1)
    .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, "");
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const prompt = `You are a financial market data generator. Generate realistic current market data for today.

Return ONLY a JSON object (no markdown, no explanation) with this structure:
{
  "ticker_tape": [{"symbol":"NIFTY","price":25496.55,"change_pct":0.06}, ...6 items],
  "global_indices": [{"name":"SENSEX","symbol":"SENSEX","price":82248.61,"change_pct":-0.03,"exchange":"BSE India","chart_data":[82100,82200,82150,82300,82250,82200,82280,82248]}, ...10 items],
  "featured_index": {"name":"NIFTY 50","symbol":"NIFTY","exchange":"NSE India","price":25496.55,"change":14.05,"change_pct":0.06,"status":"AT CLOSE","time":"AS OF today","intraday_chart":[25420,25440,25460,25450,25470,25490,25510,25500,25480,25496]},
  "quick_compare": [{"name":"SENSEX","price":82248.61,"change_pct":-0.03}, ...4 items],
  "most_active_stocks": [{"symbol":"AAPL","name":"Apple Inc.","price":189.84,"change_pct":1.25,"volume":"52.3M","market":"NASDAQ"}, ...12 items]
}

Include 10 global_indices: SENSEX, NIFTY, DOW, FTSE 100, Nikkei 225, NASDAQ, S&P 500, DAX, Hang Seng, Shanghai.
Include 12 most_active_stocks from US, India, UK, Japan. Use realistic prices. chart_data: 8-10 points.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${res.status}`);
    }

    const aiData = await res.json();
    const text = aiData?.choices?.[0]?.message?.content || "";
    console.log("AI response length:", text.length);

    const marketData = extractJson(text);

    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
