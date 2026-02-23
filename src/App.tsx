import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import BusinessSetup from "./pages/BusinessSetup";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import BillsHistory from "./pages/BillsHistory";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminLayout from "./components/layout/SuperAdminLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/super-admin-login" element={<SuperAdminLogin />} />
              <Route
                path="/business-setup"
                element={
                  <ProtectedRoute>
                    <BusinessSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/bills-history" element={<BillsHistory />} />
                <Route path="/products" element={<Products />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/super-admin" element={<SuperAdmin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
