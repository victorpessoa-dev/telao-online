import { describe, expect, it, vi } from "vitest";
import {
  getAuthErrorMessage,
  getSafeRedirectPath,
  signInWithPasswordFlow,
  signOutFlow,
} from "@/lib/services/auth";

describe("auth flows", () => {
  it("maps provider credential errors to a clear, safe message", () => {
    expect(
      getAuthErrorMessage({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe(
      "Não foi possível entrar com este email e senha. Confira os dados ou redefina sua senha.",
    );
  });

  it("keeps login redirects inside the app", () => {
    expect(getSafeRedirectPath("/painel-telao")).toBe("/painel-telao");
    expect(getSafeRedirectPath("//evil.example")).toBe("/admin");
    expect(getSafeRedirectPath("/\\evil.example")).toBe("/admin");
    expect(getSafeRedirectPath("https://evil.example")).toBe("/admin");
  });

  it("signs in and redirects after successful login", async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    const router = {
      replace: vi.fn(),
      refresh: vi.fn(),
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
    expect(router.refresh).toHaveBeenCalled();
  });

  it("signs out through the Supabase auth client", async () => {
    const supabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    await signOutFlow(supabase);

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
