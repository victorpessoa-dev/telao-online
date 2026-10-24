/**
 * Creates an administrator invitation. The recipient creates their own church
 * after accepting the invitation, so no church data is collected by staff.
 * This is server-side because it needs the Supabase service-role client.
 */
export async function inviteAdministrator({ adminClient, email, redirectTo }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) throw new Error("Email é obrigatório");

  const destination = String(
    redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || ""}/confirmar-convite`,
  ).trim();
  let inviteRedirectUrl;
  try {
    inviteRedirectUrl = new URL(destination);
  } catch {
    throw new Error("A URL de confirmação do convite não está configurada");
  }

  if (!["http:", "https:"].includes(inviteRedirectUrl.protocol)) {
    throw new Error("A URL de confirmação do convite deve usar HTTP ou HTTPS");
  }

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: inviteRedirectUrl.toString(),
    },
  );
  if (error) throw error;
  if (!data.user?.id)
    throw new Error(
      "O serviço de autenticação não retornou o usuário convidado",
    );

  // An invitation grants administration before the church is created.
  const { error: roleError } = await adminClient.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: { ...(data.user.app_metadata || {}), role: "admin" },
    },
  );
  if (roleError) throw roleError;

  return { id: data.user.id, email: data.user.email };
}
