"use client";

import { Toaster } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { AdminSidebarStateProvider } from "@/components/layout/admin-sidebar-state";
import { StoreProvider } from "@/lib/store/store";
import AdminSessionGate from "@/components/auth/admin-session-gate";

export default function AdminLayout({ children }) {
  return (
    <AdminSessionGate>
      <StoreProvider>
        <AdminSidebarStateProvider>
          <AppShell>{children}</AppShell>
          <Toaster
          closeButton
          richColors
          theme="light"
          position="bottom-right"
          duration={3600}
          toastOptions={{
            classNames: {
              toast:
                "border border-border bg-card text-card-foreground shadow-xl",
              title: "font-medium",
              description: "text-muted-foreground",
            },
          }}
          />
        </AdminSidebarStateProvider>
      </StoreProvider>
    </AdminSessionGate>
  );
}
