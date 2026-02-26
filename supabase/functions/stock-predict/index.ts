// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, name, sector, price, userPrediction, priceHistory } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const recentTrend = priceHistory && priceHistory.length > 5
      ? priceHistory.slice(-5).map((p: any) => `$${p.price}`).join(" → ")
      : "N/A";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        tools: [
          {
            type: "function",
            function: {
              name: "stock_prediction_analysis",
              description: "Provide an AI stock prediction with detailed analysis.",
              parameters: {
                type: "object",
                properties: {
                  ai_direction: {
                    type: "string",
                    enum: ["up", "down"],
                    description: "AI's predicted direction based on analysis",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence percentage between 55 and 95",
                  },
                  short_reasoning: {
                    type: "string",
                    description: "One-sentence prediction rationale (under 30 words)",
                  },
                  detailed_analysis: {
                    type: "string",
                    description: "3-4 sentence technical analysis covering momentum, volume patterns, sector sentiment, and key indicators like RSI/MACD. Be specific with numbers and indicator readings.",
                  },
                  key_factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string", description: "Factor name (e.g. 'RSI Momentum')" },
                        signal: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                        detail: { type: "string", description: "Brief explanation under 15 words" },
                      },
                      required: ["factor", "signal", "detail"],
                    },
                    description: "3-5 key technical/fundamental factors",
                  },
                  outcome_explanation_if_up: {
                    type: "string",
                    description: "2-3 sentence explanation if the actual outcome turns out UP. Explain why the stock moved up using technical/fundamental reasoning.",
                  },
                  outcome_explanation_if_down: {
                    type: "string",
                    description: "2-3 sentence explanation if the actual outcome turns out DOWN. Explain why the stock moved down using technical/fundamental reasoning.",
                  },
                },
                required: ["ai_direction", "confidence", "short_reasoning", "detailed_analysis", "key_factors", "outcome_explanation_if_up", "outcome_explanation_if_down"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "stock_prediction_analysis" } },
        messages: [
          {
            role: "system",
            content: `You are a senior quantitative analyst at a hedge fund. Analyze stocks using technical and fundamental data. 
Be decisive — always pick a direction. Vary confidence based on signal strength. 
Use realistic indicator values (RSI 30-70 range, specific MACD crossover levels, etc.).
Make explanations educational and specific to the stock's sector and recent price action.`,
          },
          {
            role: "user",
            content: `Analyze ${symbol} (${name}) in the ${sector} sector. Current price: $${price}. Recent 5-day price trend: ${recentTrend}. The user predicted: ${userPrediction.toUpperCase()}. Generate your independent AI prediction with analysis.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Simulate actual market outcome with slight bias toward AI prediction
    const aiCorrectBias = analysis.confidence > 75 ? 0.6 : 0.52;
    const actualResult = Math.random() < aiCorrectBias
      ? analysis.ai_direction
      : (analysis.ai_direction === "up" ? "down" : "up");

    const outcomeExplanation = actualResult === "up"
      ? analysis.outcome_explanation_if_up
      : analysis.outcome_explanation_if_down;

    return new Response(JSON.stringify({
      ai_direction: analysis.ai_direction,
      confidence: Math.min(95, Math.max(55, analysis.confidence)),
      short_reasoning: analysis.short_reasoning,
      detailed_analysis: analysis.detailed_analysis,
      key_factors: analysis.key_factors,
      actual_result: actualResult,
      outcome_explanation: outcomeExplanation,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-predict error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
