import { NextResponse } from "next/server";
import { PUBLIC_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

export async function GET(request) {
  try {
    const rate = await checkRateLimit(`public-church:${getClientIp(request)}`, {
      limit: 120,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas consultas. Tente novamente em instantes." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }
    // Extract slug from pathname
    const { pathname } = new URL(request.url);
    const segments = pathname.split("/").filter((s) => s.length > 0);
    const slug = segments[segments.length - 1]; // último segmento

    if (!slug) {
      return NextResponse.json(
        { error: "Slug não especificado" },
        { status: 400 },
      );
    }

    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
      .rpc("get_public_church_page", { slug_arg: slug })
      .maybeSingle();

    if (!data?.church) {
      return NextResponse.json(
        { error: "Igreja não encontrada", notFound: true },
        { status: 404, headers: PUBLIC_CACHE_HEADERS },
      );
    }

    if (error) {
      if (error.code === "PGRST116") {
        // Igreja não encontrada
        return NextResponse.json(
          { error: "Igreja não encontrada", notFound: true },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json(
      data,
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao buscar igreja",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
