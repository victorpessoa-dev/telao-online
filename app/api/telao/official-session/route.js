import { NextResponse } from "next/server";
import { z } from "zod";
import { NO_STORE_HEADERS } from "@/lib/utils/http";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

const bodySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function POST(request) {
  try {
    const rate = await checkRateLimit(`official-display-open:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }
    const { slug } = bodySchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("open_official_display_session", {
      slug_arg: slug,
    });
    if (error) throw error;
    return NextResponse.json({ session: data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível abrir o telão oficial" },
      { status: error instanceof z.ZodError ? 400 : 500, headers: NO_STORE_HEADERS },
    );
  }
}
