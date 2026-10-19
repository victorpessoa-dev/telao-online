"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    // Turbopack reuses development asset URLs between edits. A worker that
    // caches those assets can pair new HTML with an older client bundle and
    // cause React hydration mismatches. PWA caching is production-only.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .then(() => caches.keys())
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("vplaycast-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch((error) => {
          console.warn(
            "Não foi possível limpar o cache de desenvolvimento.",
            error,
          );
        });
      return undefined;
    }

    // Registration is intentionally client-only: the worker can then intercept
    // future navigations and serve /offline.html when the network is unavailable.
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Não foi possível registrar o modo offline.", error);
    });
  }, []);

  return null;
}
