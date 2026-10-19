"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";
import {
  acceptInviteAndSetPassword,
  exchangeAuthCode,
  getAuthErrorMessage,
  requestPasswordReset,
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

function Message({ children }) {
  return children ? (
    <p
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {children}
    </p>
  ) : null;
}

function BackToHome() {
  return (
    <Link href="/" className="back-link mb-3">
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}

function getAuthRedirectError() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("error") !== "access_denied") return "";

  return "O Supabase bloqueou o link de acesso. Autorize esta URL em Authentication > URL Configuration > Redirect URLs e solicite um novo link.";
}

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset({
        supabase: createSupabaseBrowserClient(),
        email,
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setSent(true);
    } catch (cause) {
      setError(getAuthErrorMessage(cause, "Não foi possível enviar o email."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <BackToHome />
      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Enviaremos um link para o email cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Message>{error}</Message>
            {sent ? (
              <p className="text-sm text-emerald-700">
                Se o email estiver cadastrado, enviamos as instruções para{" "}
                <strong>{email}</strong>. Verifique também a caixa de spam.
              </p>
            ) : null}
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enviar link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SetPasswordForm({ invitation = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectError = getAuthRedirectError();
    if (redirectError) {
      setError(redirectError);
      return undefined;
    }

    const supabase = createSupabaseBrowserClient();
    exchangeAuthCode({ supabase, code: searchParams.get("code") })
      .then(() => supabase.auth.getUser())
      .then(({ data }) => {
        if (!data.user) throw new Error("O link é inválido ou expirou.");
        setReady(true);
      })
      .catch((cause) =>
        setError(
          getAuthErrorMessage(cause, "Não foi possível validar o link."),
        ),
      );
  }, [searchParams]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8)
      return setError("Use uma senha com pelo menos 8 caracteres.");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      await acceptInviteAndSetPassword({
        supabase: createSupabaseBrowserClient(),
        password,
      });
      router.replace(invitation ? "/configurar-igreja" : "/admin");
      router.refresh();
    } catch (cause) {
      setError(getAuthErrorMessage(cause, "Não foi possível salvar a senha."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <BackToHome />
      <Card>
        <CardHeader>
          <CardTitle>
            {invitation ? "Confirmar convite" : "Criar nova senha"}
          </CardTitle>
          <CardDescription>
            {invitation
              ? "Defina sua senha para ativar o acesso administrativo."
              : "Defina sua nova senha para continuar."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready && !error ? (
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando link...
            </p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmar senha</Label>
                <Input
                  id="confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                />
              </div>
              <Message>{error}</Message>
              <Button className="w-full" disabled={loading || !ready}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
