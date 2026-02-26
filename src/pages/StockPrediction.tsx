import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Brain, Zap, ChevronDown, Target,
  BarChart3, Activity, Shield, Flame, Trophy, RotateCcw, Loader2,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const stocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: 189.84, sector: "Technology", change: +1.24 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, sector: "Automotive", change: -2.18 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.28, sector: "Semiconductors", change: +4.57 },
  { symbol: "MSFT", name: "Microsoft", price: 415.60, sector: "Technology", change: +0.82 },
  { symbol: "AMZN", name: "Amazon", price: 185.07, sector: "E-Commerce", change: -0.45 },
  { symbol: "GOOGL", name: "Alphabet", price: 141.80, sector: "Technology", change: +1.93 },
  { symbol: "META", name: "Meta Platforms", price: 505.75, sector: "Social Media", change: +3.12 },
];

function generatePriceData(base: number) {
  const data = [];
  let price = base * 0.92;
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.48) * base * 0.02;
    data.push({ day: i + 1, price: Math.round(price * 100) / 100 });
  }
  return data;
}

interface KeyFactor {
  factor: string;
  signal: "bullish" | "bearish" | "neutral";
  detail: string;
}

interface AIAnalysis {
  ai_direction: "up" | "down";
  confidence: number;
  short_reasoning: string;
  detailed_analysis: string;
  key_factors: KeyFactor[];
  actual_result: "up" | "down";
  outcome_explanation: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const resultReveal = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { type: "spring" as const, damping: 20 } } };

const SignalBadge = ({ signal }: { signal: string }) => {
  const cls = signal === "bullish"
    ? "bg-gain/15 text-gain border-gain/30"
    : signal === "bearish"
    ? "bg-loss/15 text-loss border-loss/30"
    : "bg-warning/15 text-warning border-warning/30";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls} uppercase tracking-wider`}>
      {signal}
    </span>
  );
};

export default function StockPrediction() {
  const { user } = useAuth();
  const [selectedStock, setSelectedStock] = useState(stocks[0]);
  const [prediction, setPrediction] = useState<"up" | "down" | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "reveal">("idle");
  const [streak, setStreak] = useState(0);

  const priceData = useMemo(() => generatePriceData(selectedStock.price), [selectedStock.symbol]);
  const lastPrice = priceData[priceData.length - 1].price;
  const minPrice = Math.min(...priceData.map(d => d.price));
  const maxPrice = Math.max(...priceData.map(d => d.price));

  const handlePredict = useCallback(async (dir: "up" | "down") => {
    setPrediction(dir);
    setPhase("analyzing");
    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("stock-predict", {
        body: {
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          sector: selectedStock.sector,
          price: selectedStock.price,
          userPrediction: dir,
          priceHistory: priceData.slice(-10),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data as AIAnalysis;
      setAnalysis(result);

      // Small delay for dramatic reveal
      await new Promise(r => setTimeout(r, 800));
      setPhase("reveal");

      const userCorrect = dir === result.actual_result;
      const aiCorrect = result.ai_direction === result.actual_result;

      if (userCorrect) {
        setStreak(prev => prev + 1);
        toast.success(`🎉 Correct! +50 XP earned!`);
      } else {
        setStreak(0);
        toast.info(`Not this time — +10 XP for trying!`);
      }

      // Save to DB
      if (user) {
        await supabase.from("predictions").insert({
          user_id: user.id,
          stock_symbol: selectedStock.symbol,
          predicted_direction: dir,
          ai_prediction: result.ai_direction,
          actual_result: result.actual_result,
          user_correct: userCorrect,
          ai_correct: aiCorrect,
          confidence: result.confidence,
          ai_explanation: result.outcome_explanation,
        });
      }
    } catch (e: any) {
      console.error("Prediction error:", e);
      toast.error(e.message || "Failed to get AI analysis");
      setPhase("idle");
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStock, priceData, user]);

  const handleReset = () => {
    setPrediction(null);
    setAnalysis(null);
    setPhase("idle");
  };

  const handleStockChange = (s: typeof stocks[0]) => {
    setSelectedStock(s);
    setShowSelector(false);
    handleReset();
  };

  const userCorrect = prediction && analysis ? prediction === analysis.actual_result : null;
  const aiCorrect = analysis ? analysis.ai_direction === analysis.actual_result : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Prediction Arena</h1>
          </div>
          <p className="text-muted-foreground ml-14">Predict stock movements, challenge the AI, learn from outcomes.</p>
        </div>
        {streak > 0 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30"
          >
            <Flame className="w-4 h-4 text-warning" />
            <span className="font-semibold text-warning">{streak} streak</span>
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Chart & Controls */}
        <motion.div variants={item} className="xl:col-span-2 space-y-4">
          {/* Stock Selector */}
          <div className="glass-card p-4 relative z-50">
            <div className="relative">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                    {selectedStock.symbol.slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{selectedStock.symbol} <span className="text-muted-foreground font-normal text-sm">· {selectedStock.sector}</span></div>
                    <div className="text-sm text-muted-foreground">{selectedStock.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">${selectedStock.price.toFixed(2)}</div>
                    <div className={`text-sm font-mono ${selectedStock.change >= 0 ? "text-gain" : "text-loss"}`}>
                      {selectedStock.change >= 0 ? "+" : ""}{selectedStock.change.toFixed(2)}%
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSelector ? "rotate-180" : ""}`} />
                </div>
              </button>

              {showSelector && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowSelector(false)} />
                  <div className="absolute left-0 right-0 z-[70] mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-auto max-h-80">
                    {stocks.map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => handleStockChange(s)}
                        className={`flex items-center justify-between w-full px-4 py-3 hover:bg-secondary/50 transition-colors ${s.symbol === selectedStock.symbol ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold">{s.symbol.slice(0, 2)}</div>
                          <div className="text-left">
                            <span className="font-semibold text-sm">{s.symbol}</span>
                            <span className="text-muted-foreground text-xs ml-2">{s.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm">${s.price.toFixed(2)}</span>
                          <span className={`text-xs ml-2 ${s.change >= 0 ? "text-gain" : "text-loss"}`}>
                            {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>30-Day Price Action</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Last:</span>
                <span className="font-mono text-sm font-semibold">${lastPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 40%)", fontSize: 10 }} />
                  <YAxis domain={[minPrice * 0.998, maxPrice * 1.002]} axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 40%)", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 20%)", borderRadius: 12, color: "hsl(210, 20%, 95%)", fontSize: 13 }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                    labelFormatter={(day) => `Day ${day}`}
                  />
                  <ReferenceLine y={lastPrice} stroke="hsl(220, 10%, 25%)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="price" stroke="hsl(210, 100%, 55%)" strokeWidth={2.5} fill="url(#priceGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prediction Buttons */}
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="buttons"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 gap-4"
              >
                <button
                  onClick={() => handlePredict("up")}
                  className="group relative flex flex-col items-center gap-2 py-6 rounded-xl bg-gain/5 border-2 border-gain/20 text-gain font-semibold text-lg hover:bg-gain/10 hover:border-gain/40 hover:shadow-lg hover:shadow-gain/10 transition-all active:scale-[0.98]"
                >
                  <TrendingUp className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span>Predict UP</span>
                  <ArrowUpRight className="w-4 h-4 absolute top-3 right-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
                <button
                  onClick={() => handlePredict("down")}
                  className="group relative flex flex-col items-center gap-2 py-6 rounded-xl bg-loss/5 border-2 border-loss/20 text-loss font-semibold text-lg hover:bg-loss/10 hover:border-loss/40 hover:shadow-lg hover:shadow-loss/10 transition-all active:scale-[0.98]"
                >
                  <TrendingDown className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span>Predict DOWN</span>
                  <ArrowDownRight className="w-4 h-4 absolute top-3 right-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              </motion.div>
            )}

            {phase === "analyzing" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass-card p-8 flex flex-col items-center gap-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Brain className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">AI Analyzing {selectedStock.symbol}...</p>
                  <p className="text-sm text-muted-foreground mt-1">Evaluating technical indicators, sector trends, and momentum signals</p>
                </div>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> RSI</span>
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> MACD</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Volume</span>
                </div>
              </motion.div>
            )}

            {phase === "reveal" && analysis && (
              <motion.div key="result" variants={resultReveal} initial="hidden" animate="show">
                {/* Outcome Banner */}
                <div className={`rounded-xl p-5 border-2 ${userCorrect ? "bg-gain/5 border-gain/30" : "bg-loss/5 border-loss/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {userCorrect ? (
                        <CheckCircle2 className="w-8 h-8 text-gain" />
                      ) : (
                        <XCircle className="w-8 h-8 text-loss" />
                      )}
                      <div>
                        <p className={`text-xl font-bold ${userCorrect ? "text-gain" : "text-loss"}`}>
                          {userCorrect ? "You nailed it!" : "Not this time"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedStock.symbol} moved <span className={`font-semibold ${analysis.actual_result === "up" ? "text-gain" : "text-loss"}`}>{analysis.actual_result.toUpperCase()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-primary font-bold">{userCorrect ? "+50" : "+10"} XP</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Sidebar */}
        <motion.div variants={item} className="space-y-4">
          {/* Scoreboard */}
          {phase === "reveal" && analysis && prediction && (
            <motion.div variants={resultReveal} initial="hidden" animate="show" className="glass-card p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-warning" /> Scoreboard</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-muted-foreground text-xs mb-1">You</p>
                  <p className={`font-bold ${prediction === "up" ? "text-gain" : "text-loss"}`}>
                    {prediction === "up" ? "↑ UP" : "↓ DOWN"}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${userCorrect ? "text-gain" : "text-loss"}`}>
                    {userCorrect ? "✓ Correct" : "✗ Wrong"}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-muted-foreground text-xs mb-1">AI</p>
                  <p className={`font-bold ${analysis.ai_direction === "up" ? "text-gain" : "text-loss"}`}>
                    {analysis.ai_direction === "up" ? "↑ UP" : "↓ DOWN"}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${aiCorrect ? "text-gain" : "text-loss"}`}>
                    {aiCorrect ? "✓ Correct" : "✗ Wrong"}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <p className="text-muted-foreground text-xs mb-1">Actual</p>
                  <p className={`font-bold ${analysis.actual_result === "up" ? "text-gain" : "text-loss"}`}>
                    {analysis.actual_result === "up" ? "↑ UP" : "↓ DOWN"}
                  </p>
                  <p className="text-xs mt-1 font-mono text-primary">{analysis.confidence.toFixed(0)}% conf</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Analysis Card */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AI Analysis</h3>
            </div>

            {phase === "idle" && (
              <p className="text-sm text-muted-foreground">Select a stock and make your prediction to see AI analysis.</p>
            )}

            {phase === "analyzing" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Running quantitative analysis...</span>
              </div>
            )}

            {phase === "reveal" && analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-muted-foreground italic">"{analysis.short_reasoning}"</p>

                {/* Key Factors */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Signals</p>
                  {analysis.key_factors?.map((kf, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                    >
                      <div>
                        <span className="text-sm font-medium">{kf.factor}</span>
                        <p className="text-xs text-muted-foreground">{kf.detail}</p>
                      </div>
                      <SignalBadge signal={kf.signal} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Outcome Explanation */}
          {phase === "reveal" && analysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-card p-5"
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Why {selectedStock.symbol} moved {analysis.actual_result.toUpperCase()}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.outcome_explanation}</p>
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.detailed_analysis}</p>
              </div>
            </motion.div>
          )}

          {/* Play Again */}
          {phase === "reveal" && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Make Another Prediction
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
