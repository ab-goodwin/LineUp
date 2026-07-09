import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CalendarPage from "@/pages/Calendar";
import Library from "@/pages/Library";
import Profile from "@/pages/Profile";
import Buddies from "@/pages/Buddies";
import Achievements from "@/pages/Achievements";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";
import ResetPassword from "@/pages/ResetPassword";
import { Loader2 } from "lucide-react";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import { InstallLineUpPrompt } from "@/components/InstallLineUpPrompt";

function AnimatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/library" component={Library} />
      <Route path="/profile" component={Profile} />
      <Route path="/buddies" component={Buddies} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const showHeader = location === "/";

  // Public route: password recovery link lands here regardless of auth state
  if (location === "/reset-password") {
    return <ResetPassword />;
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
    <>
    <AuthPage />
    <InstallLineUpPrompt />
    <Toaster />
    </>
    );
  }

  return (
  <div className="min-h-screen bg-background font-sans">
    <OnboardingCarousel userId={user.id} />
    {showHeader && <Header />}
    <main>
      <AnimatedRoutes />
    </main>
    <Navigation />
    <Toaster />
  </div>
);
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppInner />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
