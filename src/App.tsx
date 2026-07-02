import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import WorksList from "@/pages/WorksList";
import NewWork from "@/pages/NewWork";
import WorkDetail from "@/pages/WorkDetail";
import ClientsList from "@/pages/ClientsList";
import ClientDetail from "@/pages/ClientDetail";
import AgreementsList from "@/pages/AgreementsList";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectsList from "@/pages/ProjectsList";
import ReviewWorks from "@/pages/ReviewWorks";
import SettlementsList from "@/pages/SettlementsList";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  return <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/works" element={<ProtectedRoute><WorksList /></ProtectedRoute>} />
            <Route path="/works/new" element={<ProtectedRoute><NewWork /></ProtectedRoute>} />
            <Route path="/works/:id" element={<ProtectedRoute><WorkDetail /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/projects/:name" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/agreements" element={<ProtectedRoute><AgreementsList /></ProtectedRoute>} />
            <Route path="/settlements" element={<ProtectedRoute><SettlementsList /></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><ReviewWorks /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
