"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SponsorInvitation({ church, slug, sponsors = [] }) {
  const interestPath = `/${slug}/patrocinar`;
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);
  const sponsorSlides = sponsors.filter((sponsor) => sponsor?.src);
  const qrValue =
    typeof window === "undefined"
      ? interestPath
      : `${window.location.origin}${interestPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(qrValue)}`;

  useEffect(() => {
    if (sponsorSlides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveSponsorIndex((current) => (current + 1) % sponsorSlides.length);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [sponsorSlides.length]);

  const activeSponsor =
    sponsorSlides[activeSponsorIndex % sponsorSlides.length];

  return (
    <section
      aria-labelledby="sponsor-invitation-title"
      className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10 lg:flex lg:min-h-80 lg:items-center lg:pr-[25rem]"
    >
      {activeSponsor ? (
        <div className="absolute inset-0" aria-hidden="true">
          {activeSponsor.mediaType === "video" ? (
            <video
              key={activeSponsor.id}
              src={activeSponsor.src}
              className="h-full w-full object-cover object-center"
              autoPlay
              muted
              playsInline
              loop
            />
          ) : (
            <img
              key={activeSponsor.id}
              src={activeSponsor.src}
              alt=""
              className="h-full w-full object-cover object-center transition-opacity duration-700"
            />
          )}
          <div className="absolute inset-0 bg-slate-950/85" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,12,25,.96),rgba(3,12,25,.82)_52%,rgba(3,12,25,.66))]" />
        </div>
      ) : null}
      <div className="absolute -left-20 top-0 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-100">
          <Handshake className="h-3.5 w-3.5" />
          Seja um parceiro desta festa
        </p>
        <h2
          id="sponsor-invitation-title"
          className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Divulgue sua empresa e apoie a comunidade.
        </h2>
        <p className="mt-3 max-w-xl leading-7 text-slate-200">
          Conheça as modalidades de patrocínio da {church.name} e veja como
          divulgar sua empresa durante a festa.
        </p>
        <Button
          asChild
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Link href={interestPath}>
            Quero ser parceiro
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Link
        href={interestPath}
        aria-label="Abrir formulário para ser parceiro"
        className="relative mt-8 inline-flex rounded-2xl border-2 border-cyan-300 bg-white p-4 shadow-2xl shadow-black/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 lg:absolute lg:right-8 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2"
      >
        <img
          src={qrUrl}
          alt="QR Code para abrir o formulário de interesse em patrocínio"
          className="h-36 w-36"
        />
      </Link>
    </section>
  );
}
