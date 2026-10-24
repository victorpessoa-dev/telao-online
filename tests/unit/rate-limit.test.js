import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/cache/rate-limit";

describe("rate limit helpers", () => {
  it("extracts client ip from forwarding headers", () => {
    const request = {
      headers: new Headers({
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      }),
    };

    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("limits repeated requests in memory", async () => {
    const key = `test:${crypto.randomUUID()}`;

    await expect(
      checkRateLimit(key, { limit: 1, windowMs: 1000 }),
    ).resolves.toMatchObject({
      allowed: true,
      source: "memory",
    });
    await expect(
      checkRateLimit(key, { limit: 1, windowMs: 1000 }),
    ).resolves.toMatchObject({
      allowed: false,
      source: "memory",
    });
  });
});
