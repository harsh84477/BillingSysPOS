/**
 * App.tsx — Invoice Adda Root Component
 *
 * Sets up the entire application shell:
 * - PersistQueryClientProvider: React Query with IndexedDB persistence (offline caching)
 * - ThemeProvider: wraps the whole app so any component can read/change the theme
 * - AuthProvider: provides user session, role, businessId to all components
 * - BrowserRouter + route definitions: maps URLs to page components
 * - Toaster/Sonner: global toast notification system
 *
 * Route structure:
 *   /auth          → Login/signup page
 *   /              → AppLayout (sidebar + topbar wrapper)
 *     /dashboard   → Dashboard with KPI cards and recent activity
 *     /billing     → Main POS billing screen
 *     /bills       → Bills history list
 *     /drafts      → Draft (incomplete) bills
 *     /due-bills   → Bills with outstanding payments
 *     /products    → Product catalog management
 *     /categories  → Product category management
 *     /customers   → Customer directory
 *     /expenses    → Expense tracker
 *     /reports     → Sales and financial reports
 *     /settings    → All settings tabs
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
import DueBills from "./pages/DueBills";
import Expenses from "./pages/Expenses";
import ActivityLogs from "./pages/ActivityLogs";
import SalesmanBilling from "./pages/SalesmanBilling";
import DraftBills from "./pages/DraftBills";
import Reports from "./pages/Reports";
import ManageProducts from "./pages/ManageProducts";
import ManageCustomers from "./pages/ManageCustomers";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import SalesReturns from "./pages/SalesReturns";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve stale cache immediately when offline; retry in background when online
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60 * 5,          // 5 minutes before background refetch
      gcTime: 1000 * 60 * 60 * 24 * 7,  // Keep cache 7 days
      retry: (failureCount, error: any) => {
        // Don't retry auth errors; retry network errors up to 2 times
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Persists React Query cache to localStorage so data survives app restarts offline
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'smartpos_query_cache',
  throttleTime: 3000,
});

// Handles the OAuth deep-link callback on Android (com.smartpos.app://login-callback#...)
function OAuthCallbackHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppUrl = async ({ url }: { url: string }) => {
      if (!url.startsWith('com.smartpos.app://')) return;

      // Close the in-app browser
      await Browser.close();

      // Supabase v2 PKCE flow: callback has ?code=XXXX in query params
      if (url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.error('OAuth code exchange error:', error.message);
        return;
      }

      // Implicit flow fallback: tokens in URL hash fragment
      if (url.includes('access_token=')) {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    };

    CapApp.addListener('appUrlOpen', handleAppUrl);
    return () => {
      CapApp.removeAllListeners();
    };
  }, []);

  return null;
}

// Handles the OAuth callback in Electron via the invoiceadda:// custom protocol.
// The main process sends 'oauth-callback' via ipcRenderer after the system browser
// redirects to invoiceadda://oauth-callback?code=XXXX
function ElectronOAuthCallbackHandler() {
  useEffect(() => {
    const isElectron =
      typeof window !== 'undefined' &&
      typeof (window as any).process === 'object' &&
      (window as any).process.type === 'renderer';

    if (!isElectron) return;

    const { ipcRenderer } = require('electron');

    const handleOAuthCallback = async (_event: any, url: string) => {
      if (!url.startsWith('invoiceadda://')) return;

      // PKCE flow: ?code=XXXX
      if (url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.error('Electron OAuth code exchange error:', error.message);
        return;
      }

      // Implicit flow fallback: tokens in hash or query
      if (url.includes('access_token=')) {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    };

    ipcRenderer.on('oauth-callback', handleOAuthCallback);
    return () => {
      ipcRenderer.removeListener('oauth-callback', handleOAuthCallback);
    };
  }, []);

  return null;
}


const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      buster: '1',                       // bump this string to wipe old cache
    }}
  >
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OAuthCallbackHandler />
          <ElectronOAuthCallbackHandler />
          <HashRouter>
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
                <Route path="/manage-products" element={<ManageProducts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/manage-customers" element={<ManageCustomers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/due-bills" element={<DueBills />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/draft-bills" element={<DraftBills />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/salesman-billing" element={<SalesmanBilling />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                <Route path="/sales-returns" element={<SalesReturns />} />
              </Route>

              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute>
                    <SuperAdmin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
