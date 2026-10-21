"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Clock3, Eye, Megaphone } from "lucide-react";
import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DonutChart,
  HorizontalBarChart,
} from "@/components/shared/simple-charts";
import { useStore } from "@/lib/store/store";

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = Math.round(total % 60);
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  index,
  reduceMotion,
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.3,
        delay: reduceMotion ? 0 : index * 0.06,
        ease: "easeOut",
      }}
    >
      <Card className="h-full overflow-hidden">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight">
              {value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <PageContainer size="narrow" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando painel...
      </span>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="h-[118px]">
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        {["chart", "composition"].map((key) => (
          <Card key={key} className="h-[326px]">
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-10 w-3/5" />
            </CardContent>
          </Card>
        ))}
      </section>
    </PageContainer>
  );
}

export default function DashboardContent() {
  const { ads, churchSlug, publicViews, error, isLoaded, reload } = useStore();
  const reduceMotion = useReducedMotion();
  const metrics = useMemo(() => {
    const activeAds = ads.filter((ad) => ad.active);
    const totalDisplays = activeAds.reduce(
      (sum, ad) => sum + (Number(ad.views) || 0),
      0,
    );
    const totalSeconds = activeAds.reduce(
      (sum, ad) => sum + (Number(ad.totalSeconds) || 0),
      0,
    );

    return {
      activeAds,
      totalDisplays,
      totalSeconds,
      averageSeconds:
        activeAds.length > 0 ? Math.round(totalSeconds / activeAds.length) : 0,
      masterAds: activeAds.filter((ad) => ad.type === "MASTER").length,
    };
  }, [ads]);
  const sponsorChartData = useMemo(
    () =>
      [...metrics.activeAds]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((ad, index) => ({
          label: ad.name,
          value: ad.views || 0,
          className: `bg-chart-${(index % 5) + 1}`,
        })),
    [metrics.activeAds],
  );
  const typeChartData = useMemo(
    () =>
      [
        {
          label: "Normal",
          value: metrics.activeAds.filter((ad) => ad.type !== "MASTER").length,
          className: "bg-chart-1",
        },
        {
          label: "Master",
          value: metrics.masterAds,
          className: "bg-chart-2",
        },
      ].filter((item) => item.value > 0),
    [metrics.activeAds, metrics.masterAds],
  );

  if (!isLoaded) return <DashboardSkeleton />;

  return (
    <PageContainer size="narrow">
      {error ? (
        <div
          className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={reload}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse o que está no ar e faça ajustes rápidos.
          </p>
        </div>
        <div className="flex gap-2">
          {churchSlug ? (
            <Button asChild variant="outline">
              <Link href={`/${churchSlug}`}>Página pública</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/painel-telao">Patrocínios</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Megaphone}
          label="Patrocínios ativos"
          value={metrics.activeAds.length}
          detail={`${ads.length} cadastrados para o evento`}
          index={0}
          reduceMotion={reduceMotion}
        />
        <SummaryCard
          icon={Clock3}
          label="Tempo exibido"
          value={formatDuration(metrics.totalSeconds)}
          detail="Soma de todas as exibições no telão"
          index={1}
          reduceMotion={reduceMotion}
        />
        <SummaryCard
          icon={BarChart3}
          label="Média por patrocínio"
          value={formatDuration(metrics.averageSeconds)}
          detail={`${metrics.totalDisplays.toLocaleString("pt-BR")} exibições registradas`}
          index={2}
          reduceMotion={reduceMotion}
        />
        <SummaryCard
          icon={Eye}
          label="Visitas ao perfil"
          value={Number(publicViews || 0).toLocaleString("pt-BR")}
          detail={`${metrics.masterAds} destaque${metrics.masterAds === 1 ? "" : "s"} Master ativo${metrics.masterAds === 1 ? "" : "s"}`}
          index={3}
          reduceMotion={reduceMotion}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, delay: 0.18 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Patrocinadores mais exibidos</CardTitle>
              <CardDescription>
                Passe sobre as barras para comparar as exibições registradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <HorizontalBarChart
                data={sponsorChartData}
                valueFormatter={(value) =>
                  `${value.toLocaleString("pt-BR")} ${value === 1 ? "exibição" : "exibições"}`
                }
                emptyMessage="As exibições aparecerão aqui quando o telão começar a registrar dados."
              />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, delay: 0.24 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Composição da playlist</CardTitle>
              <CardDescription>
                Distribuição dos patrocínios ativos por prioridade.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <DonutChart
                data={typeChartData}
                valueFormatter={(value) => value.toLocaleString("pt-BR")}
                emptyMessage="Cadastre um patrocínio para visualizar a composição."
              />
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </PageContainer>
  );
}
