import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSponsorForAdmin,
  updateSponsorForAdmin,
} from "@/lib/services/sponsors";

function createSupabaseTableMock() {
  const calls = [];
  const rpcRows = {
    create_admin_sponsor: {
      id: "sponsor-1",
      name: "Empresa A",
      kind: "NORMAL",
      media_url: "https://cdn.example/a.webp",
      media_type: "image",
      website_url: "https://empresa.example",
      duration_seconds: 12,
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
      active: false,
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
          kind: "NORMAL",
          media_url: "https://cdn.example/a.webp",
          media_type: "image",
          website_url: "https://empresa.example",
          duration_seconds: 12,
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

describe("sponsor admin flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a sponsor with normalized admin payloads", async () => {
    const { client, calls } = createSupabaseTableMock();

    const sponsor = await createSponsorForAdmin(
      client,
      {
        name: "Empresa A",
        type: "NORMAL",
        src: "https://cdn.example/a.webp",
        mediaType: "image",
        websiteUrl: "https://empresa.example",
        duration: 12,
      },
      "church-1",
    );

    expect(calls).toContainEqual([
      "rpc",
      "create_admin_sponsor",
      expect.objectContaining({
        name_arg: "Empresa A",
        kind_arg: "NORMAL",
        media_url_arg: "https://cdn.example/a.webp",
        duration_seconds_arg: 12,
      }),
    ]);
    expect(calls.some(([call]) => call === "insert")).toBe(false);
    expect(sponsor).toMatchObject({ id: "sponsor-1", sourceType: "supabase" });
  });

  it("updates an existing sponsor with merged edit values", async () => {
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
        active: false,
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
        active_arg: false,
      }),
    ]);
    expect(calls.some(([call]) => call === "update")).toBe(false);
  });
});
