"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import HeroBrandLogo from "@/components/public/hero-brand-logo";

export default function HomeHero() {
  const heroRef = useRef(null);
  const inView = useInView(heroRef, { amount: 0.32 });
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      ref={heroRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
      className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden bg-slate-950 text-white"
    >
      <img
        src="/brand/background-virtus-playcast.png"
        alt="Igrejas e estrutura de mídia"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,12,25,.9)_0%,rgba(3,12,25,.76)_45%,rgba(3,12,25,.52)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-20 text-center sm:px-10">
        <div className="flex max-w-3xl flex-col items-center">
          <motion.div
            animate={
              inView
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -14, scale: 0.985 }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.48,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <HeroBrandLogo className="h-28 w-[min(42rem,90vw)] sm:h-36" />
          </motion.div>
          <p className="mt-10 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm">
            Comunicação visual para igrejas
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Telões, patrocinadores e mensagens no momento certo.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            Planeje os slides da sua comunidade, valorize anunciantes e crie
            telões e patrocínios para usar nas transmissões da sua equipe.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              <Link href="/login">Acessar o painel</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <a href="#recursos">Conheça a plataforma</a>
            </Button>
          </div>
        </div>
      </div>
      <a
        href="#recursos"
        className="absolute bottom-7 left-1/2 -translate-x-1/2 border-b border-cyan-300/70 pb-1 text-xs text-white/70"
      >
        Explore a plataforma
      </a>
    </motion.section>
  );
}
