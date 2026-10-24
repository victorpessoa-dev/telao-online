import { NextResponse } from "next/server";
import { PUBLIC_TELAO_VERSION_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request, { params }) {
  const rate = await checkRateLimit(`public-telao-version:${getClientIp(request)}`, {
    limit: 360,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas consultas. Tente novamente em instantes." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
  }

  try {
    const { data, error } = await createSupabasePublicClient()
      .rpc("get_public_telao_version", { slug_arg: slug })
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
    }
    return NextResponse.json(data, { headers: PUBLIC_TELAO_VERSION_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao consultar versão" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
