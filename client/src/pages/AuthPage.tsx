import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import logoShort from "@assets/LineUp_Stacked_tagline_1778180551921.png";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [registerForm, setRegisterForm] = useState({
    firstName: "", lastName: "", username: "", password: "", confirmPassword: "",
  });
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.username || !loginForm.password) {
      setLoginError("Please enter your username and password.");
      return;
    }
    setIsLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
      setLocation("/");
    } catch (err: any) {
      setLoginError(err.message || "Incorrect username or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess(false);
    if (!registerForm.firstName.trim()) { setRegisterError("First name is required."); return; }
    if (!registerForm.username.trim() || registerForm.username.trim().length < 3) { setRegisterError("Username must be at least 3 characters."); return; }
    if (!registerForm.password || registerForm.password.length < 6) { setRegisterError("Password must be at least 6 characters."); return; }
    if (registerForm.password !== registerForm.confirmPassword) { setRegisterError("Passwords do not match. Please try again."); return; }
    setIsLoading(true);
    try {
      await register(registerForm.username.trim(), registerForm.password, registerForm.firstName.trim(), registerForm.lastName.trim() || undefined);
      setRegisterSuccess(true);
      setRegisterForm({ firstName: "", lastName: "", username: "", password: "", confirmPassword: "" });
      setTimeout(() => { setActiveTab("login"); setRegisterSuccess(false); }, 1800);
    } catch (err: any) {
      setRegisterError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-8 flex justify-center w-full">
          <img src={logoShort} alt="LineUp" className="h-56 object-contain" />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6 bg-secondary/40 rounded-xl">
              <TabsTrigger value="login" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Create Account</TabsTrigger>
            </TabsList>

            {/* SIGN IN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5" data-testid="login-error">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">{loginError}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" data-testid="input-login-username" placeholder="your_username" value={loginForm.username} onChange={e => { setLoginForm(p => ({ ...p, username: e.target.value })); setLoginError(""); }} className="rounded-xl" autoComplete="username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" data-testid="input-login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={e => { setLoginForm(p => ({ ...p, password: e.target.value })); setLoginError(""); }} className="rounded-xl" autoComplete="current-password" />
                </div>
                <Button type="submit" data-testid="button-login" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* CREATE ACCOUNT */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                {registerError && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5" data-testid="register-error">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">{registerError}</p>
                  </div>
                )}
                {registerSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5" data-testid="register-success">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">Account created! Redirecting to sign in…</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-firstname">First Name <span className="text-destructive">*</span></Label>
                    <Input id="register-firstname" data-testid="input-register-firstname" placeholder="Jessie" value={registerForm.firstName} onChange={e => { setRegisterForm(p => ({ ...p, firstName: e.target.value })); setRegisterError(""); }} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-lastname">Last Name</Label>
                    <Input id="register-lastname" data-testid="input-register-lastname" placeholder="Smith" value={registerForm.lastName} onChange={e => setRegisterForm(p => ({ ...p, lastName: e.target.value }))} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-username">Username <span className="text-destructive">*</span></Label>
                  <Input id="register-username" data-testid="input-register-username" placeholder="your_username" value={registerForm.username} onChange={e => { setRegisterForm(p => ({ ...p, username: e.target.value })); setRegisterError(""); }} className="rounded-xl" autoComplete="username" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-password">Password <span className="text-destructive">*</span></Label>
                  <Input id="register-password" data-testid="input-register-password" type="password" placeholder="Min. 6 characters" value={registerForm.password} onChange={e => { setRegisterForm(p => ({ ...p, password: e.target.value })); setRegisterError(""); }} className="rounded-xl" autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-confirm">Re-enter Password <span className="text-destructive">*</span></Label>
                  <Input id="register-confirm" data-testid="input-register-confirm" type="password" placeholder="Must match above" value={registerForm.confirmPassword} onChange={e => { setRegisterForm(p => ({ ...p, confirmPassword: e.target.value })); setRegisterError(""); }} className="rounded-xl" autoComplete="new-password" />
                </div>
                <Button type="submit" data-testid="button-register" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 mt-1" disabled={isLoading || registerSuccess}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
