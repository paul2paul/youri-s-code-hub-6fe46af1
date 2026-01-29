import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import pages from root /pages directory
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Governance from "@/pages/Governance";
import Timeline from "@/pages/Timeline";
import Stakeholders from "@/pages/Stakeholders";
import Settings from "@/pages/Settings";
import CompanySetup from "@/pages/CompanySetup";
import Auth from "@/pages/Auth";
import Advisor from "@/pages/Advisor";
import YearInput from "@/pages/YearInput";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/stakeholders" element={<Stakeholders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/company-setup" element={<CompanySetup />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/year-input" element={<YearInput />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
