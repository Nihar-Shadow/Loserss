import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import yahooFinance from "npm:-yahoo-finance2@2.11.3"; // Using npm specifier

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, days = 30 } = await req.json();
    if (!symbol) throw new Error("Symbol is required");

    // Fetch historical data
    const queryOptions = { period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
    const historical = await yahooFinance.historical(symbol, queryOptions);

    // Fetch quote data for fundamentals
    const quote = await yahooFinance.quote(symbol);

    return new Response(JSON.stringify({ historical, quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Yahoo Finance error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
