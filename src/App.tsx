import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";
import PermissionGuard from "@/components/PermissionGuard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import ColdStartLoader from "@/components/ColdStartLoader";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ColdStartLoader>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<LoadingSkeleton />}>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/" element={
                  <PermissionGuard>
                    <Index />
                  </PermissionGuard>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ColdStartLoader>
  </ErrorBoundary>
);

export default App;
