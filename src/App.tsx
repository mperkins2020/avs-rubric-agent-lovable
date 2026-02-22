import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Results from "./pages/Results";
import Methodology from "./pages/Methodology";
import FAQ from "./pages/FAQ";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import CaseStudies from "./pages/CaseStudies";
import CaseStudyElevenLabs from "./pages/CaseStudyElevenLabs";
import CaseStudyClay from "./pages/CaseStudyClay";
import Blog from "./pages/Blog";
import BlogTrustGrowthConstraint from "./pages/BlogTrustGrowthConstraint";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<Index />} />
    <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
    <Route path="/methodology" element={<Methodology />} />
    <Route path="/faq" element={<FAQ />} />
    <Route path="/faq/product-growth" element={<Navigate to="/faq" replace />} />
    <Route path="/faq/cfo-revops" element={<Navigate to="/faq" replace />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/resources/case-studies" element={<CaseStudies />} />
    <Route path="/resources/case-studies/elevenlabs" element={<CaseStudyElevenLabs />} />
    <Route path="/resources/case-studies/clay" element={<CaseStudyClay />} />
    <Route path="/resources/blog" element={<Blog />} />
    <Route path="/resources/blog/trust-growth-constraint" element={<BlogTrustGrowthConstraint />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

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
