import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request) {
  const rate = await checkRateLimit(`church-slug-check:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { available: false, error: "Muitas consultas. Tente novamente em instantes." },
      { status: 429, headers: NO_STORE_HEADERS },
    );
  }
  const slug =
    new URL(request.url).searchParams.get("slug")?.trim().toLowerCase() || "";

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { available: false, error: "Slug inválido" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("is_church_slug_available", {
      slug_arg: slug,
    });
    if (error) throw error;
    return NextResponse.json(
      { available: Boolean(data) },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível validar o slug",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
