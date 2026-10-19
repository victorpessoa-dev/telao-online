import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";
import { NO_STORE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";

export async function POST(request, { params }) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json(
      { error: "Slug não especificado" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const rate = await checkRateLimit(
    `public-church-visit:${getClientIp(request)}:${slug}`,
    { limit: 1, windowMs: 30 * 60_000 },
  );

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: true, counted: false },
      { headers: NO_STORE_HEADERS },
    );
  }

  try {
    const { data, error } = await createSupabasePublicClient().rpc(
      "record_public_church_visit",
      { slug_arg: slug },
    );
    if (error) throw error;

    return NextResponse.json(
      { ok: true, counted: true, views: Number(data) || 0 },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a visita",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
