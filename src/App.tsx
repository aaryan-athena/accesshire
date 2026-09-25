import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VoiceAssistant from "@/components/VoiceAssistant";
import LandingPage from "./pages/LandingPage";
import HowItWorks from "./pages/HowItWorks";
import AssessmentLibrary from "./pages/AssessmentLibrary";
import AssessmentRunner from "./pages/AssessmentRunner";
import OnboardingPage from "./pages/OnboardingPage";
import JobMatching from "./pages/JobMatching";
import EmployerPage from "./pages/EmployerPage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/assessment" element={<Navigate to="/assessments" replace />} />
            <Route path="/assessments" element={<AssessmentLibrary />} />
            <Route path="/assessments/:trackId" element={<AssessmentRunner />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/jobs" element={<JobMatching />} />
            <Route path="/employers" element={<EmployerPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
          <VoiceAssistant />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
