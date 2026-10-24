import { NextResponse } from "next/server";
import { PUBLIC_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

export async function GET(request) {
  try {
    const rate = await checkRateLimit(`public-church-list:${getClientIp(request)}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas consultas. Tente novamente em instantes." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("get_public_churches");
    if (error) throw error;
    return NextResponse.json(
      { churches: data || [] },
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao listar igrejas",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
