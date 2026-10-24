import { describe, expect, it } from "vitest";
import {
  createSponsorForAdmin,
  getPublicAdsPayload,
  getSponsorDetailPayload,
  getSponsorDirectoryPayload,
  updateSponsorForAdmin,
} from "@/lib/services/sponsors";
import { syncSponsorDurationsForChurch } from "@/lib/repositories/sponsors";

function createSupabaseRpcMock(responses) {
  return {
    rpc(name) {
      if (!(name in responses)) {
        return Promise.resolve({
          data: null,
          error: new Error(`RPC não mockada: ${name}`),
        });
      }

      return Promise.resolve({ data: responses[name], error: null });
    },
  };
}

function createSupabaseTableMock() {
  const calls = [];
  const rpcRows = {
    create_admin_sponsor: {
      id: "sponsor-1",
      name: "Empresa A",
      kind: "MASTER",
      media_url: "https://cdn.example/a.mp4",
      media_type: "video",
      website_url: "https://empresa.example",
      duration_seconds: 15,
      active: true,
    },
    update_admin_sponsor: {
      id: "sponsor-1",
      name: "Empresa A editada",
      kind: "NORMAL",
      media_url: "https://cdn.example/a.webp",
      media_type: "image",
      website_url: "https://empresa.example",
      duration_seconds: 20,
      active: true,
    },
  };
  const builder = {
    insert(payload) {
      calls.push(["insert", payload]);
      return builder;
    },
    update(payload) {
      calls.push(["update", payload]);
      return builder;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return builder;
    },
    select(columns) {
      calls.push(["select", columns]);
      return builder;
    },
    single() {
      return Promise.resolve({
        data: {
          id: "sponsor-1",
          church_id: "church-1",
          name: "Empresa A",
          kind: "MASTER",
          media_url: "https://cdn.example/a.mp4",
          media_type: "video",
          website_url: "https://empresa.example",
          duration_seconds: 15,
          active: true,
        },
        error: null,
      });
    },
  };

  return {
    calls,
    client: {
      rpc(name, args) {
        calls.push(["rpc", name, args]);
        return {
          single() {
            return Promise.resolve({ data: rpcRows[name], error: null });
          },
        };
      },
      from(table) {
        calls.push(["from", table]);
        return builder;
      },
    },
  };
}

describe("sponsor services", () => {
  it("builds the public ads payload from sponsors and settings RPCs", async () => {
    const payload = await getPublicAdsPayload(
      createSupabaseRpcMock({
        get_public_sponsors: [
          {
            id: "sponsor-1",
            name: "Empresa A",
            kind: "NORMAL",
            media_url: "https://cdn.example/a.webp",
            media_type: "image",
            duration_seconds: 12,
            active: true,
          },
          {
            id: "sponsor-2",
            name: "Empresa B",
            kind: "MASTER",
            media_url: "",
            media_type: "image",
            duration_seconds: 10,
            active: true,
          },
        ],
        get_sponsor_settings: { enabled: true },
      }),
    );

    expect(payload.ads).toHaveLength(1);
    expect(payload.ads[0]).toMatchObject(
      {
        id: "sponsor-1",
        src: "https://cdn.example/a.webp",
        duration: 12,
      },
      "church-1",
    );
    expect(payload.sponsorSettings).toEqual({ enabled: true });
    expect(payload.fetchedAt).toEqual(expect.any(String));
  });

  it("builds sponsor directory totals", async () => {
    const payload = await getSponsorDirectoryPayload(
      createSupabaseRpcMock({
        get_public_sponsor_directory: [
          {
            id: "a",
            name: "A",
            views: 2,
            duration_seconds: 10,
            total_seconds: 20,
            active: true,
          },
          {
            id: "b",
            name: "B",
            views: 3,
            duration_seconds: 15,
            total_seconds: 45,
            active: true,
          },
        ],
      }),
    );

    expect(payload.totals).toEqual(
      {
        advertisers: 2,
        totalViews: 5,
        totalSeconds: 65,
      },
      "church-1",
    );
  });

  it("does not expose inactive sponsors in public directory payloads", async () => {
    const payload = await getSponsorDirectoryPayload(
      createSupabaseRpcMock({
        get_public_sponsor_directory: [
          {
            id: "a",
            name: "A",
            views: 2,
            duration_seconds: 10,
            total_seconds: 20,
            active: true,
          },
          {
            id: "b",
            name: "B",
            views: 30,
            duration_seconds: 15,
            total_seconds: 450,
            active: false,
          },
        ],
      }),
    );

    expect(payload.advertisers).toHaveLength(1);
    expect(payload.advertisers[0]).toMatchObject({ id: "a", active: true });
    expect(payload.totals).toEqual(
      {
        advertisers: 1,
        totalViews: 2,
        totalSeconds: 20,
      },
      "church-1",
    );
  });

  it("does not expose inactive sponsor details publicly", async () => {
    await expect(
      getSponsorDetailPayload(
        createSupabaseRpcMock({
          get_public_sponsor_detail: {
            id: "inactive-id",
            name: "Empresa inativa",
            active: false,
          },
          get_public_sponsor_report: {
            logs: [
              {
                id: "log-1",
                displayed_at: new Date().toISOString(),
                duration_seconds: 10,
              },
            ],
            daily: [],
            totalItems: 1,
          },
        }),
        "inactive-id",
      ),
    ).resolves.toBeNull();
  });

  it("returns null when sponsor detail is missing", async () => {
    await expect(
      getSponsorDetailPayload(
        createSupabaseRpcMock({
          get_public_sponsor_detail: null,
          get_public_sponsor_report: { logs: [], daily: [], totalItems: 0 },
        }),
        "missing-id",
      ),
    ).resolves.toBeNull();
  });

  it("creates sponsor records with normalized admin payloads", async () => {
    const { client, calls } = createSupabaseTableMock();

    const sponsor = await createSponsorForAdmin(
      client,
      {
        name: "Empresa A",
        type: "MASTER",
        src: "https://cdn.example/a.mp4",
        mediaType: "video",
        websiteUrl: "https://empresa.example",
        duration: 15,
      },
      "church-1",
    );

    expect(calls).toContainEqual([
      "rpc",
      "create_admin_sponsor",
      expect.objectContaining({
        name_arg: "Empresa A",
        kind_arg: "MASTER",
        media_url_arg: "https://cdn.example/a.mp4",
        media_type_arg: "video",
        duration_seconds_arg: 15,
      }),
    ]);
    expect(calls.some(([call]) => call === "insert")).toBe(false);
    expect(sponsor).toMatchObject({ id: "sponsor-1", sourceType: "supabase" });
  });

  it("allows normal sponsors to save video media", async () => {
    const { client, calls } = createSupabaseTableMock();

    await createSponsorForAdmin(
      client,
      {
        name: "Empresa Video",
        type: "NORMAL",
        src: "https://cdn.example/video.mp4",
        mediaType: "video",
        duration: 12,
      },
      "church-1",
    );

    expect(calls).toContainEqual([
      "rpc",
      "create_admin_sponsor",
      expect.objectContaining({
        kind_arg: "NORMAL",
        media_url_arg: "https://cdn.example/video.mp4",
        media_type_arg: "video",
      }),
    ]);
  });

  it("updates sponsor records by id with merged edit values", async () => {
    const { client, calls } = createSupabaseTableMock();

    await updateSponsorForAdmin(
      client,
      {
        id: "sponsor-1",
        name: "Empresa A",
        type: "NORMAL",
        src: "https://cdn.example/a.webp",
        mediaType: "image",
        duration: 10,
      },
      {
        name: "Empresa A editada",
        duration: 20,
      },
      "church-1",
    );

    expect(calls).toContainEqual([
      "rpc",
      "update_admin_sponsor",
      expect.objectContaining({
        sponsor_id_arg: "sponsor-1",
        name_arg: "Empresa A editada",
        kind_arg: "NORMAL",
        duration_seconds_arg: 20,
      }),
    ]);
    expect(calls.some(([call]) => call === "update")).toBe(false);
  });

  it("synchronizes existing sponsors with the current image and video durations", async () => {
    const { client, calls } = createSupabaseTableMock();

    await syncSponsorDurationsForChurch(client, "church-1", {
      image: 5,
      video: 15,
    });

    expect(calls).toContainEqual(["update", { duration_seconds: 5 }]);
    expect(calls).toContainEqual(["update", { duration_seconds: 15 }]);
    expect(calls).toContainEqual(["eq", "church_id", "church-1"]);
    expect(calls).toContainEqual(["eq", "media_type", "image"]);
    expect(calls).toContainEqual(["eq", "media_type", "video"]);
  });
});
