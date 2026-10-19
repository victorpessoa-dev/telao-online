import { withTimeout } from "@/lib/utils/async";

export function getAuthErrorMessage(
  cause,
  fallback = "Não foi possível concluir a solicitação. Tente novamente.",
) {
  const code = String(cause?.code || "").toLowerCase();
  const message = String(cause?.message || "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "Não foi possível entrar com este email e senha. Confira os dados ou redefina sua senha.";
  }

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "Confirme seu email antes de entrar. Se necessário, solicite um novo link de confirmação.";
  }

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (
    code === "otp_expired" ||
    code === "access_denied" ||
    message.includes("expired") ||
    message.includes("invalid token") ||
    message.includes("invalid grant")
  ) {
    return "Este link é inválido ou expirou. Solicite um novo link para continuar.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("networkerror")
  ) {
    return "Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.";
  }

  return fallback;
}

export function getSafeRedirectPath(redirectToParam, fallback = "/admin") {
  if (
    typeof redirectToParam === "string" &&
    redirectToParam.startsWith("/") &&
    !redirectToParam.startsWith("//") &&
    !redirectToParam.includes("\\")
  ) {
    return redirectToParam;
  }

  return fallback;
}

export async function signInWithPasswordFlow({
  supabase,
  email,
  password,
  router,
  redirectTo = "/admin",
}) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    }),
    15_000,
    "A conexão demorou demais. Verifique a internet e tente novamente.",
  );
  if (error) throw error;

  router.replace(redirectTo);
  router.refresh();
}

export async function requestPasswordReset({ supabase, email, redirectTo }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });
  if (error) throw error;
}

export async function acceptInviteAndSetPassword({ supabase, password }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw new Error(
      "O convite é inválido ou expirou. Solicite um novo convite.",
    );
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return user;
}

export async function exchangeAuthCode({ supabase, code }) {
  if (!code) return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOutFlow(supabase) {
  await supabase.auth.signOut();
}
