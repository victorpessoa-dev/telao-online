import { describe, expect, it } from "vitest";
import {
  mapPublicAdRow,
  mapSponsorImpressionRow,
  mapSponsorRow,
} from "@/lib/mappers/sponsors";
import { isSafePublicUrl } from "@/lib/utils/url";

describe("sponsor mappers", () => {
  it("maps sponsor database rows to the public domain shape", () => {
    const sponsor = mapSponsorRow({
      id: "sponsor-1",
      name: "Empresa Exemplo",
      kind: "MASTER",
      media_url: "",
      image_url: "https://cdn.example/logo.png",
      media_type: "image",
      website_url: "https://example.com",
      duration_seconds: 15,
      active: true,
      views: 7,
      total_seconds: 105,
      last_displayed_at: "2026-07-06T12:00:00.000Z",
      created_at: "2026-07-01T12:00:00.000Z",
      updated_at: "2026-07-02T12:00:00.000Z",
    });

    expect(sponsor).toMatchObject({
      id: "sponsor-1",
      type: "MASTER",
      src: "https://cdn.example/logo.png",
      duration: 15,
      active: true,
      totalSeconds: 105,
    });
  });

  it("maps null sponsor rows safely", () => {
    expect(mapSponsorRow(null)).toBeNull();
    expect(mapPublicAdRow(null)).toBeNull();
  });

  it("preserves historical displayed time when the configured duration changes", () => {
    expect(
      mapSponsorRow({
        id: "sponsor-1",
        duration_seconds: 5,
        views: 11,
        total_seconds: 101,
      }),
    ).toMatchObject({ duration: 5, views: 11, totalSeconds: 101 });
  });

  it("keeps public sponsor rows eligible when the RPC omits active", () => {
    expect(
      mapSponsorRow({
        id: "public-sponsor-1",
        name: "Patrocinador público",
        kind: "NORMAL",
        media_url: "https://cdn.example/logo.png",
      }),
    ).toMatchObject({ active: true });
  });

  it("maps impression rows with defaults", () => {
    expect(
      mapSponsorImpressionRow({
        id: "log-1",
        displayed_at: "2026-07-06T12:00:00.000Z",
      }),
    ).toEqual({
      id: "log-1",
      displayedAt: "2026-07-06T12:00:00.000Z",
      durationSeconds: 0,
      viewsCount: 1,
      source: "telao",
    });
  });


  it("identifies safe public URLs", () => {
    expect(isSafePublicUrl("https://paroquia.example")).toBe(true);
    expect(isSafePublicUrl("http://paroquia.example")).toBe(true);
    expect(isSafePublicUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePublicUrl("file:///etc/passwd")).toBe(false);
  });
});
