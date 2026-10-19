"use client";

import { motion } from "framer-motion";

export function LoadingIndicator({ className = "" }) {
  return (
    <div
      className={`relative grid h-14 w-14 place-items-center ${className}`}
      aria-hidden
    >
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-primary/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary border-r-primary/60"
        animate={{ rotate: -360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.img
        src="/brand/virtus-playcast-mark.png"
        alt=""
        className="h-8 w-8 object-contain"
        animate={{ scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function LoadingState({
  label = "Carregando...",
  fullScreen = false,
  className = "",
}) {
  const content = (
    <div
      className="flex flex-col items-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      <LoadingIndicator />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );

  if (fullScreen)
    return (
      <div
        className={`flex min-h-svh items-center justify-center bg-background px-4 ${className}`}
      >
        {content}
      </div>
    );
  return (
    <div
      className={`flex min-h-[50svh] items-center justify-center px-4 ${className}`}
    >
      {content}
    </div>
  );
}
