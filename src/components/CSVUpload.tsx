import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CSVUploadProps {
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const SAMPLE_CSV = `symbol,quantity,average_price,sector
AAPL,120,182.50,Technology
NVDA,45,485.00,Semiconductors
MSFT,60,410.25,Technology
GOOGL,35,141.80,Technology
AMZN,50,178.30,E-Commerce
TSLA,80,242.60,Automotive
META,40,505.00,Technology
JPM,70,198.50,Financials
JNJ,55,155.20,Healthcare
V,30,275.40,Financials
SPY,100,512.00,Index
TLT,150,92.80,Bonds
BTC-USD,2,62500.00,Crypto
GLD,60,185.00,Commodities`;

export default function CSVUpload({ onSuccess }: CSVUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    setResult(null);

    if (!file.name.endsWith(".csv")) {
      setResult({ success: false, message: "Only .csv files are accepted." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setResult({ success: false, message: "File too large. Maximum 2MB." });
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("portfolio-upload", {
        body: { csv_content: text },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({
        success: true,
        message: `Successfully imported ${data.summary.total_holdings} holdings worth $${data.summary.total_investment.toLocaleString()}.`,
        count: data.summary.total_holdings,
      });
      toast({ title: "Portfolio Imported!", description: `${data.summary.total_holdings} holdings loaded successfully.` });
      onSuccess?.();
    } catch (e: any) {
      setResult({ success: false, message: e.message || "Upload failed" });
      toast({ title: "Import Failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [onSuccess, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <FileText className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="font-medium">Parsing & validating portfolio...</p>
              <p className="text-sm text-muted-foreground">Normalizing columns, checking data integrity</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                dragActive ? "bg-primary/20" : "bg-primary/10"
              }`}>
                <Upload className={`w-6 h-6 text-primary transition-transform ${dragActive ? "scale-110" : ""}`} />
              </div>
              <div>
                <p className="font-medium">Drop your brokerage CSV here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse · Max 2MB</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-secondary/50">symbol / ticker</span>
                <span className="px-2 py-1 rounded bg-secondary/50">quantity / shares</span>
                <span className="px-2 py-1 rounded bg-secondary/50">avg_price / cost</span>
                <span className="px-2 py-1 rounded bg-secondary/50">sector (optional)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              result.success
                ? "bg-gain/5 border-gain/20 text-gain"
                : "bg-loss/5 border-loss/20 text-loss"
            }`}
          >
            {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <p className="text-sm flex-1">{result.message}</p>
            <button onClick={() => setResult(null)} className="p-1 hover:bg-background/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sample Download */}
      <button
        onClick={downloadSample}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Download className="w-3 h-3" />
        Download sample CSV template
      </button>
    </div>
  );
}
