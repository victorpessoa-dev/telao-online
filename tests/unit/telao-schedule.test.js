import { describe, expect, it } from "vitest";
import {
  getCycleOrder,
  getSchedulePosition,
  millisecondsUntilScheduleChange,
} from "@/lib/services/telao-schedule";

const ads = [
  { id: "a", duration: 5 },
  { id: "b", duration: 10 },
  { id: "c", duration: 15 },
];
const schedule = { seed: "church-seed", startsAt: "2026-01-01T00:00:00.000Z" };

describe("global telão schedule", () => {
  it("is deterministic for every device", () => {
    expect(getCycleOrder(ads, schedule.seed, 4)).toEqual(
      getCycleOrder(ads, schedule.seed, 4),
    );
  });

  it("keeps every active sponsor once per cycle", () => {
    expect(getCycleOrder(ads, schedule.seed, 2).map((ad) => ad.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("places a visitor directly in the ad currently in progress", () => {
    const enteredAt = Date.parse("2026-01-01T00:00:07.000Z");
    const firstDisplay = getSchedulePosition(ads, schedule, enteredAt);
    const secondDisplay = getSchedulePosition(ads, schedule, enteredAt);
    expect(firstDisplay.order[firstDisplay.index].id).toBe(
      secondDisplay.order[secondDisplay.index].id,
    );
    expect(millisecondsUntilScheduleChange(ads, schedule, enteredAt)).toBeGreaterThan(0);
  });
});
