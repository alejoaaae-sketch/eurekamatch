import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SessionTracker from "@/components/SessionTracker";
import Landing from "./pages/Landing";
import AppLanding from "./pages/AppLanding";
import Login from "./pages/Login";
import Home from "./pages/Home";
import AddPick from "./pages/AddPick";
import BuyPacks from "./pages/BuyPacks";
import PickDetail from "./pages/PickDetail";
import Match from "./pages/Match";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SessionTracker>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/add" element={<AddPick />} />
            <Route path="/buy-packs" element={<BuyPacks />} />
            <Route path="/pick/:id" element={<PickDetail />} />
            <Route path="/match/:id" element={<Match />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/install" element={<Install />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </SessionTracker>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
