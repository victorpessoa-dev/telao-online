"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Building2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import AppFooter from "@/components/shared/app-footer";
import PublicNavbar from "@/components/shared/public-navbar";
import HomeHero from "@/components/public/home-hero";
import { fetchPublicChurches } from "@/lib/services/churches";

export default function PublicHomePage() {
  const reduceMotion = useReducedMotion();
  const [churches, setChurches] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const loadChurches = () => {
      fetchPublicChurches({ signal: controller.signal })
        .then(setChurches)
        .catch((error) => {
          if (error?.name !== "AbortError") setChurches([]);
        });
    };
    const idleCallback = window.requestIdleCallback?.(loadChurches, {
      timeout: 1_500,
    });
    const timeoutId =
      idleCallback == null ? window.setTimeout(loadChurches, 250) : null;

    return () => {
      controller.abort();
      if (idleCallback != null) window.cancelIdleCallback?.(idleCallback);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);
  const reveal = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.16 },
    transition: { duration: reduceMotion ? 0 : 0.42, ease: "easeOut" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <HomeHero />
        <motion.section
          id="igrejas"
          {...reveal}
          className="landing-slice landing-slice-sky w-full scroll-mt-16"
        >
          <div className="mx-auto w-[min(80%,1600px)] py-24 lg:py-32 max-md:w-full max-md:px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-primary">Festas com transparência</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Conheça as parcerias que apoiam cada celebração
                </h2>
                <p className="mt-4 leading-7 text-muted-foreground">
                  Acesse páginas públicas com parceiros e registros de
                  divulgação de novenários, quermesses e festas paroquiais.
                </p>
              </div>
              <Link
                href="/comunidade"
                className="shrink-0 border-b border-primary pb-1 text-sm font-semibold text-primary transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Conhecer comunidades
              </Link>
            </div>
            {churches.length ? (
              <div className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {churches.slice(0, 5).map((church) => (
                  <Link
                    key={church.id}
                    href={`/${church.slug}`}
                    className="group flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative h-44 shrink-0 bg-muted">
                      {church.cover_url ? (
                        <img
                          src={church.cover_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="relative flex flex-1 flex-col justify-end p-6">
                      <div className="absolute -top-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-card shadow-sm">
                        <img
                          src={
                            church.logo_url || "/brand/virtus-playcast-mark.png"
                          }
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <h3 className="mt-8 truncate text-xl font-semibold group-hover:text-primary">
                        {church.name}
                      </h3>
                      {church.city ? (
                        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {church.city}
                        </p>
                      ) : null}
                      {church.description ? (
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {church.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                <Building2 className="mx-auto h-7 w-7" />
                <p className="mt-3 text-sm">
                  Ainda não há igrejas públicas disponíveis.
                </p>
              </div>
            )}
          </div>
        </motion.section>
        <motion.section
          id="recursos"
          {...reveal}
          className="landing-slice landing-slice-indigo w-full scroll-mt-16"
        >
          <div className="mx-auto w-[min(80%,1600px)] py-24 lg:py-32 max-md:w-full max-md:px-6">
            <div className="max-w-2xl">
              <p className="eyebrow text-primary">Parcerias bem divulgadas</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Clareza para a paróquia, parceiros e comunidade.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Centralize os apoiadores da festa e mantenha os dados de
                exibição acessíveis em uma página pública.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Feature
                number="01"
                title="Programação para o telão"
                text="Organize os materiais dos parceiros para cada noite do novenário ou festa."
                delay={0}
                reduceMotion={reduceMotion}
              />
              <Feature
                number="02"
                title="Transparência para os parceiros"
                text="Cada apoiador pode consultar os registros de exibição em uma página própria."
                delay={0.06}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>
        </motion.section>
        <motion.section
          {...reveal}
          className="landing-slice landing-slice-deep border-y border-border"
        >
          <div className="mx-auto grid w-[min(80%,1600px)] gap-10 py-20 lg:grid-cols-[.9fr_1.1fr] lg:py-28 max-md:w-full max-md:px-6">
            <div className="overflow-hidden rounded-3xl shadow-2xl shadow-slate-950/15">
              <img
                src="/brand/background-virtus-playcast.png"
                alt="Igrejas e mesa de produção audiovisual"
                loading="lazy"
                decoding="async"
                className="h-full min-h-72 w-full object-cover object-center"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="eyebrow text-primary">
                Feito para a vida paroquial
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Transparência que valoriza cada apoio à festa.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
                A vPlayCast simplifica a divulgação dos apoiadores e ajuda a
                demonstrar como cada parceria foi apresentada à comunidade.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Highlight text="Materiais organizados por celebração" />
                <Highlight text="Parceiros identificados com clareza" />
                <Highlight text="Registros públicos de exibição" />
                <Highlight text="Acesso simples pelo navegador" />
              </div>
            </div>
          </div>
        </motion.section>
        <motion.section
          {...reveal}
          className="landing-slice landing-slice-warm w-full bg-white text-center"
        >
          <div className="mx-auto w-[min(80%,1600px)] py-24 lg:py-32 max-md:w-full max-md:px-6">
            <div className="grid overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm lg:grid-cols-[1fr_.9fr]">
              <div className="p-7 sm:p-10 lg:p-12">
                <p className="eyebrow text-primary">Depois da festa</p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Uma prestação de contas que permanece acessível.
                </h2>
                <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
                  A divulgação dos parceiros não termina quando a festa acaba.
                  Cada parceria pode ser consultada com clareza pela comunidade.
                </p>
              </div>
              <div className="border-t border-border bg-muted/45 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <p className="text-sm font-semibold text-foreground">
                  O que fica registrado
                </p>
                <ul className="mt-6 space-y-5 text-sm leading-6 text-muted-foreground">
                  <li className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    Parceiros apresentados de forma identificável.
                  </li>
                  <li className="flex gap-3">
                    <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    Registros públicos das exibições realizadas no telão.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <AppFooter />
    </div>
  );
}

function Feature({ number, title, text, delay, reduceMotion }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: reduceMotion ? 0 : 0.36,
        delay: reduceMotion ? 0 : delay,
        ease: "easeOut",
      }}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <p className="text-xs font-semibold tracking-[.18em] text-primary">
        {number}
      </p>
      <h3 className="mt-7 text-lg font-semibold">{title}</h3>
      <p className="mt-2 leading-6 text-muted-foreground">{text}</p>
    </motion.article>
  );
}

function Highlight({ text }) {
  return (
    <div className="border-l-2 border-primary/45 pl-3 text-sm font-medium leading-6">
      {text}
    </div>
  );
}
