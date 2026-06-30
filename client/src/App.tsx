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
import { Loader2, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const WELCOME_KEY = "lineup_welcome_seen";

function WelcomeDialog({ userId }: { userId: number }) {
  const storageKey = `${WELCOME_KEY}_${userId}`;
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [storageKey]);

  const handleClose = () => {
    if (dontShow) localStorage.setItem(storageKey, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="rounded-2xl max-w-sm mx-auto p-6 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-foreground text-center">
            Welcome to <span className="text-primary">LineUp</span>!
          </h2>

          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            This app is built to help you track your dance journey, whether you're brand new or competing on an advanced level.
          </p>

          <p className="text-sm font-semibold text-foreground">Here's the basics:</p>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-bold text-foreground">1. Log Your Dance Sessions</p>
              <p className="text-muted-foreground leading-relaxed pl-3 mt-0.5">
                Add the dances you do to your library and easily check them off as you do them. Add the location and the days you went dancing to track even more dance stats.
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">2. Track Your Favorites</p>
              <p className="text-muted-foreground leading-relaxed pl-3 mt-0.5">
                Your most danced songs and dances will start showing up automatically as you enter in your sessions. LineUp will take care of all the hard parts!
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">3. Build Your Stats</p>
              <p className="text-muted-foreground leading-relaxed pl-3 mt-0.5">
                The more sessions and dances you log, the more accurate your stats will become. You can see your streaks, totals, venues, styles and achievements change in real time.
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">4. Challenge Your Friends</p>
              <p className="text-muted-foreground leading-relaxed pl-3 mt-0.5">
                LineUp also lets you challenge your friends to Showdowns, or group dance battles to see who can do the most dances in a set time period! May the best dancer win!
              </p>
            </div>
          </div>

          <p className="text-center text-sm italic text-muted-foreground pt-1">
            No Pressure, No Perfection
          </p>

          <Button
            className="w-full rounded-xl font-semibold text-base gap-2 mt-2"
            onClick={handleClose}
            data-testid="button-welcome-lets-dance"
          >
            <Heart className="w-4 h-4" fill="currentColor" />
            Let's Dance!
          </Button>

          <div className="flex items-center gap-2 justify-center pt-1">
            <Checkbox
              id="dont-show-again"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(!!v)}
              data-testid="checkbox-dont-show-again"
            />
            <label
              htmlFor="dont-show-again"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Do not show again
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <WelcomeDialog userId={user.id} />
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
