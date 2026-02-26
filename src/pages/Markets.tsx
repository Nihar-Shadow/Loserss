import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Globe, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TickerItem { symbol: string; price: number; change_pct: number }
interface GlobalIndex { name: string; symbol: string; price: number; change_pct: number; exchange: string; chart_data: number[] }
interface FeaturedIndex { name: string; symbol: string; exchange: string; price: number; change: number; change_pct: number; status: string; time: string; intraday_chart: number[] }
interface QuickCompare { name: string; price: number; change_pct: number }
interface ActiveStock { symbol: string; name: string; price: number; change_pct: number; volume: string; market: string }
interface MarketData {
  ticker_tape: TickerItem[];
  global_indices: GlobalIndex[];
  featured_index: FeaturedIndex;
  quick_compare: QuickCompare[];
  most_active_stocks: ActiveStock[];
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const MiniChart = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={positive ? "hsl(145, 80%, 42%)" : "hsl(0, 75%, 55%)"} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function Markets() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<GlobalIndex | null>(null);
  const [timeframe, setTimeframe] = useState("1D");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("market-data");
      if (error) throw error;
      setData(res);
      if (res?.global_indices?.length > 0 && !selectedIndex) {
        // Select NIFTY or first
        const nifty = res.global_indices.find((i: GlobalIndex) => i.symbol === "NIFTY");
        setSelectedIndex(nifty || res.global_indices[0]);
      }
    } catch (e) {
      console.error("Failed to fetch market data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px] lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground text-center py-20">Failed to load market data.</p>;

  const featured = selectedIndex
    ? { ...data.featured_index, name: selectedIndex.name, symbol: selectedIndex.symbol, price: selectedIndex.price, change: selectedIndex.price * (selectedIndex.change_pct / 100), change_pct: selectedIndex.change_pct, intraday_chart: selectedIndex.chart_data }
    : data.featured_index;

  const intradayChartData = featured.intraday_chart.map((v, i) => ({ time: i, price: v }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Ticker Tape */}
      <motion.div variants={item} className="overflow-hidden glass-card py-2 px-4">
        <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
          {[...data.ticker_tape, ...data.ticker_tape].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm font-mono">
              <span className="font-semibold text-foreground">{t.symbol}</span>
              {t.change_pct >= 0 ? (
                <span className="text-gain flex items-center gap-0.5">▲ +{t.change_pct.toFixed(2)}%</span>
              ) : (
                <span className="text-loss flex items-center gap-0.5">▼ {t.change_pct.toFixed(2)}%</span>
              )}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Global Markets</h1>
          <p className="text-sm text-muted-foreground">Live data feed · Most traded indices & stocks worldwide</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Main Grid: Sidebar Indices + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Index List */}
        <motion.div variants={item} className="glass-card p-0 overflow-hidden">
          <div className="p-3 border-b border-border/50 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Global Market</span>
          </div>
          <div className="divide-y divide-border/30 max-h-[520px] overflow-y-auto">
            {data.global_indices.map((idx) => {
              const isSelected = selectedIndex?.symbol === idx.symbol;
              const positive = idx.change_pct >= 0;
              return (
                <button
                  key={idx.symbol}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-3 text-left transition-colors hover:bg-secondary/50 ${isSelected ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{idx.name}</p>
                      <p className="text-xs text-muted-foreground">{idx.symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MiniChart data={idx.chart_data} positive={positive} />
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">{idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className={`text-xs font-mono ${positive ? "text-gain" : "text-loss"}`}>
                        {positive ? "+" : ""}{idx.change_pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Right: Featured Chart */}
        <motion.div variants={item} className="glass-card p-5 lg:col-span-3">
          {/* Index Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono">{featured.symbol}</span>
                <span>{featured.exchange || selectedIndex?.exchange} · CURRENCY IN INR</span>
              </div>
              <h2 className="text-xl font-bold">{featured.name} ({featured.symbol})</h2>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-3xl font-bold font-mono">{featured.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="text-sm text-muted-foreground">{featured.status || "AT CLOSE"}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-mono font-medium ${featured.change_pct >= 0 ? "text-gain" : "text-loss"}`}>
                  {featured.change_pct >= 0 ? "+" : ""}{featured.change.toFixed(2)} ({featured.change_pct >= 0 ? "+" : ""}{featured.change_pct.toFixed(2)}%)
                </span>
                <span className="text-xs text-muted-foreground">{featured.time || `AS OF ${new Date().toLocaleDateString()}`}</span>
              </div>
            </div>
          </div>

          {/* Timeframe buttons */}
          <div className="flex items-center gap-1 mb-4">
            {["1D", "5D", "1M", "3M", "YTD", "1Y", "3Y", "5Y", "Max"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${timeframe === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={intradayChartData}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={featured.change_pct >= 0 ? "hsl(145, 80%, 42%)" : "hsl(0, 75%, 55%)"} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={featured.change_pct >= 0 ? "hsl(145, 80%, 42%)" : "hsl(0, 75%, 55%)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }}
                  formatter={(value: number) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), "Price"]}
                  labelFormatter={() => ""}
                />
                <Area type="monotone" dataKey="price" stroke={featured.change_pct >= 0 ? "hsl(145, 80%, 42%)" : "hsl(0, 75%, 55%)"} strokeWidth={2} fill="url(#chartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Compare */}
          {data.quick_compare && data.quick_compare.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Quick Compare</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {data.quick_compare.map((qc) => (
                  <div key={qc.name} className="bg-secondary/50 rounded-lg p-3 border border-border/30">
                    <p className="text-xs font-medium truncate">{qc.name}</p>
                    <p className="font-mono text-sm font-bold">{qc.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-mono ${qc.change_pct >= 0 ? "text-gain" : "text-loss"}`}>
                      {qc.change_pct >= 0 ? "+" : ""}{qc.change_pct.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Most Active Stocks */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Most Active Stocks Worldwide</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Symbol</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Change</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Volume</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Market</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.most_active_stocks.map((stock) => {
                const positive = stock.change_pct >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-3 font-semibold font-mono">{stock.symbol}</td>
                    <td className="py-3 px-3 text-muted-foreground">{stock.name}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium">{stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`py-3 px-3 text-right font-mono ${positive ? "text-gain" : "text-loss"}`}>
                      <span className="inline-flex items-center gap-1">
                        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {positive ? "+" : ""}{stock.change_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground font-mono">{stock.volume}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-secondary text-xs font-mono">{stock.market}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
