import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setIsRecovery(true);
      setLinkError(null);
    }
  }, [session]);

  useEffect(() => {
    let isActive = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const recoveryType = searchParams.get("type") ?? hashParams.get("type");
    const tokenHash = searchParams.get("token_hash");
    const authCode = searchParams.get("code");
    const hasRecoveryTokens = Boolean(hashParams.get("access_token")) || Boolean(hashParams.get("refresh_token"));
    const isRecoveryLink = recoveryType === "recovery" || hasRecoveryTokens || Boolean(tokenHash) || Boolean(authCode);

    const markRecoveryReady = () => {
      if (!isActive) return;
      setIsRecovery(true);
      setLinkError(null);
      if (window.location.hash || window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    const markRecoveryError = (message: string) => {
      if (!isActive) return;
      setLinkError(message);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY" || (isRecoveryLink && nextSession)) {
        markRecoveryReady();
      }
    });

    const timeoutId = window.setTimeout(async () => {
      if (!isActive) return;
      const { data: { session: pendingSession } } = await supabase.auth.getSession();
      if (!pendingSession) {
        markRecoveryError("This reset link is invalid or has expired.");
      }
    }, 3000);

    const resolveRecovery = async () => {
      try {
        if (!isRecoveryLink) {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            markRecoveryReady();
            return;
          }
          markRecoveryError("This reset link is missing recovery data.");
          return;
        }

        if (recoveryType === "recovery" && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;
        }

        const { data: { session: recoverySession } } = await supabase.auth.getSession();
        if (recoverySession) {
          markRecoveryReady();
        }
      } catch (err: unknown) {
        markRecoveryError(
          err instanceof Error ? err.message : "This reset link is invalid or has expired.",
        );
      }
    };

    void resolveRecovery();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Link to="/">
            <img alt="ValueTempo" className="h-8 mx-auto mb-6" src={ValueTempoLogo} />
          </Link>
          <h1 className="text-2xl font-bold">
            {linkError ? "Reset link unavailable" : "Verifying reset link…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {linkError ?? "If the link is valid you'll be prompted to set a new password momentarily."}
          </p>
          {linkError ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/">
            <img alt="ValueTempo" className="h-8 mx-auto mb-6" src={ValueTempoLogo} />
          </Link>
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-password">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirm password</label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
