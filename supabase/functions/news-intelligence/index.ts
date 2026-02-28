// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const { sectors, portfolio_stocks, portfolio_sectors } = await req.json();

    const hasPortfolio = portfolio_stocks && portfolio_stocks.length > 0;

    const systemPrompt = `You are a financial news intelligence AI. Generate realistic, current-feeling financial news analysis.
${hasPortfolio ? `The user holds these stocks: ${portfolio_stocks.join(", ")}. PRIORITIZE news directly relevant to their holdings. At least 50% of news items MUST be about their portfolio stocks.` : "Focus on major Indian market stocks."}

For each news item provide:
1) Sentiment Score: A float between -1.0 and 1.0.
2) Sector: The primary sector this news affects (e.g., Technology, Banking).

You MUST call the news_intelligence_report function with your precise analysis.`;

    const targetSectors = portfolio_sectors?.length > 0 ? portfolio_sectors : (sectors || ["Technology", "Banking", "Energy", "Pharma", "Auto"]);

    const userPrompt = `Generate a comprehensive financial news intelligence report covering these sectors: ${targetSectors.join(", ")}.
${hasPortfolio ? `\nIMPORTANT: The user's portfolio contains: ${portfolio_stocks.join(", ")}. Focus heavily on news affecting these specific stocks. Include global/international news if their stocks are global. Do NOT limit to Indian markets only — match the user's portfolio geography.` : ""}

Include:
1. 8 realistic financial news items (mix of positive, negative, neutral sentiment) with real stock tickers matching the user's holdings and relevant market peers.
2. Sector-wise sentiment breakdown (percentage positive/negative/neutral for each sector).
3. An overall market insight paragraph tailored to the user's portfolio exposure.
4. For each news item: title, source, time ago, sentiment (positive/negative/neutral), impact level (High/Medium/Low), affected stocks array, a 1-2 line summary, and a detailed AI analysis explaining WHY this news impacts the market.
5. 1-3 "drastic_alerts" for major market-impacting events (e.g. central bank rate changes, circuit breakers, regulatory actions, large M&A, sudden crashes/rallies). Each alert needs: severity (critical/warning), headline, description, affected_sectors array, and recommended_action for investors. If no drastic events, return an empty array.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "news_intelligence_report",
              description: "Return structured financial news intelligence data",
              parameters: {
                type: "object",
                properties: {
                  news_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        source: { type: "string" },
                        time: { type: "string" },
                        sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                        impact: { type: "string", enum: ["High", "Medium", "Low"] },
                        sector: { type: "string", description: "The primary sector affected" },
                        stocks: { type: "array", items: { type: "string" } },
                        summary: { type: "string" },
                        ai_analysis: { type: "string" },
                        sentiment_score: { type: "number", description: "Score from -1.0 to 1.0" },
                      },
                      required: [
                        "id", "title", "source", "time", "sentiment", "impact", "sector", "stocks", "summary",
                        "ai_analysis", "sentiment_score"
                      ],
                    },
                  },
                  sector_sentiment: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        positive: { type: "number" },
                        negative: { type: "number" },
                        neutral: { type: "number" },
                      },
                      required: ["name", "positive", "negative", "neutral"],
                    },
                  },
                  market_insight: { type: "string" },
                  market_mood: { type: "string", enum: ["bullish", "bearish", "neutral", "mixed"] },
                  nifty_sentiment: { type: "string" },
                  drastic_alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["critical", "warning"] },
                        headline: { type: "string" },
                        description: { type: "string" },
                        affected_sectors: { type: "array", items: { type: "string" } },
                        recommended_action: { type: "string" },
                      },
                      required: ["severity", "headline", "description", "affected_sectors", "recommended_action"],
                    },
                  },
                },
                required: ["news_items", "sector_sentiment", "market_insight", "market_mood", "nifty_sentiment", "drastic_alerts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "news_intelligence_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const report = JSON.parse(toolCall.function.arguments);
    const allocations = portfolio_allocations || [];

    // Deterministic Backend Math Logic (Bypasses LLM hallucinations)
    for (let i = 0; i < report.news_items.length; i++) {
      const news = report.news_items[i];

      // Calculate exposure
      const sectorAlloc = allocations.find((a: any) => a.sector === news.sector);
      const exposure = sectorAlloc ? (sectorAlloc.pct / 100) : 0;

      // Calculate vulnerability: sector_exposure × negative_sentiment × volatility
      const negSentiment = news.sentiment_score < 0 ? Math.abs(news.sentiment_score) : 0;
      const vulnScore = exposure * negSentiment * 1.5; // High volatility multiplier

      let vulnText = "None";
      if (vulnScore > 0) vulnText = "Low";
      if (vulnScore >= 0.05) vulnText = "Medium";
      if (vulnScore >= 0.15) vulnText = "High";

      // Market Impact Score 0-100 based on magnitude + exposure influence
      const impactScore = Math.min(100, Math.round(Math.abs(news.sentiment_score) * 100 * (1 + (exposure / 2))));

      // Historical Reaction Engine (simulates avg 3-day forward return)
      const histMoveNum = Number((news.sentiment_score * 2.8).toFixed(1));
      const histMoveStr = histMoveNum > 0 ? `+${histMoveNum}%` : `${histMoveNum}%`;

      // Projected Portfolio Drawdown over 3-5 days
      const drawdownNum = news.sentiment_score < 0 ? (vulnScore * -8).toFixed(2) : "+0.00";
      const drawdownStr = drawdownNum !== "+0.00" ? `${drawdownNum}%` : "+0.00%";

      // Inject the math into the returned payload obj
      news.portfolio_exposure = Number(exposure.toFixed(3));
      news.impact_score = impactScore;
      news.portfolio_vulnerability = vulnText;
      news.historical_avg_reaction = histMoveStr;
      news.projected_drawdown = drawdownStr;
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("news-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
