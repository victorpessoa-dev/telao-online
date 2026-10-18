import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const desktopSessionCache = new Map();

function getDesktopAuth() {
  if (typeof window === "undefined") return null;
  return window.vPlaycastDesktop?.auth || null;
}

function createDesktopStorage(desktopAuth) {
  return {
    async getItem(key) {
      if (desktopSessionCache.has(key)) return desktopSessionCache.get(key);
      const value = await desktopAuth.getSession(key);
      if (value) desktopSessionCache.set(key, value);
      return value;
    },
    async setItem(key, value) {
      desktopSessionCache.set(key, value);
      await desktopAuth.setSession(key, value);
    },
    async removeItem(key) {
      desktopSessionCache.delete(key);
      await desktopAuth.clearSession(key);
    },
  };
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const desktopAuth = getDesktopAuth();
  if (desktopAuth) {
    return createClient(url, anonKey, {
      auth: {
        storage: createDesktopStorage(desktopAuth),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return createBrowserClient(url, anonKey);
}

export async function setDesktopRememberSession(remember) {
  const desktopAuth = getDesktopAuth();
  if (desktopAuth) await desktopAuth.setRemember(remember);
}
