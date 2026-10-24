"use client";

import { useEffect } from "react";

export function usePreventBrowserZoom() {
  useEffect(() => {
    const preventKeyboardZoom = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const isZoomKey =
        ["+", "-", "=", "_", "0"].includes(event.key) ||
        ["NumpadAdd", "NumpadSubtract", "Numpad0"].includes(event.code);

      if (isZoomKey) event.preventDefault();
    };

    const preventWheelZoom = (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };

    const preventTouchZoom = (event) => {
      if (event.touches?.length > 1) event.preventDefault();
    };

    const preventGestureZoom = (event) => event.preventDefault();

    window.addEventListener("keydown", preventKeyboardZoom);
    window.addEventListener("wheel", preventWheelZoom, { passive: false });
    window.addEventListener("touchmove", preventTouchZoom, { passive: false });
    window.addEventListener("gesturestart", preventGestureZoom, {
      passive: false,
    });
    window.addEventListener("gesturechange", preventGestureZoom, {
      passive: false,
    });

    return () => {
      window.removeEventListener("keydown", preventKeyboardZoom);
      window.removeEventListener("wheel", preventWheelZoom);
      window.removeEventListener("touchmove", preventTouchZoom);
      window.removeEventListener("gesturestart", preventGestureZoom);
      window.removeEventListener("gesturechange", preventGestureZoom);
    };
  }, []);
}
