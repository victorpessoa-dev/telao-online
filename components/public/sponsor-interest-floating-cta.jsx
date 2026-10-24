"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, Minus } from "lucide-react";

export default function SponsorInterestFloatingCta({ slug }) {
  const [minimized, setMinimized] = useState(true);

  useEffect(() => {
    if (!slug) return undefined;
    const frameId = window.requestAnimationFrame(() => setMinimized(false));
    return () => window.cancelAnimationFrame(frameId);
  }, [slug]);

  if (!slug) return null;

  const interestPath = `/${slug}/patrocinar`;
  const qrValue = typeof window === "undefined" ? interestPath : `${window.location.origin}${interestPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=svg&data=${encodeURIComponent(qrValue)}`;

  return (
    <>
      <Link
        href={interestPath}
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 sm:hidden"
      >
        <Handshake className="h-4 w-4" />
        Seja Parceiro
      </Link>
      <aside className="morph-container fixed bottom-4 right-4 z-30 hidden sm:flex" aria-label="Convite para patrocínio">
      <div className={`morph-card ${minimized ? "" : "open"}`}>
        {minimized ? (
          <button type="button" onClick={() => setMinimized(false)} className="morph-toggle" aria-expanded="false">
            <Handshake className="h-[18px] w-[18px]" />
            <span>Seja Parceiro</span>
          </button>
        ) : (
          <>
            <div className="morph-header">
              <span><Handshake className="h-[18px] w-[18px]" /> Seja Parceiro</span>
              <button type="button" onClick={() => setMinimized(true)} className="morph-minimize" aria-label="Minimizar convite">
                <Minus className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="morph-content">
              <div className="morph-content-inner">
                <div className="morph-info text-center">
              <Link href={interestPath} className="block rounded-xl bg-white p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200" aria-label="Abrir formulário para ser parceiro">
                <img src={qrUrl} alt="QR Code para abrir o formulário de interesse em patrocínio" className="mx-auto h-32 w-32" />
              </Link>
              <p>Escaneie ou toque no código para participar.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </aside>
    </>
  );
}
