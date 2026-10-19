import { z } from "zod";

const logSchema = z
  .object({
    sponsorId: z.string().uuid().optional(),
    sponsor_id: z.string().uuid().optional(),
    displayedAt: z.string().datetime().optional(),
    displayed_at: z.string().datetime().optional(),
    durationSeconds: z.coerce.number().min(0).max(3600).optional(),
    duration_seconds: z.coerce.number().min(0).max(3600).optional(),
    source: z.string().trim().min(1).max(40).default("telao"),
  })
  .transform((payload) => ({
    sponsorId: payload.sponsorId || payload.sponsor_id,
    displayedAt:
      payload.displayedAt || payload.displayed_at || new Date().toISOString(),
    durationSeconds: Math.max(
      0,
      Number(payload.durationSeconds ?? payload.duration_seconds ?? 0) || 0,
    ),
    source: payload.source || "telao",
  }))
  .refine((payload) => Boolean(payload.sponsorId), {
    message: "sponsorId é obrigatório",
    path: ["sponsorId"],
  });

const bodySchema = z.union([
  logSchema,
  z.object({ logs: z.array(logSchema).min(1).max(100) }),
]);

export function normalizeSponsorLogPayload(body) {
  const parsed = bodySchema.parse(body);
  return Array.isArray(parsed.logs) ? parsed.logs : [parsed];
}
