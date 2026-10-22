"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Eye,
  History,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PaginationControls from "@/components/shared/pagination-controls";
import AppFooter from "@/components/shared/app-footer";
import LoadingState from "@/components/shared/loading-state";
import PageError from "@/components/shared/page-error";
import PageContainer from "@/components/layout/page-container";
import PublicNavbar from "@/components/shared/public-navbar";
import { TimeSeriesLineChart } from "@/components/shared/simple-charts";
import {
  useMediaBackgroundColor,
  YouTubeVideo,
} from "@/components/sponsors/telao-media";
import { isSafePublicUrl } from "@/lib/utils/url";
import { getYouTubeEmbedUrl } from "@/lib/utils/video-source";

const REPORT_PAGE_SIZE = 20;

function formatarTempo(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;

  if (horas > 0) return `${horas}h ${minutos}m`;
  if (minutos > 0) return `${minutos}m ${resto}s`;
  return `${resto}s`;
}

function formatarDataHora(data) {
  if (!data) return "Nunca exibido";
  return new Date(data).toLocaleString("pt-BR");
}

function calcularSaidaExibicao(log) {
  if (!log?.displayedAt) return null;
  const startedAt = new Date(log.displayedAt);
  const duration = Math.max(0, Number(log.durationSeconds) || 0);
  return new Date(startedAt.getTime() + duration * 1000);
}

function preverProximaExibicao(logs) {
  if (logs.length < 2) return null;

  const ordered = logs
    .map((log) => new Date(log.displayedAt).getTime())
    .sort((a, b) => a - b);
  const intervals = [];

  for (let index = 1; index < ordered.length; index += 1) {
    intervals.push(ordered[index] - ordered[index - 1]);
  }

  if (intervals.length === 0) return null;
  const averageInterval =
    intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return new Date(ordered[ordered.length - 1] + averageInterval);
}

function MediaPreview({ advertiser }) {
  const backgroundColor = useMediaBackgroundColor(
    advertiser?.src,
    advertiser?.mediaType,
  );
  const backgroundStyle = {
    backgroundColor,
    backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${backgroundColor} 82%, white 18%), ${backgroundColor})`,
  };
  const youtubeEmbedUrl =
    advertiser?.mediaType === "video"
      ? getYouTubeEmbedUrl(advertiser.src, { autoplay: true, controls: false })
      : "";

  if (!advertiser?.src) return <div className="h-full w-full bg-muted" />;

  if (advertiser.mediaType === "video") {
    return (
      <div className="h-full w-full" style={backgroundStyle}>
        {youtubeEmbedUrl ? (
          <YouTubeVideo
            source={advertiser.src}
            title={`Vídeo de ${advertiser.name}`}
            className="aspect-video h-full w-full"
            endOffset={10}
            cropPercent={12}
          />
        ) : (
          <video
            src={advertiser.src}
            className="pointer-events-none h-full w-full object-cover object-center"
            autoPlay
            muted
            playsInline
            loop
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            tabIndex={-1}
            referrerPolicy="no-referrer"
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (
                Number.isFinite(video.duration) &&
                video.duration > 10 &&
                video.duration - video.currentTime <= 10
              ) {
                video.pause();
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={backgroundStyle}>
      <img
        src={advertiser.src}
        alt={advertiser.name}
        className="h-full w-full object-cover object-center"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function AnuncianteDetalhePage({ churchId = "", slug = "" }) {
  const params = useParams();
  const id = params?.id;
  const [data, setData] = useState({
    advertiser: null,
    logs: [],
    daily: [],
    pagination: { page: 1, pageSize: REPORT_PAGE_SIZE, totalItems: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      try {
        setLoading(true);
        setError(null);
        const query = churchId
          ? `?churchId=${encodeURIComponent(churchId)}&page=${currentPage}&pageSize=${REPORT_PAGE_SIZE}`
          : "";
        const response = await fetch(`/api/anunciantes/${id}${query}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.advertiser)
          throw new Error(payload.error || "Falha ao carregar anunciante");

        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha ao carregar anunciante",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) carregar();
    else {
      setError("Anunciante não encontrado");
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [churchId, currentPage, id, reloadVersion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [id]);

  const advertiser = data?.advertiser ?? null;
  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const daily = useMemo(() => data?.daily ?? [], [data?.daily]);
  const pagination = data?.pagination ?? {
    page: currentPage,
    pageSize: REPORT_PAGE_SIZE,
    totalItems: 0,
  };
  const chronologicalLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(a.displayedAt) - new Date(b.displayedAt),
      ),
    [logs],
  );
  const chartData = useMemo(
    () =>
      daily.map((item) => ({
        ...item,
        date: new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR"),
      })),
    [daily],
  );
  const proximaExibicao = useMemo(
    () => preverProximaExibicao(chronologicalLogs),
    [chronologicalLogs],
  );

  const rotaPublica = slug ? `/${slug}/ads-telao` : "";
  const totalExibicoes = advertiser?.views || 0;
  const totalDuracao = advertiser?.totalSeconds || 0;
  const mediaPorExibicao =
    totalExibicoes > 0 ? Math.round(totalDuracao / totalExibicoes) : 0;
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalItems / pagination.pageSize),
  );
  const paginatedLogs = useMemo(
    () =>
      logs.map((log, index) => ({
        ...log,
        displayNumber:
          pagination.totalItems -
          (pagination.page - 1) * pagination.pageSize -
          index,
      })),
    [logs, pagination.page, pagination.pageSize, pagination.totalItems],
  );
  const viewsChartData = useMemo(
    () => chartData.map((item) => ({ label: item.date, value: item.total })),
    [chartData],
  );
  const secondsChartData = useMemo(
    () =>
      chartData.map((item) => ({
        label: item.date,
        value: item.seconds,
        className: "bg-chart-2",
      })),
    [chartData],
  );

  if (loading) {
    return <LoadingState fullScreen label="Carregando anunciante..." />;
  }

  if (error || !advertiser) {
    return (
      <PageError
        title="Não foi possível carregar este anunciante."
        description={error || "Anunciante não encontrado."}
        onRetry={() => setReloadVersion((version) => version + 1)}
      />
    );
  }

  return (
    <div className="public-page-shell min-h-screen bg-background">
      <PublicNavbar />
      <PageContainer>
        <Link href={slug ? `/${slug}` : "/"} className="back-link">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página pública
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-t-xl bg-black">
              <MediaPreview advertiser={advertiser} />
            </div>
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="text-2xl font-bold">{advertiser.name}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Tipo: {advertiser.type}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MonitorPlay className="h-4 w-4" />
                Rota pública: <code>{rotaPublica}</code>
              </div>
              {isSafePublicUrl(advertiser.websiteUrl) ? (
                <a
                  href={advertiser.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="truncate">{advertiser.websiteUrl}</span>
                </a>
              ) : null}
              <div className="text-sm text-muted-foreground">
                Última exibição: {formatarDataHora(advertiser.lastDisplayedAt)}
              </div>
              <div className="text-sm text-muted-foreground">
                Próxima exibição estimada:{" "}
                {proximaExibicao
                  ? formatarDataHora(proximaExibicao.toISOString())
                  : "Sem dados suficientes"}
              </div>
              <div className="text-xs text-muted-foreground">
                A previsão é uma estimativa calculada a partir do intervalo
                médio entre as exibições registradas.
              </div>
              <Button asChild variant="outline">
                <Link href={rotaPublica} target="_blank">
                  Abrir {rotaPublica}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Metric title="Total de exibições" value={totalExibicoes} />
            <Metric
              title="Tempo total exibido"
              value={formatarTempo(totalDuracao)}
            />
            <Metric
              title="Duração padrão"
              value={formatarTempo(advertiser.duration)}
            />
            <Metric
              title="Média por exibição"
              value={formatarTempo(mediaPorExibicao)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Relatório visual</CardTitle>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-6 overflow-hidden lg:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Exibições por dia</h3>
                <p className="text-xs text-muted-foreground">
                  Quantidade de vezes em que o patrocinador apareceu.
                </p>
              </div>
              <TimeSeriesLineChart
                data={viewsChartData}
                valueFormatter={(value) =>
                  `${value} exibição${value === 1 ? "" : "es"}`
                }
                emptyMessage="Ainda não há histórico suficiente para o gráfico."
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Tempo exibido por dia</h3>
                <p className="text-xs text-muted-foreground">
                  Soma do tempo registrado em cada exibição.
                </p>
              </div>
              <TimeSeriesLineChart
                data={secondsChartData}
                valueFormatter={formatarTempo}
                axisFormatter={formatarTempo}
                emptyMessage="Ainda não há tempo registrado para o gráfico."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários no telão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pagination.totalItems === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhuma exibição registrada.
              </div>
            ) : (
              paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>
                        {log.displayNumber}° exibição ·{" "}
                        {formatarDataHora(log.displayedAt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Origem: {log.source}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />{log.viewsCount || 1}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatarTempo(log.durationSeconds)}
                    </span>
                  </div>
                </div>
              ))
            )}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={pagination.totalItems}
              itemLabel="registros"
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>

        <AppFooter className="px-0" />
      </PageContainer>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
