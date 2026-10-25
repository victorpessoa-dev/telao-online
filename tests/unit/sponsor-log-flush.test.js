import { describe, expect, it, vi } from "vitest";
import { flushPendingSponsorLogs } from "@/lib/services/sponsor-log-flush";

const churchId = "church-1";
const queueKey = `telao-online:telao:log-queue:${churchId}:ALL`;

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] || null;
    },
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function log(overrides = {}) {
  return {
    sponsorId: "00000000-0000-4000-8000-000000000001",
    eventId: crypto.randomUUID(),
    displaySessionId: "00000000-0000-4000-8000-000000000010",
    displayToken: "a".repeat(64),
    displayClientId: "00000000-0000-4000-8000-000000000011",
    ...overrides,
  };
}

describe("flushPendingSponsorLogs", () => {
  it("confirms and removes completed local rotations before disabling metrics", async () => {
    const storage = createStorage({ [queueKey]: JSON.stringify([log(), log()]) });
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ processed: 2 }),
    });

    await expect(flushPendingSponsorLogs({ storage, churchId, request })).resolves.toBe(2);
    expect(request).toHaveBeenCalledTimes(1);
    expect(storage.getItem(queueKey)).toBeNull();
  });

  it("keeps the queue and stops deactivation when Supabase does not confirm it", async () => {
    const pending = [log()];
    const storage = createStorage({ [queueKey]: JSON.stringify(pending) });
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ processed: 0 }),
    });

    await expect(flushPendingSponsorLogs({ storage, churchId, request })).rejects.toThrow(
      "O banco não confirmou a última exibição",
    );
    expect(JSON.parse(storage.getItem(queueKey))).toEqual(pending);
  });
});
