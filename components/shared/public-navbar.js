"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/shared/theme-toggle";

const fallbackProfile = {
  parishName: "vPlayCast",
  parishLogoUrl: "/brand/virtus-playcast-mark.png",
};

export default function PublicNavbar({ church = null, showLogin = false }) {
  const [profile, setProfile] = useState(() =>
    church
      ? {
          parishName: church.name || fallbackProfile.parishName,
          parishLogoUrl: church.logo_url || fallbackProfile.parishLogoUrl,
        }
      : fallbackProfile,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (church) {
        setProfile({
          parishName: church.name || fallbackProfile.parishName,
          parishLogoUrl: church.logo_url || fallbackProfile.parishLogoUrl,
        });
        return;
      }

      try {
        const response = await fetch("/api/perfil-paroquia");
        const payload = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setProfile({
            parishName: payload.parishName || fallbackProfile.parishName,
            parishLogoUrl:
              payload.parishLogoUrl || fallbackProfile.parishLogoUrl,
          });
        }
      } catch {
        if (!cancelled) setProfile(fallbackProfile);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [church]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 xs:gap-4 sm:px-6 sm:py-3 lg:px-8 fhd:max-w-[1600px]">
        <Link
          href={church?.slug ? `/${church.slug}` : "/"}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={`min-w-0 truncate text-base leading-tight sm:text-lg ${profile.parishName === "vPlayCast" ? "font-brand font-extrabold" : "font-semibold"}`}>
            {profile.parishName}
          </span>
          <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-1 sm:h-11 sm:w-14">
            <img
              src={profile.parishLogoUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle compact />
          {showLogin && (
            <Button asChild size="sm">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
