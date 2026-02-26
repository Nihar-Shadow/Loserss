import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import StockPrediction from "./pages/StockPrediction";
import PortfolioAnalyzer from "./pages/PortfolioAnalyzer";
import Learning from "./pages/Learning";
import ModuleDetail from "./pages/ModuleDetail";
import NewsIntelligence from "./pages/NewsIntelligence";
import AIAdvisor from "./pages/AIAdvisor";
import StockAnalysis from "./pages/StockAnalysis";
import Community from "./pages/Community";
import Markets from "./pages/Markets";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user && !loading ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/markets" element={<ProtectedRoute><Layout><Markets /></Layout></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><Layout><StockPrediction /></Layout></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><Layout><PortfolioAnalyzer /></Layout></ProtectedRoute>} />
      <Route path="/learn" element={<ProtectedRoute><Layout><Learning /></Layout></ProtectedRoute>} />
      <Route path="/learn/:moduleId" element={<ProtectedRoute><Layout><ModuleDetail /></Layout></ProtectedRoute>} />
      <Route path="/news" element={<ProtectedRoute><Layout><NewsIntelligence /></Layout></ProtectedRoute>} />
      <Route path="/advisor" element={<ProtectedRoute><Layout><AIAdvisor /></Layout></ProtectedRoute>} />
      <Route path="/stock-analysis" element={<ProtectedRoute><Layout><StockAnalysis /></Layout></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
