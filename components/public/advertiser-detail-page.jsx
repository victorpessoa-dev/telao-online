"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Download,
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
import PageContainer from "@/components/layout/page-container";
import PublicNavbar from "@/components/shared/public-navbar";
import { TimeSeriesLineChart } from "@/components/shared/simple-charts";
import { downloadWorkbook } from "@/lib/export/simple-xlsx";
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

function agruparExibicoesPorDia(logs) {
  const grouped = logs.reduce((acc, log) => {
    const key = new Date(log.displayedAt).toLocaleDateString("pt-BR");
    acc[key] = {
      total: (acc[key]?.total || 0) + 1,
      seconds: (acc[key]?.seconds || 0) + (Number(log.durationSeconds) || 0),
    };
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, values]) => ({
    date,
    total: values.total,
    seconds: values.seconds,
  }));
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
            className="pointer-events-none h-full w-full object-contain"
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
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function AnuncianteDetalhePage({ churchId = "", slug = "" }) {
  const params = useParams();
  const id = params?.id;
  const [data, setData] = useState({ advertiser: null, logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      try {
        setLoading(true);
        const query = churchId
          ? `?churchId=${encodeURIComponent(churchId)}`
          : "";
        const response = await fetch(`/api/anunciantes/${id}${query}`);
        const payload = await response.json();
        if (!response.ok)
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
    return () => {
      cancelled = true;
    };
  }, [churchId, id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [id]);

  const advertiser = data?.advertiser ?? null;
  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const chronologicalLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(a.displayedAt) - new Date(b.displayedAt),
      ),
    [logs],
  );
  const chartData = useMemo(
    () => agruparExibicoesPorDia(chronologicalLogs),
    [chronologicalLogs],
  );
  const proximaExibicao = useMemo(
    () => preverProximaExibicao(chronologicalLogs),
    [chronologicalLogs],
  );

  const rotaPublica = slug ? `/${slug}/ads-telao` : "";
  const totalExibicoes = Math.max(logs.length, advertiser?.views || 0);
  const totalDuracao = Math.max(
    logs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0),
    advertiser?.totalSeconds || 0,
  );
  const mediaPorExibicao =
    totalExibicoes > 0 ? Math.round(totalDuracao / totalExibicoes) : 0;
  const totalPages = Math.max(1, Math.ceil(logs.length / REPORT_PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * REPORT_PAGE_SIZE;
    return chronologicalLogs
      .slice(start, start + REPORT_PAGE_SIZE)
      .map((log, index) => ({
        ...log,
        displayNumber: start + index + 1,
      }));
  }, [chronologicalLogs, currentPage]);
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
      <div className="min-h-screen bg-background p-8 text-sm text-destructive">
        {error || "Anunciante não encontrado"}
      </div>
    );
  }

  const baixarRelatorio = () => {
    const downloadedAt = new Date();
    const firstLog = chronologicalLogs[0] || null;
    const lastLog = chronologicalLogs[chronologicalLogs.length - 1] || null;
    const safeName = advertiser.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const stamp = downloadedAt
      .toLocaleString("sv-SE")
      .replace(" ", "_")
      .replace(/:/g, "-");

    downloadWorkbook({
      filename: `relatorio-${safeName || "patrocinador"}-${stamp}.xlsx`,
      sheets: [
        {
          name: "Patrocinador",
          rows: [
            ["Campo", "Valor"],
            ["Nome", advertiser.name],
            ["Site do anunciante", advertiser.websiteUrl || ""],
            ["Tipo", advertiser.type],
            ["Rota pública", rotaPublica],
            ["Duração padrão (s)", advertiser.duration],
            ["Exibições acumuladas", totalExibicoes],
            ["Tempo acumulado (s)", totalDuracao],
            ["Primeira exibição ISO", firstLog?.displayedAt || ""],
            [
              "Última exibição ISO",
              advertiser.lastDisplayedAt || lastLog?.displayedAt || "",
            ],
            ["Relatório baixado em ISO", downloadedAt.toISOString()],
          ],
        },
        {
          name: "Resumo",
          rows: [
            ["Campo", "Valor"],
            ["Patrocinador", advertiser.name],
            ["Site do anunciante", advertiser.websiteUrl || ""],
            ["Tipo", advertiser.type],
            ["Rota pública", rotaPublica],
            ["Total de exibições", totalExibicoes],
            ["Tempo total exibido (s)", totalDuracao],
            ["Duração padrão (s)", advertiser.duration],
            ["Média por exibição (s)", mediaPorExibicao],
            ["Primeira exibição ISO", firstLog?.displayedAt || ""],
            [
              "Última exibição ISO",
              advertiser.lastDisplayedAt || lastLog?.displayedAt || "",
            ],
            [
              "Próxima exibição estimada ISO",
              proximaExibicao ? proximaExibicao.toISOString() : "",
            ],
          ],
        },
        {
          name: "Horários no telão",
          rows: [
            [
              "Exibição",
              "Entrada ISO",
              "Entrada formatada",
              "Saída estimada ISO",
              "Saída estimada formatada",
              "Duração (s)",
              "Duração formatada",
              "Origem",
            ],
            ...chronologicalLogs.map((log, index) => {
              const endedAt = calcularSaidaExibicao(log);

              return [
                `${index + 1}°`,
                log.displayedAt || "",
                formatarDataHora(log.displayedAt),
                endedAt ? endedAt.toISOString() : "",
                endedAt ? formatarDataHora(endedAt.toISOString()) : "",
                log.durationSeconds || 0,
                formatarTempo(log.durationSeconds),
                log.source || "telao",
              ];
            }),
          ],
        },
        {
          name: "Graficos",
          rows: [
            ["Dia", "Exibições", "Tempo exibido (s)", "Tempo exibido"],
            ...chartData.map((item) => [
              item.date,
              item.total,
              item.seconds,
              formatarTempo(item.seconds),
            ]),
          ],
        },
      ],
    });
  };

  return (
    <div className="public-page-shell min-h-screen bg-background">
      <PublicNavbar />
      <PageContainer>
        <Link
          href={slug ? `/${slug}` : "/"}
          className="back-link"
        >
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
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={rotaPublica} target="_blank">
                    Abrir {rotaPublica}
                  </Link>
                </Button>
                <Button variant="outline" onClick={baixarRelatorio}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar relatório público
                </Button>
              </div>
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
            {logs.length === 0 ? (
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
                      <Eye className="h-4 w-4" />1
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
              totalItems={logs.length}
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
