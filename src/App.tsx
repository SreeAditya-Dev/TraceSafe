import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import TruckDashboard from "./pages/TruckDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import CustomerView from "./pages/CustomerView";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";

// Government Pages
import GovtLayout from "./layouts/GovtLayout";
import EnamDashboard from "./pages/govt/EnamDashboard";
import AgristackRegistry from "./pages/govt/AgristackRegistry";
import FssaiCompliance from "./pages/govt/FssaiCompliance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/scan/:batchId" element={<CustomerView />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer"
              element={
                <ProtectedRoute roles={["farmer"]}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute roles={["driver"]}>
                  <TruckDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retailer"
              element={
                <ProtectedRoute roles={["retailer"]}>
                  <RetailerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Government Integration Routes */}
            <Route path="/govt" element={<GovtLayout />}>
              <Route index element={<Navigate to="/govt/enam" replace />} />
              <Route path="enam" element={<EnamDashboard />} />
              <Route path="agristack" element={<AgristackRegistry />} />
              <Route path="fssai" element={<FssaiCompliance />} />
            </Route>

            {/* Unauthorized Route */}
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Unauthorized</h1>
                    <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
                    <a href="/login" className="text-blue-600 hover:underline">Go to Login</a>
                  </div>
                </div>
              }
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
