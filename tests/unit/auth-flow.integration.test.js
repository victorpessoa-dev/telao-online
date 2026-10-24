import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSafeRedirectPath,
  signInWithPasswordFlow,
  signOutFlow,
} from "@/lib/services/auth";

function createRouterMock() {
  return {
    replace: vi.fn(),
    refresh: vi.fn(),
  };
}

describe("auth flow integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps login redirects inside the app and does not allow open redirects", () => {
    expect(getSafeRedirectPath("/painel-telao")).toBe("/painel-telao");
    expect(getSafeRedirectPath("//evil.example")).toBe("/admin");
    expect(getSafeRedirectPath("/\\evil.example")).toBe("/admin");
    expect(getSafeRedirectPath("https://evil.example")).toBe("/admin");
  });

  it("signs in, redirects and refreshes the router after a successful login", async () => {
    const router = createRouterMock();
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    await signInWithPasswordFlow({
      supabase,
      email: "admin@example.com",
      password: "secret",
      router,
      redirectTo: "/painel-telao",
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
    expect(router.replace).toHaveBeenCalledWith("/painel-telao");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("signs out through the auth client and ignores transient failures", async () => {
    const supabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    await expect(signOutFlow(supabase)).resolves.toBeUndefined();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
