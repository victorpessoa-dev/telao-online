import { NextResponse } from "next/server";
import { z } from "zod";
import { getSponsorDetailPayload } from "@/lib/services/sponsors";
import { SPONSOR_SELECT } from "@/lib/repositories/sponsors";
import { NO_STORE_HEADERS, PUBLIC_DETAIL_CACHE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

export async function GET(request, context) {
  try {
    const rate = await checkRateLimit(`public-sponsor-report:${getClientIp(request)}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas consultas. Tente novamente em instantes." },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }

    const params = await context.params;
    const paramValue = params.slug || params.id || "";
    const supabase = await createSupabaseServerClient();
    const url = new URL(request.url);
    const churchId = url.searchParams.get("churchId");
    const parsedChurchId = z.string().uuid().safeParse(churchId);
    if (!parsedChurchId.success) {
      return NextResponse.json(
        { error: "Identificador de igreja inválido" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const page = z.coerce.number().int().min(1).max(1_000_000).catch(1)
      .parse(url.searchParams.get("page") || "1");
    const pageSize = z.coerce.number().int().min(1).max(100).catch(20)
      .parse(url.searchParams.get("pageSize") || "20");

    let sponsor = null;

    if (paramValue && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(paramValue)) {
      const { data: sponsorBySlug, error: sponsorError } = await supabase
        .from("sponsors")
        .select(SPONSOR_SELECT)
        .eq("slug", paramValue.toLowerCase())
        .eq("church_id", parsedChurchId.data)
        .maybeSingle();
      if (!sponsorError && sponsorBySlug) {
        sponsor = sponsorBySlug;
      }
    }

    if (!sponsor) {
      const sponsorId = z.string().uuid().safeParse(paramValue);
      if (sponsorId.success) {
        const { data: sponsorById, error: sponsorError } = await supabase
          .from("sponsors")
          .select(SPONSOR_SELECT)
          .eq("id", sponsorId.data)
          .eq("church_id", parsedChurchId.data)
          .maybeSingle();
        if (!sponsorError && sponsorById) {
          sponsor = sponsorById;
        }
      }
    }

    if (!sponsor) {
      return NextResponse.json(
        { error: "Parceiro não encontrado" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const payload = await getSponsorDetailPayload(
      supabase,
      sponsor.id,
      parsedChurchId.data,
      { page, pageSize },
    );
    if (!payload) {
      return NextResponse.json(
        { error: "Parceiro não encontrado" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(payload, { headers: PUBLIC_DETAIL_CACHE_HEADERS });
  } catch (error) {
    console.error("Falha ao carregar detalhe público do parceiro", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar parceiro" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
