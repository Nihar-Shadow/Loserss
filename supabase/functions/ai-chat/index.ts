// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, portfolio_context } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const systemPrompt = `You are a strict, quantitative AI Financial Advisor engine.
You MUST output your response as a valid JSON object matching this exact schema. Do NOT include markdown wrap or conversational filler outside the JSON.

SCHEMA:
{
  "summary": "Brief 2-3 sentence overview of the portfolio's current state based strictly on provided data.",
  "risk_analysis": "Detailed explanation of exposure, referencing exact numeric percentages from the JSON input and nothing else.",
  "strategy": "Actionable recommendation (e.g., 'Reduce AAPL by 5%')",
  "confidence": "High/Medium/Low"
}

You have been provided with the following live quantitative context:
${portfolio_context || ""}

Guidelines:
1) Deterministic Reasoning: If calculating Beta, ALWAYS use the weighted average formula: Sum(weight * asset_beta). Assume default beta of 1.0 for standard equities if missing.
2) Sector Exposure & Vulnerability: ALWAYS calculate sector weight as Sum(weight by sector).
3) Sentiment Logic Matrix: If the user has >20% exposure to a sector AND that sector's sentiment is negative (less than 0):
   - You MUST flag this as a "Sector Vulnerability".
   - You MUST quantify the potential downside risk in the "risk_analysis" section.
   - Example Analysis: "Technology sentiment is highly negative (-0.7). With 44% exposure, your portfolio faces high vulnerability to a tech sell-off."
   - Adjust strategy recommendations: Decrease your "confidence_level" on holding recommendations in that sector, or explicitly recommend hedging.
4) Risk Flags: You MUST flag any holding that represents >25% of the portfolio.
5) Specificity: Use exact numeric values from the backend context. Point to exact percentages.
6) Never give generic advice. Keep your outputs purely analytical and structurally compliant. Return ONLY valid JSON, do not wrap in markdown quotes.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No stream content from gateway");

    const decoder = new TextDecoder();
    let textBuffer = "";
    let finalContent = "";

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        // Ignore OpenRouter keep-alives and empty lines (the root of the JSON parsing error!)
        if (line.startsWith(":") || line.trim() === "") continue;

        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();

        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) finalContent += chunk;
        } catch (err) {
          console.warn("Could not parse stream chunk", jsonStr);
        }
      }
    }

    // Sanitize any accidental markdown codeblock wrappers
    finalContent = finalContent.replace(/^```json\n?/gi, "").replace(/\n?```$/gi, "").trim();

    return new Response(JSON.stringify(finalContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
