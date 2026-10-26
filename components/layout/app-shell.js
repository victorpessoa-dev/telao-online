"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import { useAdminSidebarState } from "@/components/layout/admin-sidebar-state";
import AppFooter from "@/components/shared/app-footer";
import { HoverTip } from "@/components/shared/hover-tip";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

/** Responsive administrative shell that coordinates sidebar and mobile navigation. */
export default function AppShell({ children }) {
  const { collapsed } = useAdminSidebarState();
  const pathname = usePathname();
  const [isMobileAdmin, setIsMobileAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileAdmin(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const isStandaloneAdminPage =
    pathname === "/configurar-igreja" || pathname === "/painel-igreja";

  if (isStandaloneAdminPage) return children;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      {isMobileAdmin ? (
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 bg-background/95 px-4 backdrop-blur md:hidden">
          <HoverTip label="Abrir menu principal" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu principal"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </HoverTip>
          <span className="font-brand truncate text-sm font-extrabold">
            {BRAND.name}
          </span>
          <img
            src={BRAND.markAsset}
            alt=""
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="truncate text-sm font-semibold">
            Painel administrativo
          </span>
        </header>
      ) : null}
      <main
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col items-center transition-[margin] duration-300",
          collapsed ? "md:ml-16" : "md:ml-60",
        )}
      >
        <div className="flex min-h-screen w-full min-w-0 flex-col">
          {children}
          <AppFooter className="mt-auto" />
        </div>
      </main>
    </div>
  );
}
