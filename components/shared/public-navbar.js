"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const fallbackProfile = {
  parishName: "vPlayCast",
  parishLogoUrl: "/brand/virtus-playcast-mark.png",
};

export default function PublicNavbar({
  church = null,
  showLogin = true,
  projectBrand = false,
}) {
  const [profile, setProfile] = useState(() =>
    church && !projectBrand
      ? {
          parishName: church.name || fallbackProfile.parishName,
          parishLogoUrl: church.logo_url || fallbackProfile.parishLogoUrl,
        }
      : fallbackProfile,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (church && !projectBrand) {
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
  }, [church, projectBrand]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex min-h-16 w-[min(80%,1600px)] items-center justify-between gap-3 py-2 xs:gap-4 sm:py-3 max-md:w-full max-md:px-4 fhd:max-w-[1600px]">
        <Link
          href={projectBrand ? "/" : church?.slug ? `/${church.slug}` : "/"}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={`min-w-0 truncate text-base leading-tight sm:text-lg ${profile.parishName === "vPlayCast" ? "font-brand font-extrabold" : "font-semibold"}`}
          >
            {profile.parishName}
          </span>
          <img
            src={profile.parishLogoUrl}
            alt=""
            className="h-10 w-12 shrink-0 object-contain sm:h-11 sm:w-14"
          />
        </Link>
        <div className="flex shrink-0 items-center gap-1">
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
