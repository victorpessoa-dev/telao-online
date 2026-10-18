"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  createSupabaseBrowserClient,
  setDesktopRememberSession,
} from "@/services/supabase/browser";
import {
  getSafeRedirectPath,
  signInWithPasswordFlow,
} from "@/lib/services/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppFooter from "@/components/shared/app-footer";
import PublicNavbar from "@/components/shared/public-navbar";
import BrandLogo from "@/components/shared/brand-logo";

const loginErrorMessages = {
  missing_supabase_env:
    "A configuração do Supabase não foi encontrada no servidor.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get("redirectTo"));
  const accessError = loginErrorMessages[searchParams.get("error")] || "";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!window.vPlaycastDesktop) {
      router.replace("/");
      return undefined;
    }
    let active = true;

    async function restoreDesktopSession() {
      try {
        const [savedRemember, { data }] = await Promise.all([
          window.vPlaycastDesktop.auth.getRemember(),
          createSupabaseBrowserClient().auth.getSession(),
        ]);
        if (!active) return;
        setRemember(savedRemember);
        if (data.session) router.replace(redirectTo);
      } catch {
        // A damaged or expired local session must leave the login form usable.
      }
    }

    restoreDesktopSession();
    return () => {
      active = false;
    };
  }, [redirectTo, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await setDesktopRememberSession(remember);
      const supabase = createSupabaseBrowserClient();
      await signInWithPasswordFlow({
        supabase,
        email,
        password,
        router,
        redirectTo,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao entrar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar showLogin={false} />
      <div className="relative flex flex-1 items-center justify-center p-6">
        <Link
          href="/"
          className="absolute left-4 top-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline sm:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <BrandLogo className="mx-auto h-14 w-56" />
            <CardTitle>Acessar painel administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {typeof window !== "undefined" && window.vPlaycastDesktop ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Manter conectado neste computador
                </label>
              ) : null}

              {accessError ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {accessError}
                </div>
              ) : null}

              {error ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <Link
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
                href="/esqueci-senha"
              >
                Esqueci minha senha
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
