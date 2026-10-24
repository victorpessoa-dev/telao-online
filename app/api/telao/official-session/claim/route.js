import { NextResponse } from "next/server";
import { z } from "zod";
import { NO_STORE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(32).max(256),
  clientId: z.string().uuid(),
});

export async function POST(request) {
  try {
    const { sessionId, token, clientId } = bodySchema.parse(await request.json());
    const [ipRate, sessionRate] = await Promise.all([
      checkRateLimit(`official-display-claim:${getClientIp(request)}`, {
        limit: 20,
        windowMs: 5 * 60_000,
      }),
      checkRateLimit(`official-display-claim-session:${sessionId}`, {
        limit: 5,
        windowMs: 5 * 60_000,
      }),
    ]);
    if (!ipRate.allowed || !sessionRate.allowed) {
      return NextResponse.json(
        { error: "Não foi possível ativar este telão" },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("claim_official_display_session", {
      session_id_arg: sessionId,
      token_arg: token,
      client_id_arg: clientId,
    });
    if (error) throw error;
    return NextResponse.json(
      { claimed: Boolean(data) },
      { status: data ? 200 : 409, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível ativar este telão" },
      { status: error instanceof z.ZodError ? 400 : 500, headers: NO_STORE_HEADERS },
    );
  }
}
