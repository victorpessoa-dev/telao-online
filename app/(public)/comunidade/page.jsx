"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AppFooter from "@/components/shared/app-footer";
import PublicNavbar from "@/components/shared/public-navbar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicChurches } from "@/lib/services/churches";

function ChurchCard({ church, index, reduceMotion }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.3,
        delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.2),
      }}
      className="h-full"
    >
      <Link
        href={`/${church.slug}`}
        className="group flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative h-44 shrink-0 bg-muted">
          {church.cover_url ? (
            <img
              src={church.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="relative flex flex-1 flex-col p-6">
          <div className="absolute -top-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-card shadow-sm">
            <img
              src={church.logo_url || "/brand/virtus-playcast-mark.png"}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mt-8 truncate text-xl font-semibold group-hover:text-primary">
            {church.name}
          </h2>
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
    </motion.div>
  );
}

function CommunitySkeleton() {
  return (
    <section
      aria-label="Carregando comunidades"
      aria-busy="true"
      className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2 xl:grid-cols-4"
    >
      <span className="sr-only" role="status">
        Carregando comunidades...
      </span>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="min-h-[22rem] overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="relative space-y-4 p-6 pt-12">
            <Skeleton className="absolute -top-10 h-20 w-20 rounded-2xl border-4 border-card" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-2/5" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function CommunityPage() {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchPublicChurches()
      .then(setChurches)
      .catch(() => setChurches([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleChurches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return churches;

    return churches.filter((church) =>
      [church.name, church.city].some((value) =>
        String(value || "")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery),
      ),
    );
  }, [churches, query]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="public-page-shell mx-auto w-[min(80%,1600px)] flex-1 py-14 lg:py-20 max-md:w-full max-md:px-6">
        <Link href="/" className="back-link mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <p className="eyebrow text-primary">Comunidades ativas</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Encontre a sua igreja
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Conheça as igrejas com perfil público ativo na vPlayCast.
          </p>
        </motion.header>

        <div className="relative mt-8 max-w-lg">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por igreja ou cidade"
            className="h-11 pl-10"
            aria-label="Buscar comunidade por igreja ou cidade"
          />
        </div>

        {loading ? <CommunitySkeleton /> : null}

        {!loading && visibleChurches.length ? (
          <section
            aria-label="Comunidades disponíveis"
            className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2 xl:grid-cols-4"
          >
            {visibleChurches.map((church, index) => (
              <ChurchCard
                key={church.id}
                church={church}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </section>
        ) : null}

        {!loading && !visibleChurches.length ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <Building2 className="mx-auto h-7 w-7" />
            <p className="mt-3 text-sm">
              {churches.length
                ? "Nenhuma comunidade encontrada para esta busca."
                : "Ainda não há comunidades públicas disponíveis."}
            </p>
          </div>
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}
