import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GovtLayout from "./layouts/GovtLayout";
import EnamDashboard from "./pages/govt/EnamDashboard";
import AgristackRegistry from "./pages/govt/AgristackRegistry";
import FssaiCompliance from "./pages/govt/FssaiCompliance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/govt" element={<GovtLayout />}>
            <Route path="enam" element={<EnamDashboard />} />
            <Route path="agristack" element={<AgristackRegistry />} />
            <Route path="fssai" element={<FssaiCompliance />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
