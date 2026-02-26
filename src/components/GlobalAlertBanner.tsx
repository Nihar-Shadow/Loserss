import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DrasticAlert {
  severity: "critical" | "warning";
  headline: string;
  description: string;
  affected_sectors: string[];
  recommended_action: string;
}

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function GlobalAlertBanner() {
  const [alerts, setAlerts] = useState<DrasticAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("news-intelligence", {
        body: { sectors: ["Technology", "Banking", "Energy", "Pharma", "Auto"] },
      });
      if (error || data?.error) return;
      const newAlerts: DrasticAlert[] = data?.drastic_alerts ?? [];
      if (newAlerts.length === 0) return;

      // Only toast for truly new alerts (by headline)
      const currentHeadlines = new Set(alerts.map((a) => a.headline));
      newAlerts.forEach((a) => {
        if (!currentHeadlines.has(a.headline)) {
          toast({
            title: `${a.severity === "critical" ? "🚨" : "⚠️"} ${a.headline}`,
            description: a.description.slice(0, 120) + "…",
            variant: "destructive",
            duration: 8000,
          });
        }
      });
      setAlerts(newAlerts);
      setDismissed(new Set());
    } catch {
      // silent fail – alerts are non-critical UI
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  const visible = alerts.filter((a) => !dismissed.has(a.headline));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visible.map((alert) => {
          const isCritical = alert.severity === "critical";
          return (
            <motion.div
              key={alert.headline}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-xl border-2 p-4 flex items-start gap-4 ${
                isCritical
                  ? "border-destructive/60 bg-destructive/10"
                  : "border-warning/60 bg-warning/10"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
                isCritical ? "bg-destructive/20" : "bg-warning/20"
              }`}>
                {isCritical
                  ? <ShieldAlert className="w-5 h-5 text-destructive" />
                  : <AlertTriangle className="w-5 h-5 text-warning" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isCritical ? "text-destructive" : "text-warning"
                }`}>
                  {isCritical ? "🚨 Critical Alert" : "⚠️ Warning"}
                </span>
                <h3 className="font-bold text-sm mt-0.5">{alert.headline}</h3>
                <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {alert.affected_sectors.map((s) => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isCritical ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                    }`}>{s}</span>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommended:</span> {alert.recommended_action}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, alert.headline]))}
                className="shrink-0 p-1 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
