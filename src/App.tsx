import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Monitoring from "./pages/Monitoring";
import Merchants from "./pages/Merchants";
import Risk from "./pages/Risk";
import Insights from "./pages/Insights";
import Recommendations from "./pages/Recommendations";
import Integrations from "./pages/Integrations";
import Compliance from "./pages/Compliance";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Transactions from "./pages/Transactions";
import AIAdvisor from "./pages/AIAdvisor";
import ImportData from "./pages/ImportData";
import SettingsPage from "./pages/SettingsPage";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import TeamManagement from "./pages/TeamManagement";
import PurchaseOrders from "./pages/PurchaseOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRedirect />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Monitoring />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/merchants" element={<Merchants />} />
              <Route path="/risk" element={<Risk />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/compliance" element={<Compliance />} />

              <Route path="/legacy/dashboard" element={<Dashboard />} />
              <Route path="/legacy/products" element={<Products />} />
              <Route path="/legacy/customers" element={<Customers />} />
              <Route path="/legacy/suppliers" element={<Suppliers />} />
              <Route path="/legacy/transactions" element={<Transactions />} />
              <Route path="/ai" element={<AIAdvisor />} />
              <Route path="/legacy/import" element={<ImportData />} />
              <Route path="/legacy/settings" element={<SettingsPage />} />
              <Route path="/legacy/pos" element={<POS />} />
              <Route path="/legacy/reports" element={<Reports />} />
              <Route path="/legacy/expenses" element={<Expenses />} />
              <Route path="/legacy/team" element={<TeamManagement />} />
              <Route path="/legacy/purchase-orders" element={<PurchaseOrders />} />

              <Route path="/products" element={<Navigate to="/legacy/products" replace />} />
              <Route path="/customers" element={<Navigate to="/legacy/customers" replace />} />
              <Route path="/suppliers" element={<Navigate to="/legacy/suppliers" replace />} />
              <Route path="/transactions" element={<Navigate to="/legacy/transactions" replace />} />
              <Route path="/import" element={<Navigate to="/legacy/import" replace />} />
              <Route path="/settings" element={<Navigate to="/legacy/settings" replace />} />
              <Route path="/pos" element={<Navigate to="/legacy/pos" replace />} />
              <Route path="/reports" element={<Navigate to="/legacy/reports" replace />} />
              <Route path="/expenses" element={<Navigate to="/legacy/expenses" replace />} />
              <Route path="/team" element={<Navigate to="/legacy/team" replace />} />
              <Route path="/purchase-orders" element={<Navigate to="/legacy/purchase-orders" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
