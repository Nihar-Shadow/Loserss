// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Yahoo Finance requires browser-like headers to avoid 401/429
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

// ─── Symbol search ──────────────────────────────────────────────────────────
async function searchSymbol(query: string): Promise<any[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0&enableFuzzyQuery=false`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) throw new Error(`Yahoo search failed: ${res.status}`);
  const json = await res.json();
  return json?.quotes ?? [];
}

// ─── Fetch OHLCV history + meta (contains regularMarketPrice, currency, etc.) ─
async function fetchChartWithMeta(symbol: string, days: number): Promise<{ quotes: any[]; meta: any }> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - days * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false&events=div%2Csplit`;

  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chart fetch failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    const errMsg = json?.chart?.error?.description ?? "No chart data returned from Yahoo Finance";
    throw new Error(errMsg);
  }

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  const quotes = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString(),
      open: q.open?.[i] ?? null,
      high: q.high?.[i] ?? null,
      low: q.low?.[i] ?? null,
      close: q.close?.[i] ?? null,
      volume: q.volume?.[i] ?? null,
    }))
    .filter((d) => d.close !== null);

  return { quotes, meta };
}

// ─── Fetch fundamentals (marketCap, P/E, 52wk hi/lo) via quoteSummary ─────
async function fetchFundamentals(symbol: string): Promise<any> {
  // query2 host sometimes has looser auth — try with modules=price,summaryDetail
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price%2CsummaryDetail%2CdefaultKeyStatistics`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) {
    console.warn(`quoteSummary failed with ${res.status}, will use chart meta only`);
    return null;
  }
  const json = await res.json();
  const r = json?.quoteSummary?.result?.[0];
  if (!r) return null;

  const price = r.price ?? {};
  const summary = r.summaryDetail ?? {};
  const stats = r.defaultKeyStatistics ?? {};

  return {
    regularMarketPrice: price.regularMarketPrice?.raw ?? null,
    marketCap: price.marketCap?.raw ?? summary.marketCap?.raw ?? null,
    currency: price.currency ?? null,
    trailingPE: summary.trailingPE?.raw ?? stats.trailingPE?.raw ?? null,
    forwardPE: summary.forwardPE?.raw ?? stats.forwardPE?.raw ?? null,
    fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.raw ?? null,
    fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.raw ?? null,
    shortName: price.shortName ?? null,
    longName: price.longName ?? null,
  };
}

// ─── Edge Function Handler ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { symbol, query, days = 400 } = body;

    // Search mode
    if (query) {
      const quotes = await searchSymbol(query);
      return new Response(JSON.stringify(quotes), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Append .NS for Indian stocks without exchange suffix
    let yfSymbol = symbol.trim().toUpperCase();
    if (!yfSymbol.includes(".") && /^[A-Z0-9&-]+$/.test(yfSymbol)) {
      yfSymbol = `${yfSymbol}.NS`;
    }

    const numDays = Math.min(Number(days) || 400, 800);

    // Fetch chart (always works) + fundamentals (best-effort) in parallel
    const [{ quotes: history, meta }, fundamentals] = await Promise.all([
      fetchChartWithMeta(yfSymbol, numDays),
      fetchFundamentals(yfSymbol).catch(() => null), // never fail the whole request
    ]);

    if (!history.length) {
      return new Response(
        JSON.stringify({ error: `No historical data found for "${yfSymbol}". Please verify the symbol.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute 52-week high/low from history as rock-solid fallback
    const closes = history.map((d) => d.close).filter(Boolean);
    const highs = history.map((d) => d.high).filter(Boolean);
    const lows = history.map((d) => d.low).filter(Boolean);
    const computedHigh = highs.length ? Math.max(...highs) : null;
    const computedLow = lows.length ? Math.min(...lows) : null;

    // Build the quote object — chart meta is the primary source, fundamentals augment it
    const quote = {
      symbol: yfSymbol,
      currency: fundamentals?.currency ?? meta?.currency ?? "INR",
      regularMarketPrice:
        fundamentals?.regularMarketPrice ??
        meta?.regularMarketPrice ??
        closes[closes.length - 1] ??
        null,
      marketCap: fundamentals?.marketCap ?? null,
      trailingPE: fundamentals?.trailingPE ?? null,
      forwardPE: fundamentals?.forwardPE ?? null,
      fiftyTwoWeekHigh: fundamentals?.fiftyTwoWeekHigh ?? computedHigh,
      fiftyTwoWeekLow: fundamentals?.fiftyTwoWeekLow ?? computedLow,
      shortName: fundamentals?.shortName ?? meta?.symbol ?? yfSymbol,
    };

    return new Response(JSON.stringify({ history, quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("stock-data error:", err?.message ?? err);

    let userMessage: string = err?.message ?? "Unknown error fetching stock data.";

    if (userMessage.includes("429") || userMessage.toLowerCase().includes("too many requests")) {
      userMessage = "Yahoo Finance is temporarily rate-limiting this server. Please wait 30 seconds and try again.";
    } else if (userMessage.includes("404") || userMessage.toLowerCase().includes("no data") || userMessage.toLowerCase().includes("no chart")) {
      userMessage = "Symbol not found on Yahoo Finance. Please check the ticker (e.g. NATIONALUM.NS) and try again.";
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
