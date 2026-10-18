import { NextResponse } from "next/server";
import { PUBLIC_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabasePublicClient } from "@/services/supabase/server";

export async function GET() {
  try {
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
