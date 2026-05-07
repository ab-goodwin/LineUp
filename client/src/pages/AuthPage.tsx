import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import logoShort from "@assets/LineUp_Stacked_tagline_1778180551921.png";

type ForgotStep = "phone" | "code" | "reset";
type ResetType = "password" | "username";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  // Register state
  const [registerForm, setRegisterForm] = useState({
    firstName: "", lastName: "", username: "", phoneNumber: "", password: "", confirmPassword: "",
  });
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep | null>(null);
  const [resetType, setResetType] = useState<ResetType>("password");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewValue, setForgotNewValue] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

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
      // Also save phone if provided
      if (registerForm.phoneNumber.trim()) {
        await fetch("/api/profile/phone", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: registerForm.phoneNumber.trim() }),
          credentials: "include",
        });
      }
      setRegisterSuccess(true);
      setRegisterForm({ firstName: "", lastName: "", username: "", phoneNumber: "", password: "", confirmPassword: "" });
      setTimeout(() => { setActiveTab("login"); setRegisterSuccess(false); }, 1800);
    } catch (err: any) {
      setRegisterError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotPhone.trim()) { setForgotError("Please enter your phone number."); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: forgotPhone.trim(), resetType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        setForgotError(err.message || "Could not send code. Check your phone number.");
        return;
      }
      setForgotStep("code");
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotCode.trim() || forgotCode.trim().length !== 6) { setForgotError("Please enter the 6-digit code."); return; }
    if (!forgotNewValue.trim()) { setForgotError(`Please enter a new ${resetType === "password" ? "password" : "username"}.`); return; }
    if (resetType === "password") {
      if (forgotNewValue.length < 6) { setForgotError("Password must be at least 6 characters."); return; }
      if (forgotNewValue !== forgotConfirm) { setForgotError("Passwords do not match."); return; }
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: forgotPhone.trim(), code: forgotCode.trim(), resetType, newValue: forgotNewValue.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        setForgotError(err.message || "Invalid or expired code.");
        return;
      }
      setForgotSuccess(`Your ${resetType === "password" ? "password" : "username"} has been updated! Please sign in.`);
      setTimeout(() => {
        setForgotStep(null);
        setForgotSuccess("");
        setForgotPhone(""); setForgotCode(""); setForgotNewValue(""); setForgotConfirm("");
      }, 2200);
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- FORGOT FLOW ----
  if (forgotStep !== null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <img src={logoShort} alt="LineUp" className="h-24 mx-auto object-contain" />
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                if (forgotStep === "code") setForgotStep("phone");
                else { setForgotStep(null); setForgotError(""); }
              }}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="font-display text-lg text-foreground">
                {forgotStep === "phone" ? "Recover Account" : forgotStep === "code" ? "Enter Code" : "Reset " + (resetType === "password" ? "Password" : "Username")}
              </h2>
            </div>

            {forgotError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{forgotError}</p>
              </div>
            )}
            {forgotSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">{forgotSuccess}</p>
              </div>
            )}

            {forgotStep === "phone" && (
              <form onSubmit={handleForgotSend} className="space-y-4">
                <div className="space-y-2">
                  <Label>What would you like to reset?</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={resetType === "password" ? "default" : "outline"} className="flex-1 rounded-xl text-sm" onClick={() => setResetType("password")}>Password</Button>
                    <Button type="button" variant={resetType === "username" ? "default" : "outline"} className="flex-1 rounded-xl text-sm" onClick={() => setResetType("username")}>Username</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-phone">Phone Number</Label>
                  <Input id="forgot-phone" type="tel" placeholder="+1 555 000 0000" className="rounded-xl" value={forgotPhone} onChange={e => { setForgotPhone(e.target.value); setForgotError(""); }} />
                  <p className="text-xs text-muted-foreground">We'll send a 6-digit code to this number.</p>
                </div>
                <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
                </Button>
              </form>
            )}

            {forgotStep === "code" && (
              <form onSubmit={handleForgotReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-code">6-Digit Code</Label>
                  <Input id="forgot-code" placeholder="123456" maxLength={6} className="rounded-xl text-center text-xl tracking-[0.5em] font-mono" value={forgotCode} onChange={e => { setForgotCode(e.target.value.replace(/\D/g, "")); setForgotError(""); }} />
                  <p className="text-xs text-muted-foreground">Code sent to {forgotPhone}. Check your messages.</p>
                </div>
                {resetType === "password" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" placeholder="Min. 6 characters" className="rounded-xl" value={forgotNewValue} onChange={e => { setForgotNewValue(e.target.value); setForgotError(""); }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" type="password" placeholder="Must match above" className="rounded-xl" value={forgotConfirm} onChange={e => { setForgotConfirm(e.target.value); setForgotError(""); }} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="new-username">New Username</Label>
                    <Input id="new-username" placeholder="your_new_username" className="rounded-xl" value={forgotNewValue} onChange={e => { setForgotNewValue(e.target.value); setForgotError(""); }} />
                  </div>
                )}
                <Button type="submit" className="w-full rounded-xl font-semibold" disabled={isLoading || !!forgotSuccess}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Reset ${resetType === "password" ? "Password" : "Username"}`}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- NORMAL LOGIN / REGISTER ----
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src={logoShort} alt="LineUp" className="h-28 object-contain" />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
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
                <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline pt-1" onClick={() => { setForgotStep("phone"); setForgotError(""); }}>
                  Forgot username or password?
                </button>
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
                  <Label htmlFor="register-phone">Phone Number</Label>
                  <Input id="register-phone" type="tel" placeholder="+1 555 000 0000 (for account recovery)" value={registerForm.phoneNumber} onChange={e => setRegisterForm(p => ({ ...p, phoneNumber: e.target.value }))} className="rounded-xl" />
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
