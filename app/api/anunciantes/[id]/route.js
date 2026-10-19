import { NextResponse } from "next/server";
import { z } from "zod";
import { getSponsorDetailPayload } from "@/lib/services/sponsors";
import {
  NO_STORE_HEADERS,
  PUBLIC_DETAIL_CACHE_HEADERS,
} from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const sponsorId = z.string().uuid().safeParse(id);
    if (!sponsorId.success)
      return NextResponse.json(
        { error: "Identificador de anunciante inválido" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    const supabase = await createSupabaseServerClient();
    const churchId = request?.url
      ? new URL(request.url).searchParams.get("churchId")
      : null;
    const parsedChurchId = z.string().uuid().safeParse(churchId);
    if (!parsedChurchId.success)
      return NextResponse.json(
        { error: "Identificador de igreja inválido" },
        { status: 400, headers: NO_STORE_HEADERS },
      );

    const params = request?.url ? new URL(request.url).searchParams : null;
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(1_000_000)
      .catch(1)
      .parse(params?.get("page") || "1");
    const pageSize = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .catch(20)
      .parse(params?.get("pageSize") || "20");

    if (churchId) {
      const { data: sponsor, error: sponsorError } = await supabase
        .from("sponsors")
        .select("id")
        .eq("id", id)
        .eq("church_id", churchId)
        .maybeSingle();

      if (sponsorError) throw sponsorError;
      if (!sponsor)
        return NextResponse.json(
          { error: "Anunciante não encontrado" },
          { status: 404, headers: NO_STORE_HEADERS },
        );
    }

    const payload = await getSponsorDetailPayload(
      supabase,
      sponsorId.data,
      parsedChurchId.data,
      { page, pageSize },
    );
    if (!payload)
      return NextResponse.json(
        { error: "Anunciante não encontrado" },
        { status: 404, headers: NO_STORE_HEADERS },
      );

    return NextResponse.json(payload, { headers: PUBLIC_DETAIL_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar anunciante",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
