import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, ComposedChart, CartesianGrid, Legend,
    ReferenceLine, Area, AreaChart,
} from "recharts";
import {
    BarChart2, Zap, Brain, TrendingUp, AlertTriangle,
    Activity, RefreshCw, ChevronDown, CheckCircle2, Info,
    GitCompare, ArrowLeftRight, Search, Trophy, Layers, Target, Coins
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Constants ─────────────────────────────────────────────────────────
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const ALLOWED_CHARTS = [
    "Line Chart",
    "Candlestick Chart",
    "Candlestick + Volume",
    "Moving Average Overlay",
    "RSI Indicator Chart",
    "Volatility (ATR or Std Dev) Chart",
];

const HORIZONS = ["1W", "1M", "3M", "6M", "1Y"];

// ─── Data Processor ─────────────────────────────────────────────────────
function processHistory(rawArray: any[], daysLimit: number) {
    if (!rawArray || !rawArray.length) return [];
    const valid = rawArray.filter((d: any) => d.close != null).slice(-daysLimit);
    return valid.map((d: any, i: number) => ({
        day: i + 1,
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: Number(d.close?.toFixed(2)) || 0,
        open: Number(d.open?.toFixed(2)) || 0,
        close: Number(d.close?.toFixed(2)) || 0,
        high: Number(d.high?.toFixed(2)) || 0,
        low: Number(d.low?.toFixed(2)) || 0,
        volume: d.volume || 0,
    }));
}

// ─── Metrics ────────────────────────────────────────────────────────────
function computeMetrics(history: any[], quote: any) {
    if (!history || !history.length) return null;
    const prices = history.map((d) => d.price);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const stdDev = returns.length ? Math.sqrt(returns.reduce((a, r) => a + r * r, 0) / returns.length) * Math.sqrt(252) : 0;
    const volatility: "Low" | "Medium" | "High" = stdDev > 0.4 ? "High" : stdDev > 0.2 ? "Medium" : "Low";

    const ma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length) || prices[prices.length - 1];
    const ma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length) || prices[prices.length - 1];

    const trend: "Strong Uptrend" | "Uptrend" | "Sideways" | "Downtrend" | "Strong Downtrend" =
        prices[prices.length - 1] > ma20 * 1.03 && ma20 > ma50 * 1.01 ? "Strong Uptrend" :
            prices[prices.length - 1] > ma20 ? "Uptrend" :
                prices[prices.length - 1] < ma20 * 0.97 && ma20 < ma50 * 0.99 ? "Strong Downtrend" :
                    prices[prices.length - 1] < ma20 ? "Downtrend" : "Sideways";

    const avgVolume = history.reduce((a, d) => a + d.volume, 0) / history.length;
    const liquidity: "High" | "Medium" | "Low" = avgVolume > 5000000 ? "High" : avgVolume > 1000000 ? "Medium" : "Low";

    let gains = 0, losses = 0;
    returns.slice(-14).forEach((r) => { if (r > 0) gains += r; else losses += Math.abs(r); });
    const rsi = Number((100 - 100 / (1 + gains / (losses || 0.001))).toFixed(1));
    const totalReturn = Number((((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(2));
    const maxPrice = Math.max(...prices), minPrice = Math.min(...prices);
    const maxDrawdown = Number((((maxPrice - minPrice) / maxPrice) * 100).toFixed(2));

    let currencySym = "$";
    if (quote?.currency === "INR") currencySym = "₹";
    else if (quote?.currency === "EUR") currencySym = "€";
    else if (quote?.currency === "GBP") currencySym = "£";

    const currentPriceStr = `${currencySym}${(quote?.regularMarketPrice || prices[prices.length - 1] || 0).toFixed(2)}`;

    const formatValue = (num: number) => {
        if (!num) return "N/A";
        if (num >= 1e12) return `${currencySym}${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `${currencySym}${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${currencySym}${(num / 1e6).toFixed(2)}M`;
        return `${currencySym}${num.toLocaleString()}`;
    };

    const marketCap = formatValue(quote?.marketCap);
    const peRatio = quote?.trailingPE ? quote.trailingPE.toFixed(2) : quote?.forwardPE ? quote.forwardPE.toFixed(2) : "N/A";
    const highLow = `${currencySym}${(quote?.fiftyTwoWeekHigh || maxPrice).toFixed(2)} / ${currencySym}${(quote?.fiftyTwoWeekLow || minPrice).toFixed(2)}`;

    const withMA = history.map((d, i) => ({
        ...d,
        ma20: i >= 19 ? Number((prices.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20).toFixed(2)) : null,
        ma50: i >= 49 ? Number((prices.slice(i - 49, i + 1).reduce((a, b) => a + b, 0) / 50).toFixed(2)) : null,
    }));

    const rsiSeries = history.map((d, i) => {
        if (i < 14) return { ...d, rsi: null };
        let g = 0, l = 0;
        returns.slice(i - 14, i).forEach((r) => { if (r > 0) g += r; else l += Math.abs(r); });
        return { ...d, rsi: Number((100 - 100 / (1 + g / (l || 0.001))).toFixed(1)) };
    });

    const volSeries = history.map((d) => ({ ...d, atr: d.price ? Number((((d.high - d.low) / d.price) * 100).toFixed(2)) : 0 }));

    return { volatility, trend, liquidity, stdDev, rsi, totalReturn, maxDrawdown, currentPriceStr, marketCap, peRatio, highLow, withMA, rsiSeries, volSeries };
}

// ─── Rule Override ──────────────────────────────────────────────────────
function applyRuleOverrides(baseCharts: string[], assetType: string, volatility: string, intent: string): string[] {
    let charts = [...baseCharts];
    if (volatility === "High" && !charts.some((c) => c.toLowerCase().includes("candlestick"))) charts.unshift("Candlestick + Volume");
    if (intent === "Prediction" && !charts.some((c) => c.toLowerCase().includes("rsi") || c.toLowerCase().includes("moving"))) charts.push("RSI Indicator Chart");
    if (assetType === "Index") { charts = charts.filter((c) => !c.toLowerCase().includes("candlestick")); if (!charts.includes("Line Chart")) charts.unshift("Line Chart"); }
    return [...new Set(charts)].filter((c) => ALLOWED_CHARTS.includes(c));
}

// ─── Parse LLM Response ─────────────────────────────────────────────────
function parseChartBlocks(raw: string) {
    const blocks: { chartType: string; purpose: string; keyInsight: string; beginnerInterpretation: string }[] = [];
    for (const section of raw.split(/CHART RECOMMENDATION:/gi).filter(Boolean)) {
        // Stop parsing if we reach the VERDICT block
        if (section.toUpperCase().includes("BUY VERDICT:")) break;

        const get = (key: string) => { const m = section.match(new RegExp(`-?\\s*${key}:\\s*(.+)`, "i")); return m ? m[1].trim() : ""; };
        const chartType = get("Chart Type");
        if (!chartType) continue;
        blocks.push({ chartType, purpose: get("Purpose"), keyInsight: get("Key Insight"), beginnerInterpretation: get("Beginner Interpretation") });
    }
    return blocks;
}

function parseVerdict(raw: string) {
    const verdictSection = raw.split(/BUY VERDICT:/gi)[1];
    if (!verdictSection) return null;

    const get = (key: string) => { const m = verdictSection.match(new RegExp(`-?\\s*${key}:\\s*(.+)`, "i")); return m ? m[1].trim() : ""; };
    const winner = get("Winner");
    const rationale = get("Rationale");
    return winner ? { winner, rationale } : null;
}

// ─── Chart Renderer ─────────────────────────────────────────────────────
function ChartRenderer({ chartType, history, withMA, rsiSeries, volSeries, compareHistory, compareSymbol, symbol }: any) {
    const key = chartType.toLowerCase();
    const tooltipStyle = { background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 };

    // Indexed comparison overlay (normalize both to 100)
    const comparisonData = compareHistory ? history.map((d: any, i: number) => ({
        date: d.date,
        [symbol]: Number(((d.price / history[0].price) * 100).toFixed(2)),
        [compareSymbol]: compareHistory[i] ? Number(((compareHistory[i].price / compareHistory[0].price) * 100).toFixed(2)) : null,
    })) : null;

    if (key.includes("line")) {
        if (comparisonData) {
            return (
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(comparisonData.length / 5)} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={50} tickFormatter={(v) => v + ""} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v.toFixed(2), "Indexed (Base 100)"]} />
                        <ReferenceLine y={100} stroke="hsl(var(--border))" strokeDasharray="4 2" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey={symbol} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey={compareSymbol} stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }
        return (
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                    <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(history.length / 5)} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} width={55} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#pg)" strokeWidth={2} dot={false} name="Price" />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    if (key.includes("moving average")) {
        if (comparisonData) {
            return (
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(comparisonData.length / 5)} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} width={50} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <ReferenceLine y={100} stroke="hsl(var(--border))" strokeDasharray="4 2" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey={symbol} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey={compareSymbol} stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }
        return (
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={withMA}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(withMA.length / 5)} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} width={55} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="Price" />
                    <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="MA 20" connectNulls />
                    <Line type="monotone" dataKey="ma50" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="MA 50" connectNulls />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (key.includes("candlestick") || key.includes("volume")) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={history.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={5} />
                    <YAxis yAxisId="price" tick={{ fontSize: 10 }} tickLine={false} width={55} />
                    <YAxis yAxisId="vol" orientation="right" tick={{ fontSize: 9 }} tickLine={false} width={48} tickFormatter={(v) => (v / 1000).toFixed(0) + "K"} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar yAxisId="price" dataKey="high" fill="hsl(var(--gain))" opacity={0.7} name="High" barSize={4} />
                    <Bar yAxisId="price" dataKey="low" fill="hsl(var(--loss))" opacity={0.7} name="Low" barSize={4} />
                    <Bar yAxisId="vol" dataKey="volume" fill="hsl(var(--primary))" opacity={0.25} name="Volume" barSize={8} />
                    <Line yAxisId="price" type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="Close" />
                </ComposedChart>
            </ResponsiveContainer>
        );
    }

    if (key.includes("rsi")) {
        const rsiCompare = compareHistory ? rsiSeries.map((d: any, i: number) => {
            if (!compareHistory[i]) return d;
            const cReturns = compareHistory.slice(1).map((p: any, j: number) => (p.price - compareHistory[j].price) / compareHistory[j].price);
            if (i < 14) return { ...d, [`rsi_${compareSymbol}`]: null };
            let g = 0, l = 0;
            cReturns.slice(i - 14, i).forEach((r: number) => { if (r > 0) g += r; else l += Math.abs(r); });
            return { ...d, [`rsi_${compareSymbol}`]: Number((100 - 100 / (1 + g / (l || 0.001))).toFixed(1)) };
        }) : rsiSeries;

        return (
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rsiCompare.filter((d: any) => d.rsi !== null)}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(rsiSeries.length / 5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine y={70} stroke="hsl(var(--loss))" strokeDasharray="4 2" label={{ value: "Overbought", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--loss))" }} />
                    <ReferenceLine y={30} stroke="hsl(var(--gain))" strokeDasharray="4 2" label={{ value: "Oversold", position: "insideBottomRight", fontSize: 9, fill: "hsl(var(--gain))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="rsi" stroke="#a78bfa" strokeWidth={2} dot={false} name={`RSI ${symbol}`} connectNulls />
                    {compareHistory && <Line type="monotone" dataKey={`rsi_${compareSymbol}`} stroke="#f59e0b" strokeWidth={2} dot={false} name={`RSI ${compareSymbol}`} connectNulls />}
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (key.includes("volatility") || key.includes("atr")) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={volSeries}>
                    <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(volSeries.length / 5)} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} width={40} tickFormatter={(v) => v + "%"} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v + "%", "ATR %"]} />
                    <Area type="monotone" dataKey="atr" stroke="#f59e0b" fill="url(#vg)" strokeWidth={2} dot={false} name="ATR %" />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    return <div className="text-muted-foreground text-sm text-center py-10">Chart type: {chartType}</div>;
}

// ─── Metric Badge ───────────────────────────────────────────────────────
function MetricCard({ label, value, color, isBadge, icon: Icon }: any) {
    return (
        <div className="glass-card p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {isBadge
                    ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${color}`}>{value}</span>
                    : <p className={`text-sm font-bold truncate ${color}`}>{value}</p>}
            </div>
        </div>
    );
}

// ─── Stock Input ────────────────────────────────────────────────────────
function StockInput({ value, onChange, label }: { value: string; onChange: (s: string) => void; label: string }) {
    return (
        <div className="space-y-1.5 flex-1 relative">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL, RELIANCE"
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
        </div>
    );
}

// ─── Comparison Metrics Table ───────────────────────────────────────────
function CompareTable({ sym1, sym2, m1, m2 }: { sym1: string; sym2: string; m1: ReturnType<typeof computeMetrics>; m2: ReturnType<typeof computeMetrics> }) {
    const rows = [
        { label: "Current Price", v1: m1.currentPriceStr, v2: m2.currentPriceStr },
        { label: "Market Cap", v1: m1.marketCap, v2: m2.marketCap },
        { label: "P/E Ratio", v1: m1.peRatio, v2: m2.peRatio },
        { label: "High / Low", v1: m1.highLow, v2: m2.highLow },
        { label: "Trend", v1: m1.trend, v2: m2.trend },
        { label: "Volatility", v1: m1.volatility, v2: m2.volatility },
        { label: "Liquidity", v1: m1.liquidity, v2: m2.liquidity },
        { label: "RSI (14)", v1: m1.rsi.toFixed(1), v2: m2.rsi.toFixed(1) },
        { label: "Total Return", v1: (m1.totalReturn > 0 ? "+" : "") + m1.totalReturn + "%", v2: (m2.totalReturn > 0 ? "+" : "") + m2.totalReturn + "%" },
        { label: "Max Drawdown", v1: m1.maxDrawdown + "%", v2: m2.maxDrawdown + "%" },
    ];
    const retColor = (v: string) => v.startsWith("+") ? "text-emerald-400" : v.startsWith("-") ? "text-red-400" : "text-foreground";
    return (
        <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-border/50 bg-primary/5">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Head-to-Head Comparison</h3>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-3 gap-0 text-xs rounded-lg overflow-hidden border border-border/50">
                    <div className="bg-secondary/50 p-2.5 font-semibold text-muted-foreground text-center border-r border-b border-border/50">Metric</div>
                    <div className="bg-primary/10 p-2.5 font-bold text-primary text-center border-r border-b border-border/50">{sym1}</div>
                    <div className="bg-amber-500/10 p-2.5 font-bold text-amber-400 text-center border-b border-border/50">{sym2}</div>
                    {rows.map((row, i) => (
                        <div key={row.label} className="contents">
                            <div className={`p-2.5 text-muted-foreground border-r border-border/50 ${i < rows.length - 1 ? "border-b" : ""}`}>{row.label}</div>
                            <div className={`p-2.5 font-medium text-center border-r border-border/50 ${i < rows.length - 1 ? "border-b" : ""} ${row.label === "Total Return" ? retColor(row.v1) : "text-foreground"}`}>{row.v1}</div>
                            <div className={`p-2.5 font-medium text-center ${i < rows.length - 1 ? "border-b border-border/50" : ""} ${row.label === "Total Return" ? retColor(row.v2) : "text-foreground"}`}>{row.v2}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Groq AI Call ───────────────────────────────────────────────────────
async function fetchChartRecommendation(input: any, GROQ_API_KEY: string): Promise<{ charts: string[]; blocks: ReturnType<typeof parseChartBlocks>; verdict: ReturnType<typeof parseVerdict> }> {
    const isComparing = !!input.comparison_symbol;

    const systemPrompt = `You are a quantitative market visualization expert and trading analyst.
Your task is to decide the most appropriate financial chart(s) to display based on the asset profile.
Do NOT generate code. Do NOT generate trading advice.
Only use chart types from: ${ALLOWED_CHARTS.join(", ")}.

For each chart, use EXACTLY this format:
CHART RECOMMENDATION:
- Chart Type: [exact chart name from allowed list]
- Purpose: [one sentence]
- Key Insight: [one sentence]
- Beginner Interpretation: [one simple sentence]

${isComparing ? `Since the user is comparing two stocks, you MUST include a "BUY VERDICT" at the very end of your response to determine which stock is the better buy based on the provided metrics.
Use EXACTLY this format at the end:

BUY VERDICT:
- Winner: [Symbol of the better stock]
- Rationale: [3-4 sentences explaining why it is a better buy, referencing the trend, return, and drawdown metrics.]` : ""}`;

    const userPrompt = `Based on this asset profile, recommend 2-3 charts:\n${JSON.stringify(input, null, 2)}`;

    let attempt = 0;
    while (attempt < 2) {
        attempt++;
        const resp = await fetch(GROQ_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.2 }),
        });
        if (!resp.ok) { const t = await resp.text(); throw new Error(`Groq error ${resp.status}: ${t.slice(0, 200)}`); }
        const groqData = await resp.json();
        const content = groqData.choices?.[0]?.message?.content ?? "";

        const blocks = parseChartBlocks(content);
        const verdict = isComparing ? parseVerdict(content) : null;

        const charts = blocks.map((b) => b.chartType);
        const allValid = charts.every((c) => ALLOWED_CHARTS.some((a) => a.toLowerCase() === c.toLowerCase()));
        if (!allValid && attempt < 2) continue;

        const normalized = charts.map((c) => ALLOWED_CHARTS.find((a) => a.toLowerCase() === c.toLowerCase()) ?? c);
        return {
            charts: normalized,
            blocks: normalized.map((c) => blocks.find((b) => ALLOWED_CHARTS.find((a) => a.toLowerCase() === b.chartType.toLowerCase()) === c) ?? { chartType: c, purpose: "", keyInsight: "", beginnerInterpretation: "" }),
            verdict
        };
    }
    return { charts: [], blocks: [], verdict: null };
}

// ─── Main Component ──────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function StockAnalysis() {
    const [sym1, setSym1] = useState("AAPL");
    const [sym2, setSym2] = useState("MSFT");
    const [compareMode, setCompareMode] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState("1M");
    const [userIntent, setUserIntent] = useState<"Overview" | "Prediction" | "Risk">("Overview");
    const [assetType, setAssetType] = useState<"Stock" | "Index" | "ETF">("Stock");

    const [history1, setHistory1] = useState<any[]>([]);
    const [history2, setHistory2] = useState<any[]>([]);
    const [metrics1, setMetrics1] = useState<any>(null);
    const [metrics2, setMetrics2] = useState<any>(null);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ charts: string[]; blocks: ReturnType<typeof parseChartBlocks>; verdict: ReturnType<typeof parseVerdict> } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 252 }[timeHorizon] ?? 30;

    const validSym1 = sym1.trim() || "AAPL";
    const validSym2 = sym2.trim() || "MSFT";

    const analyze = async () => {
        const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
        if (!GROQ_API_KEY) { setError("VITE_GROQ_API_KEY not set in .env"); return; }
        if (!sym1.trim() || (compareMode && !sym2.trim())) { setError("Please enter valid stock symbols."); return; }

        setLoading(true); setResult(null); setError(null);
        setMetrics1(null); setMetrics2(null);
        setHistory1([]); setHistory2([]);

        try {
            const resolveSymbol = async (sym: string) => {
                try {
                    const { data } = await supabase.functions.invoke('stock-data', {
                        body: { query: sym }
                    });
                    if (data && data.length > 0 && data[0].symbol) {
                        return data[0].symbol;
                    }
                } catch (err) { }
                return sym;
            };

            const fetchStock = async (sym: string) => {
                const resolvedSym = await resolveSymbol(sym);

                const { data, error } = await supabase.functions.invoke('stock-data', {
                    body: { symbol: resolvedSym, days: 400 }
                });

                if (error || !data) {
                    console.error("Invoke Error:", error);
                    throw new Error(`Edge Function Failed: ${error?.message || "Unknown error"}`);
                }

                if (data.error) {
                    throw new Error(`Stock API Error (${resolvedSym}): ${data.error}`);
                }

                return { ...data, resolvedSym };
            }

            const data1 = await fetchStock(validSym1);
            if (!data1.history || !data1.history.length) throw new Error(`No historical data found for ${data1.resolvedSym}.`);
            setSym1(data1.resolvedSym);

            let data2 = null;
            if (compareMode) {
                data2 = await fetchStock(validSym2);
                if (!data2.history || !data2.history.length) throw new Error(`No historical data found for ${data2.resolvedSym}.`);
                setSym2(data2.resolvedSym);
            }

            const h1 = processHistory(data1.history, days);
            const m1 = computeMetrics(h1, data1.quote);
            if (!m1) throw new Error(`Not enough data to compute metrics for ${data1.resolvedSym}.`);
            setHistory1(h1);
            setMetrics1(m1);

            let m2 = null, h2: any[] = [];
            if (compareMode && data2) {
                h2 = processHistory(data2.history, days);
                m2 = computeMetrics(h2, data2.quote);
                setHistory2(h2);
                setMetrics2(m2);
            }

            const input: any = {
                asset_type: assetType,
                asset_symbol: data1.resolvedSym,
                time_horizon: timeHorizon,
                current_price: m1.currentPriceStr,
                market_cap: m1.marketCap,
                pe_ratio: m1.peRatio,
                volatility_level: m1.volatility,
                trend_strength: m1.trend,
                liquidity: m1.liquidity,
                user_intent: userIntent,
                total_return: m1.totalReturn + "%",
                max_drawdown: m1.maxDrawdown + "%"
            };
            if (compareMode && m2 && data2) {
                input.comparison_symbol = data2.resolvedSym;
                input.comparison_price = m2.currentPriceStr;
                input.comparison_market_cap = m2.marketCap;
                input.comparison_pe_ratio = m2.peRatio;
                input.comparison_volatility = m2.volatility;
                input.comparison_trend = m2.trend;
                input.comparison_total_return = m2.totalReturn + "%";
                input.comparison_max_drawdown = m2.maxDrawdown + "%";
            }

            const raw = await fetchChartRecommendation(input, GROQ_API_KEY);
            const finalCharts = applyRuleOverrides(raw.charts, assetType, m1.volatility, userIntent);
            const finalBlocks = finalCharts.map((c) => raw.blocks.find((b) => b.chartType === c) ?? { chartType: c, purpose: "", keyInsight: "", beginnerInterpretation: "" });

            setResult({ charts: finalCharts, blocks: finalBlocks, verdict: raw.verdict });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Badge helpers
    const trendBadge = (trend: string) => ({
        "Strong Uptrend": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        "Uptrend": "text-green-400 bg-green-400/10 border-green-400/20",
        "Sideways": "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
        "Downtrend": "text-orange-400 bg-orange-400/10 border-orange-400/20",
        "Strong Downtrend": "text-red-400 bg-red-400/10 border-red-400/20",
    }[trend] ?? "text-muted-foreground bg-muted border-border");

    const volColor = (v: string) => ({ High: "text-red-400", Medium: "text-yellow-400", Low: "text-emerald-400" }[v] ?? "");
    const rsiColor = (r: number) => r > 70 ? "text-red-400" : r < 30 ? "text-emerald-400" : "text-yellow-400";

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Header */}
            <motion.div variants={itemAnim}>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <BarChart2 className="w-8 h-8 text-primary" /> Smart Stock Analysis
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">Groq-powered chart recommendation engine · Search any stock & get an AI verdict</p>
            </motion.div>

            {/* Controls Panel */}
            <motion.div variants={itemAnim} className="glass-card p-5 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    {/* Stock 1 */}
                    <StockInput value={sym1} onChange={(v) => { setSym1(v); setResult(null); setMetrics1(null); }} label={compareMode ? "Stock A" : "Search Symbol"} />

                    {/* Toggle Compare */}
                    <div className="flex flex-col gap-1.5 shrink-0 self-center md:self-end pb-1.5 md:pb-0">
                        <button
                            onClick={() => { setCompareMode(!compareMode); setResult(null); setMetrics1(null); setMetrics2(null); }}
                            className={`flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg border font-semibold transition-all ${compareMode ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"}`}
                        >
                            <GitCompare className="w-4 h-4" />
                            {compareMode ? "Compare ON" : "Enable Compare"}
                        </button>
                    </div>

                    {/* Stock 2 */}
                    {compareMode && (
                        <StockInput value={sym2} onChange={(v) => { setSym2(v); setResult(null); setMetrics2(null); }} label="Stock B" />
                    )}
                </div>

                {/* Horizon + Intent + Type + Analyze */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Horizon</label>
                        <div className="flex gap-1">
                            {HORIZONS.map((h) => (
                                <button key={h} onClick={() => { setTimeHorizon(h); setResult(null); setMetrics1(null); setMetrics2(null); }}
                                    className={`flex-1 text-xs py-2 rounded-md border transition-colors ${timeHorizon === h ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Intent</label>
                        <div className="flex gap-1">
                            {(["Overview", "Prediction", "Risk"] as const).map((i) => (
                                <button key={i} onClick={() => { setUserIntent(i); setResult(null); }}
                                    className={`flex-1 text-xs px-1 py-2 rounded-md border transition-colors ${userIntent === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Asset Type</label>
                        <div className="flex gap-1">
                            {(["Stock", "Index", "ETF"] as const).map((t) => (
                                <button key={t} onClick={() => { setAssetType(t); setResult(null); }}
                                    className={`flex-1 text-xs py-2 rounded-md border transition-colors ${assetType === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col justify-end">
                        <button onClick={analyze} disabled={loading || !sym1.trim() || (compareMode && !sym2.trim())}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            {loading ? "Analyzing…" : compareMode ? `Compare ${validSym1} vs ${validSym2}` : `Analyze ${validSym1}`}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Metrics Panels */}
            {metrics1 && (
                <motion.div variants={itemAnim} className={`grid gap-4 ${compareMode ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                    {/* Stock 1 Metrics */}
                    <div className="space-y-2">
                        {compareMode && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary px-1">
                                <div className="w-3 h-3 rounded-full bg-primary" /> {validSym1}
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <MetricCard label="Current Price" value={metrics1.currentPriceStr} color="text-foreground" icon={Coins} />
                            <MetricCard label="Market Cap" value={metrics1.marketCap} color="text-foreground" icon={Layers} />
                            <MetricCard label="P/E Ratio" value={metrics1.peRatio} color="text-foreground" icon={Target} />
                            <MetricCard label="High / Low" value={metrics1.highLow} color="text-muted-foreground" icon={ArrowLeftRight} />
                            <MetricCard label="Volatility" value={metrics1.volatility} color={volColor(metrics1.volatility)} icon={Activity} />
                            <MetricCard label="Trend" value={metrics1.trend} color={trendBadge(metrics1.trend)} isBadge icon={TrendingUp} />
                            <MetricCard label="RSI (14)" value={metrics1.rsi.toFixed(1)} color={rsiColor(metrics1.rsi)} icon={BarChart2} />
                            <MetricCard label="Total Return" value={(metrics1.totalReturn > 0 ? "+" : "") + metrics1.totalReturn + "%"} color={metrics1.totalReturn > 0 ? "text-emerald-400" : "text-red-400"} icon={Zap} />
                        </div>
                    </div>

                    {/* Stock 2 Metrics */}
                    <AnimatePresence>
                        {compareMode && metrics2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 px-1">
                                    <div className="w-3 h-3 rounded-full bg-amber-400" /> {validSym2}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <MetricCard label="Current Price" value={metrics2.currentPriceStr} color="text-foreground" icon={Coins} />
                                    <MetricCard label="Market Cap" value={metrics2.marketCap} color="text-foreground" icon={Layers} />
                                    <MetricCard label="P/E Ratio" value={metrics2.peRatio} color="text-foreground" icon={Target} />
                                    <MetricCard label="High / Low" value={metrics2.highLow} color="text-muted-foreground" icon={ArrowLeftRight} />
                                    <MetricCard label="Volatility" value={metrics2.volatility} color={volColor(metrics2.volatility)} icon={Activity} />
                                    <MetricCard label="Trend" value={metrics2.trend} color={trendBadge(metrics2.trend)} isBadge icon={TrendingUp} />
                                    <MetricCard label="RSI (14)" value={metrics2.rsi.toFixed(1)} color={rsiColor(metrics2.rsi)} icon={BarChart2} />
                                    <MetricCard label="Total Return" value={(metrics2.totalReturn > 0 ? "+" : "") + metrics2.totalReturn + "%"} color={metrics2.totalReturn > 0 ? "text-emerald-400" : "text-red-400"} icon={Zap} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Head-to-Head Table & AI Verdict */}
            <AnimatePresence>
                {compareMode && result && metrics1 && metrics2 && (
                    <motion.div variants={itemAnim} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-border/50 pt-6">
                        <CompareTable sym1={validSym1} sym2={validSym2} m1={metrics1} m2={metrics2} />

                        {/* Verdict Box */}
                        <div className="glass-card border-amber-500/20 bg-amber-500/5 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full blur-2xl pointer-events-none" />
                            <div className="flex items-center gap-2 p-4 border-b border-amber-500/10">
                                <Brain className="w-4 h-4 text-amber-400" />
                                <h3 className="font-semibold text-sm text-amber-400">AI Buy Verdict</h3>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-center">
                                {result.verdict ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Winner</span>
                                            <div className="flex items-center gap-2 text-2xl font-bold text-amber-500">
                                                <Trophy className="w-6 h-6" /> {result.verdict.winner}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</span>
                                            <p className="text-sm leading-relaxed text-foreground/90">
                                                {result.verdict.rationale}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic text-center">AI could not determine a clear winner or response was truncated.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            {error && (
                <motion.div variants={itemAnim} className="glass-card p-4 flex items-center gap-3 border border-destructive/30 bg-destructive/5">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                </motion.div>
            )}

            {/* Chart Results */}
            <AnimatePresence>
                {result && metrics1 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                                <span className="font-semibold text-primary">Deterministic rules applied:</span>
                                {metrics1.volatility === "High" && " Candlestick forced (High Volatility)."}
                                {userIntent === "Prediction" && " RSI enforced (Prediction intent)."}
                                {assetType === "Index" && " Candlestick removed, Line Chart enforced (Index)."}
                                {compareMode && ` Charts show indexed comparison: ${validSym1} (blue) vs ${validSym2} (amber) — both normalized to base 100.`}
                            </span>
                        </div>

                        {result.blocks.map((block, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card overflow-hidden">
                                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">{i + 1}</div>
                                        <div>
                                            <p className="font-semibold text-sm">{block.chartType}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {compareMode ? `${validSym1} vs ${validSym2}` : validSym1} · {timeHorizon} · {assetType}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {compareMode && (
                                            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                                                <GitCompare className="w-3 h-3" /> Compare
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                                            <CheckCircle2 className="w-3 h-3" /> Validated
                                        </span>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="p-4">
                                    <ChartRenderer
                                        chartType={block.chartType}
                                        history={history1}
                                        withMA={metrics1.withMA}
                                        rsiSeries={metrics1.rsiSeries}
                                        volSeries={metrics1.volSeries}
                                        compareHistory={compareMode ? history2 : null}
                                        compareSymbol={validSym2}
                                        symbol={validSym1}
                                    />
                                </div>

                                {/* AI Explanation */}
                                {(block.purpose || block.keyInsight || block.beginnerInterpretation) && (
                                    <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[{ label: "Purpose", value: block.purpose, icon: Brain }, { label: "Key Insight", value: block.keyInsight, icon: TrendingUp }, { label: "Beginner Tip", value: block.beginnerInterpretation, icon: Info }].map(({ label, value, icon: Icon }) => value ? (
                                            <div key={label} className="bg-secondary/30 border border-border/50 rounded-lg p-3 space-y-1">
                                                <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{value}</p>
                                            </div>
                                        ) : null)}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!result && !loading && !error && (
                <motion.div variants={itemAnim} className="glass-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                    <Search className="w-12 h-12 opacity-20" />
                    <p className="font-medium">Search any stock and click <span className="text-primary font-bold">Analyze</span></p>
                    <p className="text-sm">Enable <span className="text-amber-400 font-medium">Compare</span> to overlay two assets and get an AI Buy Verdict</p>
                </motion.div>
            )}
        </motion.div>
    );
}
