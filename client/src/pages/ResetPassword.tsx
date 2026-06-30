import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import logoShort from "@assets/LineUp_Stacked_tagline_1778180551921.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery link in the URL and creates a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => setLocation("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Could not update password. Please request a new link.");
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
          <h2 className="text-lg font-semibold text-foreground mb-1">Set a new password</h2>

          {checking ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : done ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5 mt-2" data-testid="reset-success">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">Password updated! Redirecting to sign in…</p>
            </div>
          ) : !hasSession ? (
            <div className="mt-2 space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5" data-testid="reset-invalid">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">This reset link is invalid or has expired. Please request a new one.</p>
              </div>
              <Button onClick={() => setLocation("/")} className="w-full rounded-xl" data-testid="button-reset-back">Back to sign in</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5" data-testid="reset-error">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-password">New Password</Label>
                <Input id="reset-password" data-testid="input-reset-password" type="password" placeholder="Min. 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} className="rounded-xl" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">Re-enter Password</Label>
                <Input id="reset-confirm" data-testid="input-reset-confirm" type="password" placeholder="Must match above" value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} className="rounded-xl" autoComplete="new-password" />
              </div>
              <Button type="submit" data-testid="button-reset-submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
