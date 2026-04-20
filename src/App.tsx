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
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminLayout from "./components/layout/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminBusinesses from "./pages/super-admin/Businesses";
import SuperAdminSubscriptions from "./pages/super-admin/Subscriptions";
import SuperAdminUsers from "./pages/super-admin/Users";
import SuperAdminPlans from "./pages/super-admin/Plans";
import SuperAdminLogs from "./pages/super-admin/Logs";
import SuperAdminAnalytics from "./pages/super-admin/Analytics";
import SuperAdminTenants from "./pages/super-admin/Tenants";
import SuperAdminRoles from "./pages/super-admin/Roles";
import SuperAdminRevenue from "./pages/super-admin/Revenue";
import SuperAdminSupportTickets from "./pages/super-admin/SupportTickets";
import SuperAdminAnnouncements from "./pages/super-admin/Announcements";
import SuperAdminHealth from "./pages/super-admin/Health";
import SuperAdminSettings from "./pages/super-admin/Settings";
import { Outlet } from "react-router-dom";
import DueBills from "./pages/DueBills";
import Expenses from "./pages/Expenses";
import ActivityLogs from "./pages/ActivityLogs";
import SalesmanBilling from "./pages/SalesmanBilling";
import DraftBills from "./pages/DraftBills";
import SalesmanOrders from "./pages/SalesmanOrders";
import SalesmanMyOrders from "./pages/SalesmanMyOrders";
import Reports from "./pages/Reports";
import ManageProducts from "./pages/ManageProducts";
import ManageCustomers from "./pages/ManageCustomers";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import SalesReturns from "./pages/SalesReturns";
import SalesmanDashboard from "./pages/SalesmanDashboard";
import SalesmanStores from "./pages/SalesmanStores";
import SalesmanTargets from "./pages/SalesmanTargets";
import SalesmanControl from "./pages/SalesmanControl";
import SalesmanSettings from "./pages/SalesmanSettings";
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
      staleTime: 1000 * 30,               // 30 seconds before background refetch
      gcTime: 1000 * 60 * 60 * 24 * 7,  // Keep cache 7 days
      refetchOnWindowFocus: true,
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

// ─── Error Boundary to prevent white screen crashes ───
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{this.state.error?.message}</p>
          <button
            onClick={() => {
              localStorage.removeItem('smartpos_query_cache');
              window.location.hash = '#/dashboard';
              window.location.reload();
            }}
            style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Role-aware home redirect
function HomeRedirect() {
  const { userRole } = useAuth();
  const target = userRole === 'salesman' ? '/salesman-dashboard' : '/dashboard';
  return <Navigate to={target} replace />;
}

const App = () => (
  <ErrorBoundary>
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      buster: '2',                       // bump this string to wipe old cache
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
                <Route path="/" element={<HomeRedirect />} />
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
                <Route path="/salesman-orders" element={<SalesmanOrders />} />
                <Route path="/salesman-my-orders" element={<SalesmanMyOrders />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                <Route path="/sales-returns" element={<SalesReturns />} />
                <Route path="/salesman-dashboard" element={<SalesmanDashboard />} />
                <Route path="/salesman-stores" element={<SalesmanStores />} />
                <Route path="/salesman-targets" element={<SalesmanTargets />} />
                <Route path="/salesman-control" element={<SalesmanControl />} />
                <Route path="/salesman-settings" element={<SalesmanSettings />} />
              </Route>

                <Route path="/super-admin" element={
                  <ProtectedRoute>
                    <SuperAdminLayout>
                      <Outlet />
                    </SuperAdminLayout>
                  </ProtectedRoute>
                }>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="dashboard" element={<SuperAdminDashboard />} />
                  <Route path="analytics" element={<SuperAdminAnalytics />} />
                  <Route path="users" element={<SuperAdminUsers />} />
                  <Route path="tenants" element={<SuperAdminTenants />} />
                  <Route path="roles" element={<SuperAdminRoles />} />
                  <Route path="businesses" element={<SuperAdminBusinesses />} />
                  <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
                  <Route path="revenue" element={<SuperAdminRevenue />} />
                  <Route path="plans" element={<SuperAdminPlans />} />
                  <Route path="support-tickets" element={<SuperAdminSupportTickets />} />
                  <Route path="announcements" element={<SuperAdminAnnouncements />} />
                  <Route path="logs" element={<SuperAdminLogs />} />
                  <Route path="health" element={<SuperAdminHealth />} />
                  <Route path="settings" element={<SuperAdminSettings />} />
                </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
  </ErrorBoundary>
);

export default App;
