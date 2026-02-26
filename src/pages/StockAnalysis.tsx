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
    GitCompare, X, ArrowLeftRight,
} from "lucide-react";

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

const STOCKS = [
    { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
    { symbol: "TCS", name: "Tata Consultancy", sector: "Technology" },
    { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
    { symbol: "INFY", name: "Infosys", sector: "Technology" },
    { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
    { symbol: "WIPRO", name: "Wipro", sector: "Technology" },
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Auto" },
    { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
    { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
];
const HORIZONS = ["1W", "1M", "3M", "6M", "1Y"];

// ─── Price Generator ────────────────────────────────────────────────────
function generatePriceHistory(symbol: string, days: number) {
    const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = 100 + (seed % 800);
    const data = [];
    let price = base;
    const rng = (i: number, s: number) => Math.sin(i * 0.3 + s) * 0.5 + Math.cos(i * 0.11 + s * 0.5) * 0.5;
    for (let i = 0; i < days; i++) {
        const noise = rng(i, seed) * 4;
        price = Math.max(10, price + noise + (rng(i + 100, seed * 3) - 0.5) * base * 0.012);
        const open = price;
        const close = price + rng(i + 50, seed * 2) * base * 0.008;
        const high = Math.max(open, close) + Math.abs(rng(i + 200, seed)) * base * 0.006;
        const low = Math.min(open, close) - Math.abs(rng(i + 300, seed)) * base * 0.006;
        const volume = Math.round(100000 + Math.abs(rng(i, seed * 7)) * 900000);
        data.push({
            day: i + 1,
            date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
            price: Number(price.toFixed(2)),
            open: Number(open.toFixed(2)),
            close: Number(close.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            volume,
        });
    }
    return data;
}

// ─── Metrics ────────────────────────────────────────────────────────────
function computeMetrics(history: ReturnType<typeof generatePriceHistory>) {
    const prices = history.map((d) => d.price);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const stdDev = Math.sqrt(returns.reduce((a, r) => a + r * r, 0) / returns.length) * Math.sqrt(252);
    const volatility: "Low" | "Medium" | "High" = stdDev > 0.4 ? "High" : stdDev > 0.2 ? "Medium" : "Low";
    const ma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ma50 = prices.slice(-Math.min(50, prices.length)).reduce((a, b) => a + b, 0) / Math.min(50, prices.length);
    const trend: "Strong Uptrend" | "Uptrend" | "Sideways" | "Downtrend" | "Strong Downtrend" =
        prices[prices.length - 1] > ma20 * 1.03 && ma20 > ma50 * 1.01 ? "Strong Uptrend" :
            prices[prices.length - 1] > ma20 ? "Uptrend" :
                prices[prices.length - 1] < ma20 * 0.97 && ma20 < ma50 * 0.99 ? "Strong Downtrend" :
                    prices[prices.length - 1] < ma20 ? "Downtrend" : "Sideways";
    const avgVolume = history.reduce((a, d) => a + d.volume, 0) / history.length;
    const liquidity: "High" | "Medium" | "Low" = avgVolume > 500000 ? "High" : avgVolume > 200000 ? "Medium" : "Low";
    let gains = 0, losses = 0;
    returns.slice(-14).forEach((r) => { if (r > 0) gains += r; else losses += Math.abs(r); });
    const rsi = Number((100 - 100 / (1 + gains / (losses || 0.001))).toFixed(1));
    const totalReturn = Number((((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(2));
    const maxPrice = Math.max(...prices), minPrice = Math.min(...prices);
    const maxDrawdown = Number((((maxPrice - minPrice) / maxPrice) * 100).toFixed(2));

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
    const volSeries = history.map((d) => ({ ...d, atr: Number((((d.high - d.low) / d.price) * 100).toFixed(2)) }));

    return { volatility, trend, liquidity, stdDev, rsi, totalReturn, maxDrawdown, withMA, rsiSeries, volSeries };
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
        const get = (key: string) => { const m = section.match(new RegExp(`-?\\s*${key}:\\s*(.+)`, "i")); return m ? m[1].trim() : ""; };
        const chartType = get("Chart Type");
        if (!chartType) continue;
        blocks.push({ chartType, purpose: get("Purpose"), keyInsight: get("Key Insight"), beginnerInterpretation: get("Beginner Interpretation") });
    }
    return blocks;
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

// ─── Stock Selector ─────────────────────────────────────────────────────
function StockSelect({ value, onChange, label, exclude }: { value: string; onChange: (s: string) => void; label: string; exclude?: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    {STOCKS.filter((s) => s.symbol !== exclude).map((s) => (
                        <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
        </div>
    );
}

// ─── Comparison Metrics Table ───────────────────────────────────────────
function CompareTable({ sym1, sym2, m1, m2 }: { sym1: string; sym2: string; m1: ReturnType<typeof computeMetrics>; m2: ReturnType<typeof computeMetrics> }) {
    const rows = [
        { label: "Trend", v1: m1.trend, v2: m2.trend },
        { label: "Volatility", v1: m1.volatility, v2: m2.volatility },
        { label: "Liquidity", v1: m1.liquidity, v2: m2.liquidity },
        { label: "RSI (14)", v1: m1.rsi.toFixed(1), v2: m2.rsi.toFixed(1) },
        { label: "Total Return", v1: (m1.totalReturn > 0 ? "+" : "") + m1.totalReturn + "%", v2: (m2.totalReturn > 0 ? "+" : "") + m2.totalReturn + "%" },
        { label: "Max Drawdown", v1: m1.maxDrawdown + "%", v2: m2.maxDrawdown + "%" },
    ];
    const retColor = (v: string) => v.startsWith("+") ? "text-emerald-400" : "text-red-400";
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
                        <>
                            <div key={row.label + "l"} className={`p-2.5 text-muted-foreground border-r border-border/50 ${i < rows.length - 1 ? "border-b" : ""}`}>{row.label}</div>
                            <div key={row.label + "v1"} className={`p-2.5 font-medium text-center border-r border-border/50 ${i < rows.length - 1 ? "border-b" : ""} ${row.label === "Total Return" ? retColor(row.v1) : ""}`}>{row.v1}</div>
                            <div key={row.label + "v2"} className={`p-2.5 font-medium text-center ${i < rows.length - 1 ? "border-b border-border/50" : ""} ${row.label === "Total Return" ? retColor(row.v2) : ""}`}>{row.v2}</div>
                        </>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Groq AI Call ───────────────────────────────────────────────────────
async function fetchChartRecommendation(input: object, GROQ_API_KEY: string): Promise<{ charts: string[]; blocks: ReturnType<typeof parseChartBlocks> }> {
    const systemPrompt = `You are a quantitative market visualization expert and trading analyst.
Your task is to decide the most appropriate financial chart(s) to display based on the asset type, market behavior, and analysis objective.
Do NOT generate code. Do NOT generate trading advice.
Only use chart types from: ${ALLOWED_CHARTS.join(", ")}.
For each chart, use EXACTLY this format:

CHART RECOMMENDATION:
- Chart Type: [exact chart name from allowed list]
- Purpose: [one sentence]
- Key Insight: [one sentence]
- Beginner Interpretation: [one simple sentence]`;

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
        const blocks = parseChartBlocks(groqData.choices?.[0]?.message?.content ?? "");
        const charts = blocks.map((b) => b.chartType);
        const allValid = charts.every((c) => ALLOWED_CHARTS.some((a) => a.toLowerCase() === c.toLowerCase()));
        if (!allValid && attempt < 2) continue;
        const normalized = charts.map((c) => ALLOWED_CHARTS.find((a) => a.toLowerCase() === c.toLowerCase()) ?? c);
        return { charts: normalized, blocks: normalized.map((c) => blocks.find((b) => ALLOWED_CHARTS.find((a) => a.toLowerCase() === b.chartType.toLowerCase()) === c) ?? { chartType: c, purpose: "", keyInsight: "", beginnerInterpretation: "" }) };
    }
    return { charts: [], blocks: [] };
}

// ─── Main Component ──────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function StockAnalysis() {
    const [sym1, setSym1] = useState("RELIANCE");
    const [sym2, setSym2] = useState("TCS");
    const [compareMode, setCompareMode] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState("1M");
    const [userIntent, setUserIntent] = useState<"Overview" | "Prediction" | "Risk">("Overview");
    const [assetType, setAssetType] = useState<"Stock" | "Index" | "ETF">("Stock");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ charts: string[]; blocks: ReturnType<typeof parseChartBlocks> } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 252 }[timeHorizon] ?? 30;
    const stock1 = STOCKS.find((s) => s.symbol === sym1) ?? STOCKS[0];
    const stock2 = STOCKS.find((s) => s.symbol === sym2) ?? STOCKS[1];

    const history1 = useMemo(() => generatePriceHistory(sym1, days), [sym1, days]);
    const history2 = useMemo(() => generatePriceHistory(sym2, days), [sym2, days]);
    const metrics1 = useMemo(() => computeMetrics(history1), [history1]);
    const metrics2 = useMemo(() => computeMetrics(history2), [history2]);

    const analyze = async () => {
        const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
        if (!GROQ_API_KEY) { setError("VITE_GROQ_API_KEY not set in .env"); return; }
        setLoading(true); setResult(null); setError(null);
        try {
            const input: any = { asset_type: assetType, asset_symbol: sym1, time_horizon: timeHorizon, volatility_level: metrics1.volatility, trend_strength: metrics1.trend, liquidity: metrics1.liquidity, user_intent: userIntent };
            if (compareMode) {
                input.comparison_symbol = sym2;
                input.comparison_volatility = metrics2.volatility;
                input.comparison_trend = metrics2.trend;
            }
            const raw = await fetchChartRecommendation(input, GROQ_API_KEY);
            const finalCharts = applyRuleOverrides(raw.charts, assetType, metrics1.volatility, userIntent);
            const finalBlocks = finalCharts.map((c) => raw.blocks.find((b) => b.chartType === c) ?? { chartType: c, purpose: "", keyInsight: "", beginnerInterpretation: "" });
            setResult({ charts: finalCharts, blocks: finalBlocks });
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
                <p className="text-muted-foreground mt-1 text-sm">Groq-powered chart recommendation engine · Compare two stocks side-by-side</p>
            </motion.div>

            {/* Controls Panel */}
            <motion.div variants={itemAnim} className="glass-card p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stock 1 */}
                    <StockSelect value={sym1} onChange={(v) => { setSym1(v); setResult(null); }} label={compareMode ? "Stock A" : "Stock"} exclude={compareMode ? sym2 : undefined} />

                    {/* Stock 2 or Compare Toggle */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Compare With</label>
                            <button
                                onClick={() => { setCompareMode(!compareMode); setResult(null); }}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${compareMode ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "border-border text-muted-foreground hover:border-primary/40"}`}
                            >
                                <GitCompare className="w-3.5 h-3.5" />
                                {compareMode ? "Compare ON" : "Enable Compare"}
                            </button>
                        </div>
                        {compareMode ? (
                            <div className="relative">
                                <select
                                    value={sym2}
                                    onChange={(e) => { setSym2(e.target.value); setResult(null); }}
                                    className="w-full bg-secondary border border-amber-500/40 rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    {STOCKS.filter((s) => s.symbol !== sym1).map((s) => (
                                        <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        ) : (
                            <div className="h-10 flex items-center text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 border border-dashed border-border/50">
                                Click "Enable Compare" to add a second stock
                            </div>
                        )}
                    </div>
                </div>

                {/* Horizon + Intent + Type + Analyze */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Horizon</label>
                        <div className="flex gap-1">
                            {HORIZONS.map((h) => (
                                <button key={h} onClick={() => { setTimeHorizon(h); setResult(null); }}
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
                                    className={`flex-1 text-xs py-2 rounded-md border transition-colors ${userIntent === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
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
                        <button onClick={analyze} disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            {loading ? "Analyzing…" : compareMode ? `Compare ${sym1} vs ${sym2}` : "Analyze"}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Metrics Panels */}
            <motion.div variants={itemAnim} className={`grid gap-4 ${compareMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                {/* Stock 1 Metrics */}
                <div className="space-y-2">
                    {compareMode && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary px-1">
                            <div className="w-3 h-3 rounded-full bg-primary" /> {sym1} — {stock1.name}
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <MetricCard label="Volatility" value={metrics1.volatility} color={volColor(metrics1.volatility)} icon={Activity} />
                        <MetricCard label="Trend" value={metrics1.trend} color={trendBadge(metrics1.trend)} isBadge icon={TrendingUp} />
                        <MetricCard label="RSI (14)" value={metrics1.rsi.toFixed(1)} color={rsiColor(metrics1.rsi)} icon={BarChart2} />
                        <MetricCard label="Total Return" value={(metrics1.totalReturn > 0 ? "+" : "") + metrics1.totalReturn + "%"} color={metrics1.totalReturn > 0 ? "text-emerald-400" : "text-red-400"} icon={Zap} />
                    </div>
                </div>

                {/* Stock 2 Metrics */}
                <AnimatePresence>
                    {compareMode && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 px-1">
                                <div className="w-3 h-3 rounded-full bg-amber-400" /> {sym2} — {stock2.name}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <MetricCard label="Volatility" value={metrics2.volatility} color={volColor(metrics2.volatility)} icon={Activity} />
                                <MetricCard label="Trend" value={metrics2.trend} color={trendBadge(metrics2.trend)} isBadge icon={TrendingUp} />
                                <MetricCard label="RSI (14)" value={metrics2.rsi.toFixed(1)} color={rsiColor(metrics2.rsi)} icon={BarChart2} />
                                <MetricCard label="Total Return" value={(metrics2.totalReturn > 0 ? "+" : "") + metrics2.totalReturn + "%"} color={metrics2.totalReturn > 0 ? "text-emerald-400" : "text-red-400"} icon={Zap} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Head-to-Head Table */}
            <AnimatePresence>
                {compareMode && (
                    <motion.div variants={itemAnim} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <CompareTable sym1={sym1} sym2={sym2} m1={metrics1} m2={metrics2} />
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
                {result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                                <span className="font-semibold text-primary">Deterministic rules applied:</span>
                                {metrics1.volatility === "High" && " Candlestick forced (High Volatility)."}
                                {userIntent === "Prediction" && " RSI enforced (Prediction intent)."}
                                {assetType === "Index" && " Candlestick removed, Line Chart enforced (Index)."}
                                {compareMode && ` Charts show indexed comparison: ${sym1} (blue) vs ${sym2} (amber) — both normalized to base 100.`}
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
                                                {compareMode ? `${sym1} vs ${sym2}` : sym1} · {timeHorizon} · {assetType}
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
                                        compareSymbol={sym2}
                                        symbol={sym1}
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
                    <BarChart2 className="w-12 h-12 opacity-20" />
                    <p className="font-medium">Select a stock and click <span className="text-primary font-bold">Analyze</span></p>
                    <p className="text-sm">Enable <span className="text-amber-400 font-medium">Compare</span> to overlay two stocks on the same chart</p>
                </motion.div>
            )}
        </motion.div>
    );
}
