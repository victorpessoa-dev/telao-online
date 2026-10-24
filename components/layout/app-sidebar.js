"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Church,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Play,
  Settings,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils/cn";
import { useAdminSidebarState } from "@/components/layout/admin-sidebar-state";

const navItems = [
  { title: "Início", href: "/admin", icon: LayoutDashboard },
  { title: "Patrocínios", href: "/painel-telao", icon: Megaphone },
  { title: "Grade Ads", href: "/grade-ads", icon: Monitor },
  {
    title: "Configurações",
    href: "/configuracoes?tab=telao",
    icon: Settings,
  },
];

export default function AppSidebar({ mobileOpen = false, onMobileClose }) {
  const { collapsed, updateCollapsed } = useAdminSidebarState();
  const pathname = usePathname();
  const router = useRouter();
  const { churchSlug } = useStore();
  const publicLinks = churchSlug
    ? [
        { title: "Página pública", href: `/${churchSlug}`, icon: Globe },
        {
          title: "Abrir telão",
          href: `/${churchSlug}/ads-telao`,
          icon: Play,
          target: "_blank",
        },
      ]
    : [];

  async function onLogout() {
    try {
      await fetch("/logout", { method: "POST" });
    } catch {
      // The login route clears any stale client state even if logout failed.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={0}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          onClick={onMobileClose}
          aria-label="Fechar menu principal"
        />
      ) : null}
      <aside
        id="admin-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-60 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300 ease-in-out md:z-20 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        <div
          className={cn(
            "flex min-h-20 items-center gap-3 border-b border-sidebar-border/80 px-4 py-4",
            collapsed && "md:justify-center md:gap-0",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out md:max-w-40",
              collapsed && "md:max-w-0 md:opacity-0",
            )}
          >
            <span className="font-brand text-sm font-extrabold tracking-tight text-sidebar-foreground">
              Telão Online
            </span>
            <span className="mt-1 truncate text-[11px] font-medium text-sidebar-foreground/70">
              Painel administrativo
            </span>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg p-1">
            <img
              src="/brand/logo-telao-online.webp"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {navItems.map((item) => {
            const [itemPath] = item.href.split("?");
            const isActive =
              pathname === itemPath ||
              (itemPath !== "/" && pathname.startsWith(itemPath));
            const navButton = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium transition-[padding,background-color,color] duration-300",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-sm before:absolute before:-left-2.5 before:h-5 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                    : "text-sidebar-foreground/70",
                  collapsed && "md:justify-center md:gap-0 md:px-0",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out md:max-w-40",
                    collapsed && "md:max-w-0 md:opacity-0",
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );

            if (!collapsed) return navButton;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-2.5 py-6">
          {publicLinks.map((item) => {
            const quickLink = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                target={item.target}
                className={cn(
                  "flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-[padding,background-color,color] duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "md:justify-center md:gap-0 md:px-0",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out md:max-w-40",
                    collapsed && "md:max-w-0 md:opacity-0",
                  )}
                >
                  {item.title}
                </span>
                {item.target ? (
                  <ExternalLink
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-50 transition-opacity",
                      collapsed && "md:hidden",
                    )}
                  />
                ) : null}
              </Link>
            );

            if (!collapsed) return quickLink;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{quickLink}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-sidebar-border px-2.5 py-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => updateCollapsed(!collapsed)}
                aria-label={
                  collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
                }
                className={cn(
                  "hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:flex",
                  collapsed && "justify-center gap-0 px-0",
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 md:max-w-32",
                    collapsed && "md:max-w-0 md:opacity-0",
                  )}
                >
                  Recolher menu
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>

          {collapsed ? (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center rounded-lg p-2.5 text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Sair
                </TooltipContent>
              </Tooltip>
              <LogoutDialogContent onConfirm={onLogout} />
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Sair</span>
                </button>
              </AlertDialogTrigger>
              <LogoutDialogContent onConfirm={onLogout} />
            </AlertDialog>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function LogoutDialogContent({ onConfirm }) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Sair do painel?</AlertDialogTitle>
        <AlertDialogDescription>
          Sua sessão administrativa será encerrada e você voltará para a tela de
          login.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
        >
          Sair
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
