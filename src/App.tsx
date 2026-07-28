import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { Activity, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "@/contexts/FilterContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking secure dashboard access…
      </div>
    </main>
  );
}

type SignInScreenProps = {
  onAuthenticated: (session: Session) => void;
};

function SignInScreen({ onAuthenticated }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError || !data.session) {
      setError("Sign-in failed. Verify your email and password.");
      return;
    }

    onAuthenticated(data.session);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Portfolio Analytics</h1>
            <p className="text-sm text-muted-foreground">Admin access required</p>
          </div>
        </div>

        <div className="mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>Visitor and recruiter data is visible only to authorized analytics administrators.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium" htmlFor="analytics-email">
            <span>Email</span>
            <Input
              id="analytics-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={submitting}
            />
          </label>

          <label className="block space-y-2 text-sm font-medium" htmlFor="analytics-password">
            <span>Password</span>
            <Input
              id="analytics-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={submitting}
            />
          </label>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}

type AccessDeniedScreenProps = {
  onSignOut: () => Promise<void>;
};

function AccessDeniedScreen({ onSignOut }: AccessDeniedScreenProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await onSignOut();
    setSigningOut(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated sm:p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This account is not authorized to view portfolio analytics. Sign in with the configured analytics administrator account.
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={handleSignOut} disabled={signingOut}>
          {signingOut && <Loader2 className="animate-spin" aria-hidden="true" />}
          Sign out
        </Button>
      </section>
    </main>
  );
}

function AnalyticsAccessGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setAccess("checking");
      return;
    }

    let active = true;
    setAccess("checking");

    void supabase
      .from("analytics_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) {
          setAccess(!error && data ? "allowed" : "denied");
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) return <LoadingScreen />;
  if (!session) return <SignInScreen onAuthenticated={setSession} />;
  if (access === "checking") return <LoadingScreen />;
  if (access === "denied") return <AccessDeniedScreen onSignOut={handleSignOut} />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AnalyticsAccessGate>
        <FilterProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FilterProvider>
      </AnalyticsAccessGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
