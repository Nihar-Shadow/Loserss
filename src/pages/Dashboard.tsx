import { motion } from "framer-motion";
import { 
  TrendingUp, TrendingDown, DollarSign, Target, Zap, ArrowUpRight, ArrowDownRight,
  BarChart3, Brain, BookOpen, Upload
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const portfolioData = [
  { date: "Jan", value: 42000 }, { date: "Feb", value: 44500 }, { date: "Mar", value: 41200 },
  { date: "Apr", value: 47800 }, { date: "May", value: 51200 }, { date: "Jun", value: 49800 },
  { date: "Jul", value: 53400 }, { date: "Aug", value: 56100 }, { date: "Sep", value: 54200 },
  { date: "Oct", value: 58700 }, { date: "Nov", value: 62300 }, { date: "Dec", value: 67450 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const StatCard = ({ icon: Icon, label, value, change, positive }: {
  icon: any; label: string; value: string; change: string; positive: boolean;
}) => (
  <motion.div variants={item} className="glass-card p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className={`flex items-center gap-1 text-sm font-mono font-medium ${positive ? "text-gain" : "text-loss"}`}>
        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </span>
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data: portfolio } = usePortfolio();

  // Fetch recent predictions
  const { data: recentPredictions } = useQuery({
    queryKey: ["recent-predictions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!user,
  });

  const totalValue = portfolio?.totalInvestment ?? 0;
  const holdingsCount = portfolio?.holdings.length ?? 0;
  const correctPredictions = recentPredictions?.filter(p => p.user_correct).length ?? 0;
  const totalPredictions = recentPredictions?.length ?? 0;
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  // Watchlist: use portfolio stocks or defaults
  const watchlist = portfolio && portfolio.allocations.length > 0
    ? portfolio.allocations.slice(0, 5).map(a => ({
        symbol: a.symbol,
        name: a.sector || "Unknown",
        value: a.value,
        pct: a.pct,
      }))
    : [
        { symbol: "AAPL", name: "Apple Inc.", value: 189.84, pct: 1.25 },
        { symbol: "TSLA", name: "Tesla Inc.", value: 248.42, pct: -2.04 },
        { symbol: "NVDA", name: "NVIDIA Corp.", value: 875.28, pct: 1.46 },
        { symbol: "MSFT", name: "Microsoft", value: 415.60, pct: 0.78 },
        { symbol: "AMZN", name: "Amazon", value: 185.07, pct: -0.77 },
      ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back — here's your financial overview.</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Portfolio Value" value={totalValue > 0 ? `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0"} change={holdingsCount > 0 ? `${holdingsCount} holdings` : "Import CSV"} positive={holdingsCount > 0} />
        <StatCard icon={TrendingUp} label="Risk Score" value={portfolio ? `${portfolio.riskScore.toFixed(1)}/3.0` : "—"} change={portfolio?.riskLabel ?? "N/A"} positive={portfolio ? portfolio.riskScore < 2 : true} />
        <StatCard icon={Target} label="Prediction Accuracy" value={`${accuracy}%`} change={`${totalPredictions} total`} positive={accuracy >= 50} />
        <StatCard icon={Zap} label="Diversification" value={portfolio ? `${portfolio.diversificationScore}%` : "—"} change={portfolio && portfolio.diversificationScore > 70 ? "Good" : "Needs work"} positive={portfolio ? portfolio.diversificationScore > 70 : false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <motion.div variants={item} className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Portfolio Performance</h2>
            <div className="flex gap-2 text-xs">
              {["1M", "3M", "6M", "1Y"].map((t) => (
                <button key={t} className={`px-3 py-1.5 rounded-md transition-colors ${t === "1Y" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(210, 100%, 55%)" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Watchlist / Portfolio Holdings */}
        <motion.div variants={item} className="glass-card p-5">
          <h2 className="text-lg font-semibold mb-4">{holdingsCount > 0 ? "Top Holdings" : "Watchlist"}</h2>
          <div className="space-y-3">
            {watchlist.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-semibold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium">${stock.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs font-mono text-muted-foreground">{stock.pct.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
          {holdingsCount === 0 && (
            <a href="/portfolio" className="flex items-center gap-2 mt-3 text-xs text-primary hover:text-primary/80">
              <Upload className="w-3 h-3" /> Import your portfolio
            </a>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Predictions */}
        <motion.div variants={item} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent Predictions</h2>
          </div>
          <div className="space-y-3">
            {(recentPredictions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No predictions yet. Head to the Prediction Arena!</p>
            )}
            {(recentPredictions ?? []).map((pred, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pred.user_correct ? "bg-gain/10" : "bg-loss/10"}`}>
                    {pred.predicted_direction === "up" ? (
                      <TrendingUp className={`w-4 h-4 ${pred.user_correct ? "text-gain" : "text-loss"}`} />
                    ) : (
                      <TrendingDown className={`w-4 h-4 ${pred.user_correct ? "text-gain" : "text-loss"}`} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{pred.stock_symbol}</p>
                    <p className="text-xs text-muted-foreground">Predicted {pred.predicted_direction}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${pred.user_correct ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                  {pred.user_correct ? "Correct" : "Wrong"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="glass-card p-5">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, label: "Predict Stock", desc: "Make a prediction", href: "/predictions" },
              { icon: BarChart3, label: "Analyze Portfolio", desc: "Check your holdings", href: "/portfolio" },
              { icon: BookOpen, label: "Continue Learning", desc: "Resume lessons", href: "/learn" },
              { icon: Brain, label: "Ask AI Advisor", desc: "Get personalized tips", href: "/advisor" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
              >
                <action.icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
