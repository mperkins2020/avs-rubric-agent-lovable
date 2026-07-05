import { useState, useRef } from "react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  try {
    // Must be a same-origin relative path starting with a single slash.
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = "0x4AAAAAACfM3KdRLh5K8OGh";

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "live.com", "msn.com", "me.com", "gmx.com", "inbox.com",
];

const WHITELISTED_EMAILS = [
  "mlhperkins@gmail.com",
];

function isWorkEmail(email: string): boolean {
  if (WHITELISTED_EMAILS.includes(email.toLowerCase())) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (!isLogin && !isWorkEmail(trimmedEmail)) {
      toast.error("Please use a work email address to sign up.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    // Require CAPTCHA for signup only
    if (!isLogin) {
      if (!turnstileToken) {
        toast.error("Please complete the CAPTCHA verification.");
        return;
      }

      // Verify the Turnstile token server-side
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const verifyRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/verify-turnstile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": anonKey },
          body: JSON.stringify({ token: turnstileToken }),
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toast.error("CAPTCHA verification failed. Please try again.");
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        navigate(nextPath);
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}${nextPath}` },
        });
        if (error) throw error;
        toast.success("Check your email for a confirmation link.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
      if (!isLogin) {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/">
            <img
              alt="ValueTempo"
              className="h-8 mx-auto mb-6"
              src={ValueTempoLogo}
            />
          </Link>
          <h1 className="text-2xl font-bold">
            {isLogin ? "Sign in" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin
              ? "Welcome back"
              : "Use your work email to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Work email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
                  disabled={sendingReset}
                  onClick={async () => {
                    if (sendingReset) return;

                    const trimmedEmail = email.trim().toLowerCase();
                    if (!trimmedEmail) {
                      toast.error("Enter your email first, then click Forgot password.");
                      return;
                    }

                    setSendingReset(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      setResetSent(true);
                      toast.success("Password reset link sent — check your email.");
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "";
                      if (msg.toLowerCase().includes("rate limit")) {
                        toast.error("Too many attempts — please wait a minute and try again.");
                      } else {
                        toast.error(msg || "Could not send reset email");
                      }
                    } finally {
                      setSendingReset(false);
                    }
                  }}
                >
                  {sendingReset ? "Sending…" : "Forgot password?"}
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {resetSent && isLogin && (
            <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-foreground flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span>We sent a reset link to <strong>{email.trim().toLowerCase()}</strong>. Check your inbox (and spam) and click the link to set a new password.</span>
            </div>
          )}

          {!isLogin && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => {
                  setTurnstileToken(null);
                  toast.error("CAPTCHA failed to load. Please refresh.");
                }}
              />
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {isLogin ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: `${window.location.origin}${nextPath}`,
            });
            if (result.error) {
              toast.error(result.error.message || "Google sign-in failed");
              return;
            }
            if (result.redirected) return;
            navigate(nextPath);
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => { setIsLogin(!isLogin); setTurnstileToken(null); turnstileRef.current?.reset(); }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
