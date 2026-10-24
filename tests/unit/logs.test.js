import { describe, expect, it } from "vitest";
import { normalizeSponsorLogPayload } from "@/lib/services/sponsor-logs";

const sponsorId = "00000000-0000-4000-8000-000000000001";

describe("sponsor log payload validation", () => {
  it("normalizes a single log payload", () => {
    expect(
      normalizeSponsorLogPayload({
        sponsor_id: sponsorId,
        duration_seconds: "12",
        source: "telao",
      }),
    ).toMatchObject([
      {
        sponsorId,
        durationSeconds: 12,
        eventId: expect.any(String),
        source: "telao",
      },
    ]);
  });

  it("normalizes batch payloads", () => {
    expect(
      normalizeSponsorLogPayload({
        logs: [
          { sponsorId, durationSeconds: 1 },
          { sponsor_id: sponsorId, duration_seconds: 2 },
        ],
      }),
    ).toHaveLength(2);
  });

  it("rejects missing sponsor ids", () => {
    expect(() => normalizeSponsorLogPayload({ durationSeconds: 10 })).toThrow();
  });
});
