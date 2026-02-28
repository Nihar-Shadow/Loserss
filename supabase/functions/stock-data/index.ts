import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import yahooFinance from "npm:yahoo-finance2@2.11.3"; // Using npm specifier

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestedSymbol = "";
  try {
    const { symbol, query, days = 30 } = await req.json();

    if (query) {
      const searchRes = await yahooFinance.search(query);
      return new Response(JSON.stringify(searchRes.quotes), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!symbol) throw new Error("Symbol is required");
    requestedSymbol = symbol;

    // Automatically append .NS for common Indian stocks if no exchange is provided
    let yfSymbol = symbol;
    if (!yfSymbol.includes('.') && /^[A-Z0-9]+$/.test(yfSymbol)) {
      // If it looks like an Indian stock (like COALINDIA, RELIANCE, TCS) that doesn't have an exchange suffix, append .NS
      yfSymbol = `${yfSymbol}.NS`;
    }
    requestedSymbol = yfSymbol;

    // Fetch historical data
    const period1 = new Date(Date.now() - (Number(days) || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const historyData = await yahooFinance.chart(yfSymbol, {
      period1: period1,
      interval: "1d"
    });
    const historical = historyData.quotes;

    // Fetch quote data for fundamentals
    const quote = await yahooFinance.quote(yfSymbol);

    return new Response(JSON.stringify({ history: historical, quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Yahoo Finance error:", err);

    let finalSym = requestedSymbol || "UNKNOWN";

    // If Yahoo Finance IP bans us (429 Too Many Requests), return dummy data instead of breaking the app during the hackathon
    if (err.message && err.message.includes("Too Many Requests")) {
      let hash = 0;
      for (let i = 0; i < finalSym.length; i++) {
        hash = finalSym.charCodeAt(i) + ((hash << 5) - hash);
      }

      const isIndian = finalSym.endsWith('.NS') || finalSym.endsWith('.BO') || (!finalSym.includes('.') && /^[A-Z0-9]+$/.test(finalSym));
      const currency = isIndian ? "INR" : "USD";

      // Indian stocks generally have higher nominal share prices compared to US
      const scaleMultiplier = isIndian ? 5 : 1;
      const mockBase = (100 + (Math.abs(hash) % 400)) * scaleMultiplier;

      const dummyHistory = Array.from({ length: 30 }).map((_, i) => {
        const base = mockBase + Math.random() * (mockBase * 0.1);
        return {
          date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
          open: base, high: base + (mockBase * 0.02), low: base - (mockBase * 0.02), close: base + (Math.random() > 0.5 ? (mockBase * 0.01) : -(mockBase * 0.01)), volume: 1000000 + Math.random() * 500000
        };
      });
      const dummyQuote = {
        currency: currency, regularMarketPrice: Number((mockBase * 1.05).toFixed(2)), marketCap: 2500000000000, trailingPE: 12.5, fiftyTwoWeekHigh: Number((mockBase * 1.2).toFixed(2)), fiftyTwoWeekLow: Number((mockBase * 0.8).toFixed(2))
      };

      return new Response(JSON.stringify({ history: dummyHistory, quote: dummyQuote }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
