import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, TrendingUp, TrendingDown, Minus, Brain, RefreshCw, ChevronDown, ChevronUp, Zap, BarChart3, Activity, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/hooks/usePortfolio";

type Sentiment = "positive" | "negative" | "neutral";

interface NewsItem {
  id: number;
  title: string;
  source: string;
  time: string;
  sentiment: Sentiment;
  impact: "High" | "Medium" | "Low";
  sector: string;
  stocks: string[];
  summary: string;
  ai_analysis: string;
  sentiment_score: number;
  portfolio_exposure: number;
  impact_score: number;
  portfolio_vulnerability: string;
  historical_avg_reaction: string;
  projected_drawdown: string;
}

interface SectorSentiment {
  name: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface DrasticAlert {
  severity: "critical" | "warning";
  headline: string;
  description: string;
  affected_sectors: string[];
  recommended_action: string;
}

interface NewsReport {
  news_items: NewsItem[];
  sector_sentiment: SectorSentiment[];
  market_insight: string;
  market_mood: string;
  nifty_sentiment: string;
  drastic_alerts: DrasticAlert[];
}

const sentimentColors = {
  positive: "hsl(var(--gain))",
  negative: "hsl(var(--loss))",
  neutral: "hsl(var(--muted-foreground))",
};
const sentimentIcons = { positive: TrendingUp, negative: TrendingDown, neutral: Minus };
const moodEmoji: Record<string, string> = { bullish: "🟢", bearish: "🔴", neutral: "🟡", mixed: "🔵" };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const PIE_COLORS = ["hsl(var(--gain))", "hsl(var(--loss))", "hsl(var(--muted-foreground))"];

export default function NewsIntelligence() {
  const [report, setReport] = useState<NewsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Sentiment | "all">("all");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const { data: portfolio } = usePortfolio();

  const portfolioSymbols = portfolio?.holdings.map(h => h.symbol) ?? [];
  const portfolioSectors = [...new Set(portfolio?.holdings.map(h => h.sector).filter(Boolean) ?? [])];

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const fetchNews = async () => {
    setLoading(true);
    setReport(null);
    try {
      if (!GROQ_API_KEY) throw new Error("VITE_GROQ_API_KEY is not set in .env");

      // Rotate through more sectors so each refresh can highlight different ones
      const ALL_SECTORS = ["Technology", "Banking", "Energy", "Pharma", "Auto", "FMCG", "Real Estate", "Metals & Mining"];
      // Pick 5 sectors randomly each refresh for variety
      const shuffled = [...ALL_SECTORS].sort(() => Math.random() - 0.5);
      const sectors = shuffled.slice(0, 5);

      // Current date + a random session token forces the model off its cached "default" stories
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const sessionSeed = Math.floor(Math.random() * 99999); // random seed so prompt is never identical
      const allocations = portfolio?.allocations ?? [];

      // Use JSON mode instead of tool calls — llama-3.1-8b-instant fails Groq's
      // strict per-field schema validation unpredictably. JSON mode lets us define
      // the schema in the prompt and do our own lenient parsing.
      const systemPrompt = `You are a quantitative financial news intelligence AI for the Indian stock market.
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanation.
The JSON must have this exact structure:
{
  "news_items": [
    {
      "id": 1,
      "title": "string",
      "source": "string (e.g. Economic Times, Bloomberg, CNBC-TV18)",
      "time": "YYYY-MM-DD HH:MM:SS",
      "sentiment": "positive" | "negative" | "neutral",
      "sentiment_score": number between -1.0 and 1.0,
      "impact": "High" | "Medium" | "Low",
      "sector": "string",
      "stocks": ["TICKER1"],
      "summary": "2 sentence summary",
      "ai_analysis": "2-3 sentence market impact analysis"
    }
  ],
  "sector_sentiment": [
    { "name": "Technology", "positive": 2, "neutral": 0, "negative": 0 }
  ],
  "market_insight": "2-3 sentence overall insight",
  "market_mood": "bullish" | "bearish" | "neutral" | "mixed",
  "nifty_sentiment": "1-2 sentences on NIFTY 50 outlook",
  "drastic_alerts": []
}`;

      const userPrompt = `[Session #${sessionSeed} | ${dateStr} | ${timeStr} IST]
Generate a FRESH financial news intelligence report for the Indian market as of today.
Featured sectors this session: ${sectors.join(", ")}.

Rules:
- Generate 8 UNIQUE news stories that feel current for ${dateStr}. Do NOT repeat generic placeholder stories.
- Use varied real Indian tickers across the stories (e.g. RELIANCE, TCS, HDFCBANK, INFY, TATAMOTORS, WIPRO, ICICIBANK, AXISBANK, BAJFINANCE, SUNPHARMA, COALINDIA, NTPC)
- Each story MUST have a distinct ai_analysis (2-3 sentences) and a sentiment_score between -1.0 and 1.0
- sector_sentiment MUST cover: ${sectors.join(", ")}
- nifty_sentiment: 1-2 sentences on NIFTY 50 outlook today
- drastic_alerts: include 1-2 if there are major market events, otherwise []
- Mix of positive, negative and neutral stories — do NOT make them all positive
- Return ONLY raw JSON, nothing else`;

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.85,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Groq API error ${resp.status}: ${errText}`);
      }

      const groqData = await resp.json();
      const rawContent = groqData.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error("No content returned from Groq");

      // Strip any accidental markdown fences before parsing
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const report = JSON.parse(cleaned) as NewsReport;

      // Safe defaults for any fields the model may have omitted
      if (!report.news_items || !Array.isArray(report.news_items)) report.news_items = [];
      if (!report.sector_sentiment || !Array.isArray(report.sector_sentiment)) report.sector_sentiment = [];
      if (!report.market_insight) report.market_insight = "Market data is being analyzed.";
      if (!report.market_mood) report.market_mood = "neutral";
      if (!report.nifty_sentiment) report.nifty_sentiment = `NIFTY 50 outlook appears ${report.market_mood} based on current market developments.`;
      if (!report.drastic_alerts || !Array.isArray(report.drastic_alerts)) report.drastic_alerts = [];

      // === Deterministic Backend Math (runs in browser) ===
      report.news_items = report.news_items.map((news) => {
        const sectorAlloc = allocations.find((a: any) => a.sector === news.sector);
        const exposure = sectorAlloc ? (sectorAlloc.pct / 100) : 0;
        const negSentiment = news.sentiment_score < 0 ? Math.abs(news.sentiment_score) : 0;
        const vulnScore = exposure * negSentiment * 1.5;
        let vulnText = "None";
        if (vulnScore > 0) vulnText = "Low";
        if (vulnScore >= 0.05) vulnText = "Medium";
        if (vulnScore >= 0.15) vulnText = "High";
        const impactScore = Math.min(100, Math.round(Math.abs(news.sentiment_score) * 100 * (1 + exposure / 2)));
        const histMoveNum = Number((news.sentiment_score * 2.8).toFixed(1));
        const histMoveStr = histMoveNum > 0 ? `+${histMoveNum}%` : `${histMoveNum}%`;
        const drawdownNum = news.sentiment_score < 0 ? (vulnScore * -8).toFixed(2) : "+0.00";
        const drawdownStr = drawdownNum !== "+0.00" ? `${drawdownNum}%` : "+0.00%";
        return {
          ...news,
          portfolio_exposure: Number(exposure.toFixed(3)),
          impact_score: impactScore,
          portfolio_vulnerability: vulnText,
          historical_avg_reaction: histMoveStr,
          projected_drawdown: drawdownStr,
        };
      });

      setReport(report);
    } catch (e: any) {
      console.error("News fetch error:", e);
      toast({ title: "Error", description: e.message || "Failed to fetch news intelligence", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useState(() => { fetchNews(); });

  // Toast drastic alerts when report loads
  useEffect(() => {
    if (!report?.drastic_alerts?.length) return;
    setDismissedAlerts(new Set());
    report.drastic_alerts.forEach((alert) => {
      toast({
        title: `${alert.severity === "critical" ? "🚨" : "⚠️"} ${alert.headline}`,
        description: alert.description.slice(0, 120) + "…",
        variant: "destructive",
        duration: 8000,
      });
    });
  }, [report]);

  const visibleAlerts = (report?.drastic_alerts ?? []).filter((_, i) => !dismissedAlerts.has(i));

  const filteredNews = report?.news_items.filter((n) => filter === "all" || n.sentiment === filter) ?? [];
  const positiveCount = report?.news_items.filter((n) => n.sentiment === "positive").length ?? 0;
  const negativeCount = report?.news_items.filter((n) => n.sentiment === "negative").length ?? 0;
  const neutralCount = (report?.news_items.length ?? 0) - positiveCount - negativeCount;

  const overallPie = [
    { name: "Positive", value: positiveCount },
    { name: "Negative", value: negativeCount },
    { name: "Neutral", value: neutralCount },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary" />
            News Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            {portfolioSymbols.length > 0
              ? `Personalized news for your ${portfolioSymbols.length} holdings across ${portfolioSectors.length || "multiple"} sectors.`
              : "Upload your portfolio for personalized news. Showing general market intelligence."}
          </p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing…" : "Refresh Intelligence"}
        </button>
      </motion.div>

      {/* Drastic Event Alerts */}
      <AnimatePresence>
        {visibleAlerts.map((alert, idx) => {
          const isCritical = alert.severity === "critical";
          const originalIdx = report!.drastic_alerts.indexOf(alert);
          return (
            <motion.div
              key={`alert-${originalIdx}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-xl border-2 p-4 flex items-start gap-4 ${isCritical
                ? "border-destructive/60 bg-destructive/10"
                : "border-warning/60 bg-warning/10"
                }`}
            >
              <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${isCritical ? "bg-destructive/20" : "bg-warning/20"
                }`}>
                {isCritical
                  ? <ShieldAlert className="w-5 h-5 text-destructive" />
                  : <AlertTriangle className="w-5 h-5 text-warning" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isCritical ? "text-destructive" : "text-warning"
                    }`}>
                    {isCritical ? "🚨 Critical Alert" : "⚠️ Warning"}
                  </span>
                </div>
                <h3 className="font-bold text-sm">{alert.headline}</h3>
                <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {alert.affected_sectors.map((s) => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCritical ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                      }`}>{s}</span>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommended Action:</span> {alert.recommended_action}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissedAlerts(prev => new Set([...prev, originalIdx]))}
                className="shrink-0 p-1 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Loading State */}
      {loading && !report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Report Loaded */}
      {report && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Bullish", count: positiveCount, color: "text-gain", bg: "bg-gain/10", icon: TrendingUp },
              { label: "Bearish", count: negativeCount, color: "text-loss", bg: "bg-loss/10", icon: TrendingDown },
              { label: "Neutral", count: neutralCount, color: "text-muted-foreground", bg: "bg-muted/30", icon: Minus },
              { label: "Market Mood", count: null, color: "text-primary", bg: "bg-primary/10", icon: Activity },
            ].map((s, i) => (
              <motion.div key={s.label} variants={item} className="glass-card p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  {s.count !== null ? (
                    <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
                  ) : (
                    <span className="text-xl">{moodEmoji[report.market_mood] || "🔵"}</span>
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${s.color}`}>{s.count !== null ? s.label : report.market_mood.charAt(0).toUpperCase() + report.market_mood.slice(1)}</p>
                  <p className="text-xs text-muted-foreground">{s.count !== null ? "signals today" : "overall mood"}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Filter Tabs */}
          <motion.div variants={item} className="flex gap-2">
            {(["all", "positive", "negative", "neutral"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* News Feed */}
            <motion.div variants={item} className="lg:col-span-2 space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNews.map((news) => {
                  const SentIcon = sentimentIcons[news.sentiment];
                  const isExpanded = expandedId === news.id;
                  return (
                    <motion.div
                      key={news.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-card-hover p-5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : news.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${news.sentiment === "positive" ? "bg-gain/10" : news.sentiment === "negative" ? "bg-loss/10" : "bg-muted/30"
                          }`}>
                          <SentIcon className={`w-5 h-5 ${news.sentiment === "positive" ? "text-gain" : news.sentiment === "negative" ? "text-loss" : "text-muted-foreground"
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">{news.source}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{news.time}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${news.impact === "High" ? "bg-loss/10 text-loss" : news.impact === "Medium" ? "bg-warning/10 text-warning" : "bg-muted/30 text-muted-foreground"
                              }`}>
                              {news.impact} Impact
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm mb-1">{news.title}</h3>
                          <p className="text-sm text-muted-foreground">{news.summary}</p>

                          {/* Visible Metrics Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 mb-3">
                            <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Exposure</p>
                              <p className="text-sm font-bold text-foreground">
                                {((news.portfolio_exposure || 0) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Impact</p>
                              <p className={`text-lg font-bold ${news.impact_score > 60 ? 'text-loss' : 'text-primary'}`}>
                                {news.impact_score || 0}<span className="text-xs text-muted-foreground font-normal">/100</span>
                              </p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Vulnerability</p>
                              <p className={`text-sm font-bold ${news.portfolio_vulnerability === 'High' ? 'text-loss' : news.portfolio_vulnerability === 'Medium' ? 'text-warning' : 'text-gain'}`}>
                                {news.portfolio_vulnerability || 'None'}
                              </p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hist. Rx</p>
                              <p className={`text-sm font-bold ${news.historical_avg_reaction?.includes('-') ? 'text-loss' : 'text-gain'}`}>
                                {news.historical_avg_reaction || '0%'}
                              </p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-3 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Proj. Drawdown</p>
                              <p className={`text-sm font-bold ${news.projected_drawdown?.includes('-') ? 'text-loss' : 'text-gain'}`}>
                                {news.projected_drawdown || '0%'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            {news.stocks.map((s) => (
                              <span key={s} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{s}</span>
                            ))}
                            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              AI Analysis
                            </span>
                          </div>

                          {/* Expandable AI Analysis */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-border/30">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Brain className="w-5 h-5 text-primary" />
                                    <span className="text-sm font-semibold text-primary">AI Qualitative Rationale</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed bg-background/30 p-4 rounded-xl border border-border/50">
                                    {news.ai_analysis}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredNews.length === 0 && (
                <div className="glass-card p-8 text-center text-muted-foreground">No news matching this filter.</div>
              )}
            </motion.div>

            {/* Right Column */}
            <motion.div variants={item} className="space-y-4">
              {/* Sentiment Distribution */}
              <div className="glass-card p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Overall Sentiment
                </h2>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={overallPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {overallPie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {overallPie.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sector Sentiment Bar Chart */}
              <div className="glass-card p-5">
                <h2 className="text-lg font-semibold mb-4">Sector Sentiment</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.sector_sentiment} layout="vertical">
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }} width={55} />
                      <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                      <Bar dataKey="positive" stackId="a" fill={sentimentColors.positive} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="neutral" stackId="a" fill={sentimentColors.neutral} />
                      <Bar dataKey="negative" stackId="a" fill={sentimentColors.negative} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Market Insight */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">AI Market Insight</h3>
                  <span className="ml-auto text-lg">{moodEmoji[report.market_mood] || "🔵"}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.market_insight}</p>
                {report.nifty_sentiment && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-warning" />
                      <span className="text-xs font-semibold text-warning">NIFTY Outlook</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.nifty_sentiment}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
