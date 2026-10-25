import { describe, expect, it } from "vitest";
import { mergeSponsorSettings } from "@/lib/mappers/settings";
import {
  getTelaoDefaultDurations,
  saveAdminSettings,
} from "@/lib/services/settings";

function createSettingsSupabaseMock(initialValue) {
  const calls = [];

  return {
    calls,
    from(table) {
      expect(table).toBe("app_settings");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({
            data: { value: initialValue },
            error: null,
          });
        },
        upsert(payload) {
          calls.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

describe("settings services", () => {
  it("normalizes legacy telao default duration", async () => {
    const supabase = createSettingsSupabaseMock({
      telao: {
        defaultDuration: 22,
      },
    });

    await expect(
      getTelaoDefaultDurations(supabase, "church-1"),
    ).resolves.toEqual({
      IMAGE: 22,
      VIDEO: 22,
    });
  });

  it("saves normalized admin settings", async () => {
    const supabase = createSettingsSupabaseMock(null);
    const saved = await saveAdminSettings(
      supabase,
      {
        telao: { defaultDurationImage: 9 },
      },
      "church-1",
    );

    expect(saved.telao.defaultDurationImage).toBe(9);
    expect(saved.telao.defaultDurationVideo).toBe(15);
    expect(supabase.calls[0]).toMatchObject({
      key: "admin_settings",
      value: {
        telao: saved.telao,
      },
    });
    expect(supabase.calls[0].value.appearance).toBeUndefined();
  });

  it("caps legacy Telão durations at 25 seconds", async () => {
    const supabase = createSettingsSupabaseMock({
      telao: { defaultDurationImage: 60, defaultDurationVideo: 30 },
    });

    await expect(
      getTelaoDefaultDurations(supabase, "church-1"),
    ).resolves.toEqual({ IMAGE: 25, VIDEO: 25 });
  });

  it("normalizes paused sponsor counters by screen", () => {
    expect(
      mergeSponsorSettings({
        metricsEnabled: true,
        metricsPaused: {
          NORMAL: true,
        },
      }),
    ).toMatchObject({
      metricsEnabled: true,
      metricsPaused: {
        NORMAL: true,
        MASTER: false,
      },
    });
  });

  it("uses configured durations by media type", () => {
    expect(
      mergeSponsorSettings({ mediaDurations: { image: 12, video: 24 } }),
    ).toMatchObject({ mediaDurations: { image: 12, video: 24 } });
  });

  it("keeps responsive designs while migrating the legacy normal layout", () => {
    const settings = mergeSponsorSettings({
      designs: {
        NORMAL: {
          backgroundUrl: "https://cdn.example/legacy-background.webp",
          contentWidth: 64,
        },
      },
    });

    expect(settings.designs.SHARED).toMatchObject({
      backgroundUrl: "https://cdn.example/legacy-background.webp",
      contentWidth: 64,
    });
    expect(settings.designs.MOBILE).toMatchObject({ backgroundUrl: "" });
    expect(settings.designs.TABLET).toMatchObject({ backgroundUrl: "" });
    expect(settings.designs.DESKTOP).toMatchObject({ backgroundUrl: "" });
  });

  it("preserves independent backgrounds for each screen profile", () => {
    const settings = mergeSponsorSettings({
      designs: {
        MOBILE: { backgroundUrl: "https://cdn.example/mobile.webp", x: 42 },
        TABLET: { backgroundUrl: "https://cdn.example/tablet.webp", y: 44 },
        DESKTOP: { backgroundUrl: "https://cdn.example/desktop.webp", contentWidth: 70 },
      },
    });

    expect(settings.designs.MOBILE).toMatchObject({
      backgroundUrl: "https://cdn.example/mobile.webp",
      x: 42,
    });
    expect(settings.designs.TABLET).toMatchObject({
      backgroundUrl: "https://cdn.example/tablet.webp",
      y: 44,
    });
    expect(settings.designs.DESKTOP).toMatchObject({
      backgroundUrl: "https://cdn.example/desktop.webp",
      contentWidth: 70,
    });
  });
});
