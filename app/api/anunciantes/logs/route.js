import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";
import { NO_STORE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { normalizeSponsorLogPayload } from "@/lib/services/sponsor-logs";

export async function POST(request) {
  try {
    const rate = await checkRateLimit(`sponsor-logs:${getClientIp(request)}`, {
      limit: 120,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }

    const body = await request.json();
    const logs = normalizeSponsorLogPayload(body);
    const supabase = await createSupabaseServerClient();

    const { data: processed, error } = await supabase.rpc(
      "log_sponsor_impressions",
      {
        logs_arg: logs.map((log) => ({
          sponsor_id: log.sponsorId,
          displayed_at: log.displayedAt,
          duration_seconds: log.durationSeconds,
          source: log.source,
        })),
      },
    );

    if (error) throw error;

    return NextResponse.json(
      { ok: true, processed: Number(processed) || 0 },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Payload inválido", issues: error.issues },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao registrar exibição",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
