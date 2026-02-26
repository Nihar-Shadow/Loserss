// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize column names to our expected format
function normalizeColumnName(col: string): string {
  const lower = col.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  const symbolAliases = ["symbol", "ticker", "stock", "stock_symbol", "scrip", "stock_name", "instrument"];
  const sharesAliases = ["quantity", "qty", "shares", "units", "no_of_shares", "holdings"];
  const priceAliases = ["average_price", "avg_price", "avg_cost", "buy_price", "purchase_price", "cost_price", "average_cost", "buy_avg"];
  const sectorAliases = ["sector", "industry", "category", "asset_class"];

  if (symbolAliases.includes(lower)) return "symbol";
  if (sharesAliases.includes(lower)) return "shares";
  if (priceAliases.includes(lower)) return "avg_cost";
  if (sectorAliases.includes(lower)) return "sector";
  return lower;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  // Parse header
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const normalizedHeaders = headers.map(normalizeColumnName);

  // Validate required columns
  if (!normalizedHeaders.includes("symbol")) {
    throw new Error(`Missing required column: symbol/ticker/stock. Found columns: ${headers.join(", ")}`);
  }
  if (!normalizedHeaders.includes("shares")) {
    throw new Error(`Missing required column: quantity/shares/qty. Found columns: ${headers.join(", ")}`);
  }
  if (!normalizedHeaders.includes("avg_cost")) {
    throw new Error(`Missing required column: average_price/avg_cost/buy_price. Found columns: ${headers.join(", ")}`);
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.replace(/^"|"$/g, "").trim());
    if (values.length !== headers.length) continue; // skip malformed rows
    const row: Record<string, string> = {};
    normalizedHeaders.forEach((h, idx) => { row[h] = values[idx]; });
    rows.push(row);
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT via getClaims (doesn't require active session)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub as string;

    const { csv_content } = await req.json();
    if (!csv_content || typeof csv_content !== "string") {
      throw new Error("Missing csv_content in request body");
    }

    // Size limit: ~2MB text
    if (csv_content.length > 2 * 1024 * 1024) {
      throw new Error("CSV content too large. Maximum 2MB.");
    }

    const rows = parseCSV(csv_content);
    if (rows.length === 0) throw new Error("No valid data rows found in CSV");
    if (rows.length > 500) throw new Error("Too many holdings. Maximum 500 rows.");

    // Validate and transform rows
    const holdings = rows.map((row, idx) => {
      const symbol = row.symbol?.toUpperCase().replace(/[^A-Z0-9.]/g, "");
      if (!symbol) throw new Error(`Row ${idx + 2}: Invalid symbol`);

      const shares = parseFloat(row.shares);
      if (isNaN(shares) || shares <= 0) throw new Error(`Row ${idx + 2}: Invalid quantity for ${symbol}`);

      const avgCost = parseFloat(row.avg_cost);
      if (isNaN(avgCost) || avgCost <= 0) throw new Error(`Row ${idx + 2}: Invalid price for ${symbol}`);

      return {
        user_id: userId,
        symbol,
        shares,
        avg_cost: avgCost,
        sector: row.sector || null,
      };
    });

    // Delete existing holdings for this user, then insert new ones
    const { error: deleteError } = await supabase
      .from("portfolio_holdings")
      .delete()
      .eq("user_id", userId);

    if (deleteError) throw new Error(`Failed to clear existing holdings: ${deleteError.message}`);

    const { data: inserted, error: insertError } = await supabase
      .from("portfolio_holdings")
      .insert(holdings)
      .select();

    if (insertError) throw new Error(`Failed to insert holdings: ${insertError.message}`);

    // Calculate summary
    const totalInvestment = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);
    const summary = {
      total_holdings: holdings.length,
      total_investment: Math.round(totalInvestment * 100) / 100,
      symbols: holdings.map(h => h.symbol),
    };

    return new Response(JSON.stringify({ success: true, summary, holdings: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portfolio-upload error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
