import { NextResponse } from "next/server";
import { PUBLIC_TELAO_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";
import { isValidChurchSlug, normalizeChurchSlug } from "@/lib/utils/church-slug";

/**
 * Delivers the cacheable playlist and design payload for a public display.
 */
export async function GET(request, { params }) {
  const rate = await checkRateLimit(`public-telao:${getClientIp(request)}`, {
    limit: 240,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas consultas. Tente novamente em instantes." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { slug: rawSlug } = await params;
  const slug = normalizeChurchSlug(rawSlug);

  if (!isValidChurchSlug(slug)) {
    return NextResponse.json(
      { error: "Igreja não encontrada" },
      { status: 404, headers: PUBLIC_TELAO_CACHE_HEADERS },
    );
  }

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .rpc("get_public_telao_payload", { slug_arg: slug })
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Igreja não encontrada" },
        { status: 404, headers: PUBLIC_TELAO_CACHE_HEADERS },
      );
    }

    return NextResponse.json(data, { headers: PUBLIC_TELAO_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao carregar telão",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
