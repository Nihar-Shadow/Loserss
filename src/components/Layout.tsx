import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, BookOpen, Newspaper,
  PieChart, Bot, MessageSquare, ChevronLeft, ChevronRight, LogOut, Wallet, Globe, BarChart2
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import GlobalAlertBanner from "@/components/GlobalAlertBanner";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/markets", icon: Globe, label: "Markets" },
  { path: "/predictions", icon: TrendingUp, label: "Predictions" },
  { path: "/portfolio", icon: PieChart, label: "Portfolio" },
  { path: "/learn", icon: BookOpen, label: "Learn" },
  { path: "/news", icon: Newspaper, label: "News" },
  { path: "/advisor", icon: Bot, label: "AI Advisor" },
  { path: "/stock-analysis", icon: BarChart2, label: "Stock Analysis" },
  { path: "/community", icon: MessageSquare, label: "Community" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, walletAddress, connectWallet, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col border-r border-border bg-sidebar shrink-0"
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-lg font-bold gradient-text whitespace-nowrap">
                NexusFin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div layoutId="activeIndicator" className="absolute left-0 w-0.5 h-6 bg-primary rounded-r" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Wallet & Sign Out */}
        <div className="px-2 pb-2 space-y-1">
          {!walletAddress ? (
            <button
              onClick={connectWallet}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-nowrap">
                    Connect Wallet
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ) : !collapsed ? (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              🔗 {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          ) : null}
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-nowrap">
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </motion.aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          <GlobalAlertBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
