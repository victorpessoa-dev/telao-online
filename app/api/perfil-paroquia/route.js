import { NextResponse } from "next/server";
import { z } from "zod";
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const emptyProfile = {
  parishName: "",
  parishCity: "",
  parishLogoUrl: "/brand/logo-telao-online.png",
  parishCoverUrl: "",
  parishSocialLinks: [],
  parishSponsorshipGuidelines: "",
};

const profileUpdateSchema = z.object({
  churchId: z.string().uuid(),
  key: z.enum([
    "parishName",
    "parishCity",
    "parishLogoUrl",
    "parishCoverUrl",
    "parishSocialLinks",
    "parishSponsorshipGuidelines",
  ]),
  value: z.unknown(),
});

export async function GET() {
  // Church-specific branding comes from the public church endpoints. This
  // legacy route stays safe for the landing page without exposing app_settings.
  return NextResponse.json(
    { ...emptyProfile, profile: emptyProfile },
    { headers: PUBLIC_CACHE_HEADERS },
  );
}

export async function POST(request) {
  try {
    const rate = await checkRateLimit(`parish-profile:${getClientIp(request)}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas alterações em pouco tempo. Tente novamente." },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }
    const payload = profileUpdateSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    // RLS enforces ownership too; this makes the API boundary explicit.
    const { data: church, error: churchError } = await supabase
      .from("churches")
      .select("id")
      .eq("id", payload.churchId)
      .eq("admin_id", user.id)
      .maybeSingle();
    if (churchError) throw churchError;
    if (!church)
      return NextResponse.json(
        { error: "Igreja não encontrada" },
        { status: 404, headers: NO_STORE_HEADERS },
      );

    const value =
      typeof payload.value === "string" ? payload.value.trim() : payload.value;
    const updateByKey = {
      parishName: { name: value },
      parishCity: { city: value },
      parishLogoUrl: { logo_url: value || null },
      parishCoverUrl: { cover_url: value || null },
      parishSocialLinks: {
        social_links: Array.isArray(value) ? value : [],
      },
      parishSponsorshipGuidelines: {
        sponsorship_guidelines: value || "",
      },
    };

    if (
      (payload.key === "parishName" || payload.key === "parishCity") &&
      !value
    ) {
      return NextResponse.json(
        { error: "Nome e cidade da igreja são obrigatórios" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { error } = await supabase
      .from("churches")
      .update(updateByKey[payload.key])
      .eq("id", payload.churchId);
    if (error) throw error;

    return NextResponse.json(
      { profile: { [payload.key]: payload.value } },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados de perfil inválidos", issues: error.issues },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao salvar configuração",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
