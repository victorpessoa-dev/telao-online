import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getSponsorDetail } from "@/app/api/anunciantes/[id]/route";
import { POST as postSponsorLogs } from "@/app/api/anunciantes/logs/route";
import { POST as postLogout } from "@/app/logout/route";
import { GET as getSlugAvailability } from "@/app/api/igrejas/slug-disponivel/route";
import { createSupabaseServerClient } from "@/services/supabase/server";
import { getSponsorDetailPayload } from "@/lib/services/sponsors";

vi.mock("@/services/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/services/sponsors", () => ({
  getSponsorDetailPayload: vi.fn(),
}));

describe("API routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when a sponsor detail does not exist", async () => {
    const sponsorId = "00000000-0000-4000-8000-000000000001";
    const churchId = "00000000-0000-4000-8000-000000000002";
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { id: "missing" }, error: null }),
            })),
          })),
        })),
      })),
    };
    createSupabaseServerClient.mockResolvedValue(supabase);
    getSponsorDetailPayload.mockResolvedValue(null);
    const response = await getSponsorDetail(
      new Request(
        `https://example.test/api/anunciantes/${sponsorId}?churchId=${churchId}`,
      ),
      { params: Promise.resolve({ id: sponsorId }) },
    );
    expect(response.status).toBe(404);
    expect(getSponsorDetailPayload).toHaveBeenCalledWith(
      supabase,
      sponsorId,
      churchId,
      { page: 1, pageSize: 20 },
    );
  });

  it("does not query a sponsor report without its church id", async () => {
    createSupabaseServerClient.mockResolvedValue({});
    const response = await getSponsorDetail(
      new Request("https://example.test/api/anunciantes/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(400);
    expect(getSponsorDetailPayload).not.toHaveBeenCalled();
  });

  it("records sponsor logs with one bulk RPC call", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    createSupabaseServerClient.mockResolvedValue({ rpc });
    const request = new Request("https://example.test/api/anunciantes/logs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": crypto.randomUUID(),
      },
      body: JSON.stringify({
        logs: [
          {
            sponsorId: "00000000-0000-4000-8000-000000000001",
            durationSeconds: 7,
          },
        ],
      }),
    });
    const response = await postSponsorLogs(request);
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps logout idempotent when Supabase signOut fails", async () => {
    createSupabaseServerClient.mockResolvedValue({
      auth: { signOut: vi.fn().mockRejectedValue(new Error("already gone")) },
    });
    const response = await postLogout();
    expect(response.status).toBe(200);
  });

  it("reports whether an onboarding slug is available", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    createSupabaseServerClient.mockResolvedValue({ rpc });
    const response = await getSlugAvailability(
      new Request(
        "https://example.test/api/igrejas/slug-disponivel?slug=paroquia-centro",
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ available: false });
    expect(rpc).toHaveBeenCalledWith("is_church_slug_available", {
      slug_arg: "paroquia-centro",
    });
  });
});
