import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PortfolioHolding {
  id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
  sector: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[];
  totalInvestment: number;
  riskScore: number;
  riskLabel: "Low" | "Medium" | "High";
  diversificationScore: number;
  allocations: { symbol: string; value: number; pct: number; sector: string | null }[];
}

// High-risk sectors/symbols
const HIGH_RISK = ["BITO", "MARA", "COIN", "DOGE", "SHIB", "GME", "AMC"];
const MED_RISK_SECTORS = ["Technology", "Semiconductors", "Crypto", "Automotive"];

function computeSummary(holdings: PortfolioHolding[]): PortfolioSummary {
  if (holdings.length === 0) {
    return { holdings, totalInvestment: 0, riskScore: 0, riskLabel: "Low", diversificationScore: 0, allocations: [] };
  }

  const totalInvestment = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);

  const allocations = holdings.map(h => {
    const value = h.shares * h.avg_cost;
    return { symbol: h.symbol, value, pct: totalInvestment > 0 ? (value / totalInvestment) * 100 : 0, sector: h.sector };
  }).sort((a, b) => b.value - a.value);

  // Risk scoring: weighted by allocation
  let weightedRisk = 0;
  for (const a of allocations) {
    let risk = 1; // low
    if (HIGH_RISK.includes(a.symbol)) risk = 3;
    else if (MED_RISK_SECTORS.includes(a.sector || "")) risk = 2;
    weightedRisk += risk * (a.pct / 100);
  }

  // Concentration penalty
  const maxAlloc = Math.max(...allocations.map(a => a.pct));
  if (maxAlloc > 40) weightedRisk = Math.min(3, weightedRisk + 0.5);

  const riskScore = Math.round(weightedRisk * 10) / 10;
  const riskLabel: "Low" | "Medium" | "High" = riskScore >= 2.2 ? "High" : riskScore >= 1.5 ? "Medium" : "Low";

  // Diversification: based on count + sector variety
  const uniqueSectors = new Set(allocations.map(a => a.sector).filter(Boolean)).size;
  const diversificationScore = Math.min(100, holdings.length * 12 + uniqueSectors * 15 + (maxAlloc < 30 ? 20 : maxAlloc < 50 ? 10 : 0));

  return { holdings, totalInvestment, riskScore, riskLabel, diversificationScore, allocations };
}

export function usePortfolio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return computeSummary([]);
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return computeSummary((data || []) as PortfolioHolding[]);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portfolio"] });

  return { ...query, invalidate };
}
