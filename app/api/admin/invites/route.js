import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteAdministrator } from "@/lib/services/provisioning";
import { createSupabaseAdminClient } from "@/services/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const inviteSchema = z.object({ email: z.string().trim().email().max(320) });

export async function POST(request) {
  const rate = await checkRateLimit(`admin-invite:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 },
    );
  }
  const configuredKey = process.env.PROVISIONING_API_KEY;
  const providedKey = request.headers.get("x-provisioning-key");
  if (!configuredKey || !providedKey || providedKey !== configuredKey) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = inviteSchema.parse(await request.json());
    const emailRate = await checkRateLimit(`admin-invite-email:${body.email.toLowerCase()}`, {
      limit: 3,
      windowMs: 24 * 60 * 60_000,
    });
    if (!emailRate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 },
      );
    }
    const administrator = await inviteAdministrator({
      adminClient: createSupabaseAdminClient(),
      email: body.email,
      // Use the current public origin so the invitation never falls back to
      // Supabase's site URL (which may be the marketing landing page).
      redirectTo: new URL(
        "/confirmar-convite",
        request.nextUrl.origin,
      ).toString(),
    });
    return NextResponse.json({ administrator }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o convite",
      },
      { status: 400 },
    );
  }
}
