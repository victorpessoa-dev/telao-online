"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-amber-500/30 bg-amber-100 px-4 py-3 text-amber-950 shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          Você está sem conexão. Alguns dados podem estar desatualizados.
        </span>
        <Link
          href="/offline.html"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
        >
          <Wifi className="h-4 w-4" />
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}
