"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Clock3,
  Eye,
  Gauge,
  MapPin,
  Play,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AppFooter from "@/components/shared/app-footer";
import EmptyState from "@/components/shared/empty-state";
import LoadingState from "@/components/shared/loading-state";
import PageError from "@/components/shared/page-error";
import PaginationControls from "@/components/shared/pagination-controls";
import PublicNavbar from "@/components/shared/public-navbar";
import { normalizeSocialLinks } from "@/components/shared/social-links";
import StaticMediaFrame from "@/components/shared/static-media-frame";
import SponsorInvitation from "@/components/public/sponsor-invitation";
import { mapSponsorRow } from "@/lib/mappers/sponsors";

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = Math.round(total % 60);
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
}

function SponsorPreview({ sponsor }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <StaticMediaFrame
        src={sponsor.src}
        alt={sponsor.name}
        type={sponsor.mediaType}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

function ProfileMetric({
  icon: Icon,
  label,
  value,
  detail,
  index,
  reduceMotion,
}) {
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.3,
        delay: reduceMotion ? 0 : 0.08 + index * 0.05,
        ease: "easeOut",
      }}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
    </motion.article>
  );
}

export default function ChurchPublicPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [church, setChurch] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sponsorPage, setSponsorPage] = useState(1);
  const [sponsorsPerPage, setSponsorsPerPage] = useState(25);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function loadChurch() {
      if (!slug) return;
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/igreja/${encodeURIComponent(slug)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.church)
          throw new Error(payload.error || "Igreja não encontrada.");

        if (cancelled) return;
        setChurch(payload.church);
        setSponsors((payload.sponsors || []).map(mapSponsorRow).filter(Boolean));

        void fetch(`/api/igreja/${encodeURIComponent(slug)}/visita`, {
          method: "POST",
          keepalive: true,
        })
          .then((visitResponse) => visitResponse.json())
          .then((visitPayload) => {
            if (cancelled || !visitPayload?.counted) return;
            setChurch((current) =>
              current
                ? { ...current, public_views: visitPayload.views }
                : current,
            );
          })
          .catch(() => {});
      } catch (cause) {
        if (!cancelled) {
          setChurch(null);
          setSponsors([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar esta igreja.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChurch();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updatePageSize = () =>
      setSponsorsPerPage(mediaQuery.matches ? 50 : 25);

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, []);

  const filteredSponsors = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!term) return sponsors;
    return sponsors.filter((sponsor) =>
      sponsor.name.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [searchTerm, sponsors]);
  const sponsorTotalPages = Math.max(
    1,
    Math.ceil(filteredSponsors.length / sponsorsPerPage),
  );
  const paginatedSponsors = useMemo(() => {
    const start = (sponsorPage - 1) * sponsorsPerPage;
    return filteredSponsors.slice(start, start + sponsorsPerPage);
  }, [filteredSponsors, sponsorPage, sponsorsPerPage]);

  useEffect(() => {
    setSponsorPage(1);
  }, [searchTerm, sponsorsPerPage]);

  useEffect(() => {
    if (sponsorPage > sponsorTotalPages) setSponsorPage(sponsorTotalPages);
  }, [sponsorPage, sponsorTotalPages]);
  const socialLinks = normalizeSocialLinks({
    parishSocialLinks: church?.social_links,
  });
  const profileMetrics = useMemo(() => {
    const activeSponsors = sponsors.length;
    const totalSeconds = sponsors.reduce(
      (total, sponsor) => total + (Number(sponsor.totalSeconds) || 0),
      0,
    );
    const totalDisplays = sponsors.reduce(
      (total, sponsor) => total + (Number(sponsor.views) || 0),
      0,
    );

    return {
      activeSponsors,
      totalSeconds,
      totalDisplays,
      averageSeconds:
        activeSponsors > 0 ? Math.round(totalSeconds / activeSponsors) : 0,
      profileViews: Number(church?.public_views) || 0,
    };
  }, [church?.public_views, sponsors]);

  if (loading)
    return <LoadingState fullScreen label="Carregando página da igreja..." />;

  if (!church) {
    return (
      <PageError
        title="Igreja não encontrada."
        description={error || "Confira o endereço acessado."}
        homeHref="/igrejas"
        homeLabel="Ver igrejas"
        eyebrow="Igreja não encontrada"
      />
    );
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicNavbar />
        <main className="mx-auto grid w-full max-w-2xl flex-1 place-items-center px-6 py-16 text-center">
          <Link href="/igrejas" className="back-link absolute left-6 top-24">
            <ArrowLeft className="h-4 w-4" />
            Ver igrejas
          </Link>
          <EmptyState
            icon={Building2}
            title="Igreja não encontrada"
            description={error || "Confira o endereço acessado."}
          />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="public-page-shell flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto w-[min(80%,1600px)] flex-1 space-y-8 py-8 max-md:w-full max-md:px-4">
        <Link href="/igrejas" className="back-link">
          <ArrowLeft className="h-4 w-4" />
          Ver igrejas
        </Link>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="relative h-40 bg-muted sm:h-52">
            {church.cover_url ? (
              <>
                <img
                  src={church.cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </>
            ) : null}
          </div>
          <div className="relative p-5 sm:p-6">
            <div className="absolute -top-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-card sm:-top-14 sm:h-28 sm:w-28">
              <img
                src={church.logo_url || "/brand/logo-telao-online.webp"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-11 flex flex-col gap-4 sm:mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">
                  {church.name}
                </h1>
                {church.city && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {church.city}
                  </p>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(({ key, label, url, Icon }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      title={label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="sr-only">{label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <SponsorInvitation church={church} slug={slug} sponsors={sponsors} />

        <section
          aria-label="Resumo do evento"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <ProfileMetric
            icon={Users}
            label="Patrocínios ativos"
            value={profileMetrics.activeSponsors}
            detail="Apoiadores disponíveis neste evento"
            index={0}
            reduceMotion={reduceMotion}
          />
          <ProfileMetric
            icon={Clock3}
            label="Tempo exibido"
            value={formatDuration(profileMetrics.totalSeconds)}
            detail="Soma do tempo registrado no telão"
            index={1}
            reduceMotion={reduceMotion}
          />
          <ProfileMetric
            icon={Gauge}
            label="Média por patrocínio"
            value={formatDuration(profileMetrics.averageSeconds)}
            detail="Tempo total dividido pelos apoiadores ativos"
            index={2}
            reduceMotion={reduceMotion}
          />
          <ProfileMetric
            icon={BarChart3}
            label="Visitas ao perfil"
            value={profileMetrics.profileViews.toLocaleString("pt-BR")}
            detail={`${profileMetrics.totalDisplays.toLocaleString("pt-BR")} exibições registradas`}
            index={3}
            reduceMotion={reduceMotion}
          />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Patrocinadores do evento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conheça os apoiadores e abra cada perfil para consultar o
              relatório público de exibições.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar patrocinador"
                className="pl-9"
              />
            </div>
            <Link
              href={`/${slug}/ads-telao`}
              target="_blank"
              className="inline-flex shrink-0 items-center gap-2 self-center border-b-2 border-primary pb-1 text-sm font-semibold text-primary transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Play className="h-4 w-4" />
              Telão
            </Link>
          </div>
        </section>

        {filteredSponsors.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum patrocinador encontrado"
            description="Não há patrocinadores ativos para exibir no momento."
          />
        ) : (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {paginatedSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.28,
                  delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2),
                }}
              >
                <Link
                  href={`/${slug}/parceiros/${sponsor.id}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full overflow-hidden transition group-hover:border-primary/60 group-hover:shadow-md">
                    <div className="aspect-video">
                      <SponsorPreview sponsor={sponsor} />
                    </div>
                    <CardContent className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {sponsor.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDuration(sponsor.duration)} por exibição
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        {sponsor.views}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </section>
        )}
        {filteredSponsors.length ? (
          <PaginationControls
            currentPage={sponsorPage}
            totalPages={sponsorTotalPages}
            totalItems={filteredSponsors.length}
            itemLabel="patrocinadores"
            onPageChange={setSponsorPage}
          />
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}
