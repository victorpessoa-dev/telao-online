"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants/brand";

const fallbackProfile = {
  parishName: BRAND.name,
  parishLogoUrl: BRAND.markAsset,
};

/** Public navigation that resolves a church profile or the product fallback brand. */
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
          href={
            projectBrand
              ? "/igrejas"
              : church?.slug
                ? `/${church.slug}`
                : "/igrejas"
          }
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {profile.parishName === BRAND.name ? (
            <img
              src={BRAND.wordmarkAsset}
              alt={BRAND.name}
              className="h-7 w-auto max-w-44 object-contain sm:h-8"
            />
          ) : (
            <span className="min-w-0 truncate text-base font-semibold leading-tight sm:text-lg">
              {profile.parishName}
            </span>
          )}
          {profile.parishName !== BRAND.name && profile.parishLogoUrl ? (
            <img
              src={profile.parishLogoUrl}
              alt=""
              className="h-10 w-12 shrink-0 object-contain sm:h-11 sm:w-14"
            />
          ) : null}
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
