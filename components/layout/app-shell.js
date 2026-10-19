"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import AppFooter from "@/components/shared/app-footer";
import { HoverTip } from "@/components/shared/hover-tip";
import { Button } from "@/components/ui/button";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(64);
  const [isMobileAdmin, setIsMobileAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      const sidebar = document.getElementById("admin-sidebar");
      setIsMobileAdmin(window.innerWidth < 768);
      setSidebarWidth(
        window.innerWidth >= 768 && sidebar ? sidebar.offsetWidth : 0,
      );
    };

    // Observe the actual rendered width. A class observer captures the value
    // before the sidebar's CSS width transition finishes, leaving the main
    // content underneath an expanded navigation.
    const sidebar = document.getElementById("admin-sidebar");
    const resizeObserver =
      sidebar && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateWidth)
        : null;

    resizeObserver?.observe(sidebar);

    updateWidth();
    window.addEventListener("resize", updateWidth);
    window.addEventListener("vplaycast_sidebar_resize", updateWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.removeEventListener("vplaycast_sidebar_resize", updateWidth);
    };
  }, []);

  const isStandaloneAdminPage =
    pathname === "/configurar-igreja" ||
    pathname === "/painel-igreja";

  if (isStandaloneAdminPage) return children;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      {isMobileAdmin ? (
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
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
            vPlayCast
          </span>
          <img
            src="/brand/virtus-playcast-mark.png"
            alt=""
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="truncate text-sm font-semibold">Painel administrativo</span>
        </header>
      ) : null}
      <main
        className="flex min-h-screen min-w-0 flex-col items-center transition-sidebar"
        style={{
          marginLeft: isMobileAdmin ? 0 : sidebarWidth,
          width: isMobileAdmin ? "100%" : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <div className="flex min-h-screen w-full min-w-0 flex-col">
          {children}
          <AppFooter className="mt-auto" />
        </div>
      </main>
    </div>
  );
}
