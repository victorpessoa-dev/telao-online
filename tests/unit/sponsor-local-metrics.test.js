import { describe, expect, it } from "vitest";
import {
  getPendingSponsorMetrics,
  withPendingSponsorMetrics,
} from "@/lib/services/sponsor-local-metrics";

describe("sponsor local metrics", () => {
  it("aggregates only the pending queues of the current church", () => {
    const storage = new Map([
      [
        "vplaycast:telao:log-queue:church-a:NORMAL",
        JSON.stringify([
          { sponsorId: "ad-1", viewsCount: 2, durationSeconds: 20 },
        ]),
      ],
      [
        "vplaycast:telao:log-queue:church-a:MASTER",
        JSON.stringify([
          { sponsorId: "ad-1", viewsCount: 1, durationSeconds: 10 },
        ]),
      ],
      [
        "vplaycast:telao:log-queue:church-b:NORMAL",
        JSON.stringify([
          { sponsorId: "ad-1", viewsCount: 99, durationSeconds: 99 },
        ]),
      ],
    ]);
    const localStorageLike = {
      get length() {
        return storage.size;
      },
      key(index) {
        return [...storage.keys()][index] || null;
      },
      getItem(key) {
        return storage.get(key) || null;
      },
    };

    expect(getPendingSponsorMetrics(localStorageLike, "church-a")).toEqual({
      "ad-1": { views: 3, totalSeconds: 30, lastDisplayedAt: null },
    });
  });

  it("keeps persisted totals immutable and derives a preview separately", () => {
    const persistedAds = [{ id: "ad-1", views: 8, totalSeconds: 80 }];
    const preview = withPendingSponsorMetrics(persistedAds, {
      "ad-1": { views: 2, totalSeconds: 20, lastDisplayedAt: null },
    });

    expect(persistedAds[0]).toMatchObject({ views: 8, totalSeconds: 80 });
    expect(preview[0]).toMatchObject({ views: 10, totalSeconds: 100 });
  });
});
