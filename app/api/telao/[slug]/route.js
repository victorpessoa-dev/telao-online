import { NextResponse } from "next/server";
import { PUBLIC_TELAO_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(_request, { params }) {
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug || "").trim().toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
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
