import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, Shield, TrendingUp, Brain, Upload, Briefcase } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import CSVUpload from "@/components/CSVUpload";

const COLORS = [
  "hsl(210, 100%, 55%)", "hsl(145, 80%, 42%)", "hsl(280, 70%, 55%)",
  "hsl(38, 92%, 50%)", "hsl(0, 75%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(320, 70%, 55%)", "hsl(60, 80%, 45%)", "hsl(200, 60%, 50%)",
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function PortfolioAnalyzer() {
  const { data: portfolio, isLoading, invalidate } = usePortfolio();
  const [showUpload, setShowUpload] = useState(false);

  const hasHoldings = portfolio && portfolio.holdings.length > 0;
  const totalValue = portfolio?.totalInvestment ?? 0;
  const riskScore = portfolio?.riskScore ?? 0;
  const diversificationScore = portfolio?.diversificationScore ?? 0;
  const allocations = portfolio?.allocations ?? [];
  const holdings = portfolio?.holdings ?? [];

  const pieData = allocations.map(a => ({ name: a.symbol, value: Math.round(a.value) }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Analyzer</h1>
          <p className="text-muted-foreground mt-1">Analyze your holdings, risk exposure, and get AI-powered feedback.</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          {showUpload ? "Hide Upload" : "Import CSV"}
        </button>
      </motion.div>

      {/* CSV Upload Section */}
      {showUpload && (
        <motion.div variants={item} className="glass-card p-5">
          <CSVUpload onSuccess={() => { invalidate(); setShowUpload(false); }} />
        </motion.div>
      )}

      {isLoading && (
        <div className="glass-card p-12 text-center text-muted-foreground">Loading portfolio data...</div>
      )}

      {!isLoading && !hasHoldings && !showUpload && (
        <motion.div variants={item} className="glass-card p-12 text-center space-y-4">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">No Holdings Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Import your brokerage CSV to see portfolio analysis, risk scores, and AI-powered insights.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Upload className="w-4 h-4" />
            Import Portfolio CSV
          </button>
        </motion.div>
      )}

      {hasHoldings && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Investment", value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-primary" },
              { label: "Risk Score", value: `${riskScore.toFixed(1)}/3.0`, icon: AlertTriangle, color: riskScore > 2 ? "text-loss" : riskScore > 1.5 ? "text-warning" : "text-gain" },
              { label: "Diversification", value: `${diversificationScore}%`, icon: Shield, color: diversificationScore > 70 ? "text-gain" : "text-warning" },
              { label: "Holdings", value: holdings.length.toString(), icon: Briefcase, color: "text-primary" },
            ].map((s) => (
              <motion.div variants={item} key={s.label} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <motion.div variants={item} className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Asset Allocation</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {allocations.map((a, i) => (
                  <div key={a.symbol} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{a.symbol} ({a.pct.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Holdings Table */}
            <motion.div variants={item} className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Holdings</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allocations.map((a, i) => {
                  const h = holdings.find(h => h.symbol === a.symbol)!;
                  const riskLevel = a.pct > 40 ? "High" : a.pct > 20 ? "Medium" : "Low";
                  return (
                    <div key={a.symbol} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] + "22", color: COLORS[i % COLORS.length] }}>
                          {a.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.symbol}</p>
                          <p className="text-xs text-muted-foreground">{h.shares} shares @ ${h.avg_cost.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">${a.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          riskLevel === "Low" ? "bg-gain/10 text-gain" : riskLevel === "Medium" ? "bg-warning/10 text-warning" : "bg-loss/10 text-loss"
                        }`}>
                          {riskLevel} Risk
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* AI Feedback */}
          <motion.div variants={item} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">AI Portfolio Feedback</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gain/5 border border-gain/20">
                <h3 className="font-semibold text-gain text-sm mb-1">Strengths</h3>
                <p className="text-sm text-muted-foreground">
                  {holdings.length >= 5 ? "Well-diversified across multiple assets." : "Portfolio has focused positions."}
                  {" "}Total investment of ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} across {holdings.length} holdings.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                <h3 className="font-semibold text-warning text-sm mb-1">Risks</h3>
                <p className="text-sm text-muted-foreground">
                  {allocations[0]?.pct > 40 ? `High concentration: ${allocations[0].symbol} at ${allocations[0].pct.toFixed(0)}%.` : "No single holding exceeds 40%."}
                  {" "}Risk score: {riskScore.toFixed(1)}/3.0 ({portfolio?.riskLabel}).
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="font-semibold text-primary text-sm mb-1">Suggestions</h3>
                <p className="text-sm text-muted-foreground">
                  {diversificationScore < 60 ? "Consider adding more diverse assets to improve diversification." : "Good diversification score."}
                  {" "}Use the AI Advisor for personalized rebalancing tips.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
