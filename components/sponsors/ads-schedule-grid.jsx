"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  Clock3,
  Eye,
  Layers3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/shared/loading-state";
import StaticMediaFrame from "@/components/shared/static-media-frame";
import { mapSponsorRow } from "@/lib/mappers/sponsors";
import { mergeSponsorSettings } from "@/lib/mappers/settings";
import {
  getScheduledCycle,
  getSchedulePosition,
} from "@/lib/services/telao-schedule";
import { getMediaDuration } from "@/lib/services/telao-player";
import { useStore } from "@/lib/store/store";

const CYCLES_BEFORE_AND_AFTER = 5;

function sponsorColor(id) {
  let hash = 0;
  for (const character of String(id || "telao-online")) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `hsl(${hash % 360} 62% 42%)`;
}

function formatTime(value) {
  try {
    const timestamp =
      value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(timestamp);
  } catch {
    return "—";
  }
}

function formatDate(value) {
  try {
    const timestamp =
      value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
    }).format(timestamp);
  } catch {
    return "—";
  }
}

function formatDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}min ${seconds % 60}s`
    : `${seconds}s`;
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function CurrentSponsorCard({ entry, cycle, progress, now, serverOffset, frozen = false }) {
  if (!entry || !cycle) return null;

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <p className="text-sm font-semibold text-foreground">
        {frozen ? "Programação do telão pausada" : "Agora no telão"}
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl text-white"
          style={{ backgroundColor: sponsorColor(entry.ad.id) }}
        >
          {entry.ad.src ? (
            <div className="absolute inset-0">
              <StaticMediaFrame
                src={entry.ad.src}
                alt={`Patrocínio de ${entry.ad.name}`}
                type={entry.ad.mediaType}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => event.currentTarget.remove()}
              />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-foreground">{entry.ad.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ciclo {cycle.cycle + 1} · Posição {entry.position + 1} de {cycle.entries.length}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {frozen
              ? "Programação congelada porque a contagem está desativada."
              : `Tempo restante: ${formatDuration(Math.max(0, entry.endsAt - (now + serverOffset)) / 1000)}`}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function AdsScheduleGrid() {
  const { churchSlug, sponsorSettings } = useStore();
  const [ads, setAds] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchedule = useCallback(async () => {
    if (!churchSlug) return;
    setError("");
    try {
      const response = await fetch(`/api/telao/${encodeURIComponent(churchSlug)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível carregar a grade.");
      }

      const settings = mergeSponsorSettings(payload.settings || {});
      const masterOnly = Boolean(settings.adsFilterMaster);
      setAds(
        (payload.sponsors || [])
          .map(mapSponsorRow)
          .filter(Boolean)
          .filter((ad) => ad.active && (!masterOnly || ad.type === "MASTER"))
          .map((ad) => ({
            ...ad,
            duration: getMediaDuration(ad, settings.mediaDurations),
          })),
      );
      const scheduleStartsAt =
        payload.schedule?.startsAt || payload.schedule?.starts_at || null;
      if (!Number.isFinite(new Date(scheduleStartsAt).getTime())) {
        throw new Error("A agenda oficial não possui um horário de início válido.");
      }
      setSchedule({ ...payload.schedule, startsAt: scheduleStartsAt });
      const serverTime = Date.parse(payload.schedule?.serverTime || "");
      setServerOffset(Number.isFinite(serverTime) ? serverTime - Date.now() : 0);
      setSelectedEntry(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a grade.",
      );
    } finally {
      setLoading(false);
    }
  }, [churchSlug]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // This is the exact administrative setting used to authorize official
  // display accounting. When disabled, the clock stops and preserves the
  // last computed schedule position as a read-only snapshot.
  const isMetricsEnabled = Boolean(sponsorSettings?.metricsEnabled);

  useEffect(() => {
    if (!isMetricsEnabled) return undefined;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, [isMetricsEnabled]);

  const currentPosition = useMemo(() => {
    if (!schedule || ads.length === 0) return null;
    return getSchedulePosition(ads, schedule, now + serverOffset);
  }, [ads, now, schedule, serverOffset]);

  const cycles = useMemo(() => {
    if (!currentPosition || !schedule) return [];
    return Array.from({ length: 11 }, (_, index) =>
      getScheduledCycle(
        ads,
        schedule,
        currentPosition.cycle - CYCLES_BEFORE_AND_AFTER + index,
      ),
    );
  }, [ads, currentPosition, schedule]);

  const activeCycle = cycles[CYCLES_BEFORE_AND_AFTER] || null;
  const currentEntry = activeCycle?.entries[currentPosition?.index] || null;
  const selectedCycle = cycles.find((cycle) => cycle.cycle === selectedEntry?.cycle);
  const selectedDetails = selectedCycle?.entries.find(
    (entry) => entry.ad.id === selectedEntry?.id,
  );
  const cycleDuration = activeCycle?.durationSeconds || 0;
  const totalViews = ads.reduce((total, ad) => total + Number(ad.views || 0), 0);
  const progress = currentEntry
    ? Math.min(
        100,
        Math.max(
          0,
          ((now + serverOffset - currentEntry.startsAt) /
            (currentEntry.durationSeconds * 1000)) *
            100,
        ),
      )
    : 0;

  if (loading) {
    return <LoadingState label="Carregando a grade do telão..." className="min-h-[70svh]" />;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Telão
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Programação do telão
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize a programação dos patrocinadores em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex min-w-48 items-center gap-3 rounded-xl border px-4 py-3 ${isMetricsEnabled ? "border-success/25 bg-success/10" : "border-border bg-muted/40"}`}
          >
            <span
              className={`h-3 w-3 rounded-full ${isMetricsEnabled ? "bg-success" : "bg-muted-foreground/50"}`}
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {isMetricsEnabled ? "Contagem ativa" : "Contagem desativada"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isMetricsEnabled ? "Contagem em andamento" : "Contagem desativada"}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
            <span className="px-3 text-xs text-muted-foreground">
              Ciclo atual
              <strong className="mt-1 block text-lg text-foreground">
                #{currentPosition ? currentPosition.cycle + 1 : "—"}
              </strong>
            </span>
            <span className="px-3 text-xs text-muted-foreground">
              Ciclos na visualização
              <strong className="mt-1 block text-lg text-foreground">
                {currentPosition
                  ? `${currentPosition.cycle - 4}–${currentPosition.cycle + 6}`
                  : "—"}
              </strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedule}
            disabled={!isMetricsEnabled}
            title={isMetricsEnabled ? "Atualizar grade" : "A grade está congelada enquanto a contagem estiver desativada"}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!error ? (
        <div className={!isMetricsEnabled ? "relative grayscale-[0.72] opacity-60" : undefined}>
          {!isMetricsEnabled ? (
            <div className="pointer-events-none absolute inset-0 z-10 cursor-not-allowed rounded-2xl" aria-hidden="true" />
          ) : null}
          <div className="mb-4 rounded-xl border border-dashed border-muted-foreground/35 bg-muted/30 px-4 py-3 text-sm text-muted-foreground" hidden={isMetricsEnabled}>
            A contagem de exibições está desativada. A programação abaixo foi
            congelada na última posição e não permite interação.
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={CalendarClock}
              label="Início da contagem"
              value={schedule?.startsAt ? formatTime(schedule.startsAt) : "—"}
              detail={schedule?.startsAt ? `Hoje, ${formatDate(schedule.startsAt)}` : "Horário oficial"}
            />
            <MetricCard
              icon={Layers3}
              label="Patrocínios ativos"
              value={String(ads.length)}
              detail={`${ads.length} patrocinador${ads.length === 1 ? "" : "es"} cadastrado${ads.length === 1 ? "" : "s"} para o evento`}
            />
            <MetricCard
              icon={Clock3}
              label="Duração do ciclo"
              value={formatDuration(cycleDuration)}
              detail="Soma das durações"
            />
            <MetricCard
              icon={Activity}
              label="Média por patrocínio"
              value={formatDuration(ads.length ? cycleDuration / ads.length : 0)}
              detail="Tempo médio de exibição"
            />
            <MetricCard
              icon={Eye}
              label="Exibições no evento"
              value={String(totalViews)}
              detail="Total registrado até o momento"
            />
          </div>

          {ads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Ative pelo menos um patrocinador no Painel do Telão para gerar a
              programação.
            </div>
          ) : null}

          <CurrentSponsorCard
            entry={currentEntry}
            cycle={activeCycle}
            progress={progress}
            now={now}
            serverOffset={serverOffset}
            frozen={!isMetricsEnabled}
          />

          {cycles.length ? (
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Programação por ciclos</h2>
                  <p className="text-sm text-muted-foreground">
                    Exibindo 11 ciclos: cinco anteriores, o atual e cinco
                    próximos.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-4 w-4" /> Horários de referência
                </div>
              </div>

              <div className="mt-5 overflow-x-auto pb-1">
                <div className="min-w-[760px]">
                  <div className="mb-2 grid grid-cols-[10rem_1fr] items-end gap-2 text-[11px] font-medium text-muted-foreground">
                    <span>Ciclo e horário de início</span>
                    <div className="flex justify-between px-1">
                      {Array.from({ length: 6 }, (_, index) => (
                        <span key={index}>{formatDuration((cycleDuration / 5) * index)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {cycles.map((cycle) => {
                      const isCurrentCycle = cycle.cycle === currentPosition?.cycle;
                      return (
                        <article
                          key={cycle.cycle}
                          className={`grid grid-cols-[10rem_1fr] items-stretch gap-2 rounded-lg border p-1.5 ${isCurrentCycle ? "border-success bg-success/5" : "border-border/70 bg-muted/25"}`}
                        >
                          <div className="flex items-center gap-2 px-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Ciclo {cycle.cycle + 1}</p>
                              <p className="text-xs text-muted-foreground">{formatTime(cycle.startsAt)}</p>
                            </div>
                            {isCurrentCycle ? <span className="rounded-full bg-success px-2 py-1 text-[10px] font-semibold text-success-foreground">{isMetricsEnabled ? "Atual" : "Congelado"}</span> : null}
                          </div>
                          <div className="flex h-11 overflow-hidden rounded-md bg-background">
                            {cycle.entries.map((entry) => {
                              const isCurrentAd = isCurrentCycle && currentPosition?.index === entry.position;
                              const isSelected = selectedEntry?.cycle === cycle.cycle && selectedEntry?.id === entry.ad.id;
                              const detail = `${entry.ad.name} · ${formatTime(entry.startsAt)}–${formatTime(entry.endsAt)} · ${formatDuration(entry.durationSeconds)}`;
                              return (
                                <button
                                  key={`${cycle.cycle}-${entry.ad.id}`}
                                  type="button"
                                  title={detail}
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    if (isMetricsEnabled) {
                                      setSelectedEntry({ cycle: cycle.cycle, id: entry.ad.id });
                                    }
                                  }}
                                  disabled={!isMetricsEnabled}
                                  className={`group relative min-w-10 border-r-2 border-card px-2 text-left last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed ${isCurrentAd ? "ring-2 ring-inset ring-white" : ""}`}
                                  style={{ backgroundColor: sponsorColor(entry.ad.id), flexGrow: entry.durationSeconds, flexBasis: 0 }}
                                >
                                  <span className="flex h-full items-center justify-between gap-2 overflow-hidden text-xs font-semibold text-white">
                                    <span className="truncate">{entry.ad.name}</span>
                                    <span>{formatDuration(entry.durationSeconds)}</span>
                                  </span>
                                  <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-max max-w-64 rounded-md bg-foreground px-2 py-1.5 text-[11px] leading-snug text-background shadow-lg group-hover:block group-focus-visible:block">
                                    {detail}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isMetricsEnabled
                      ? "Detalhes do ciclo atual"
                      : "Detalhes do ciclo pausado"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><p className="text-[11px] text-muted-foreground">Início</p><p className="mt-1 text-sm font-semibold text-foreground">{activeCycle ? formatTime(activeCycle.startsAt) : "—"}</p></div>
                    <div><p className="text-[11px] text-muted-foreground">Término</p><p className="mt-1 text-sm font-semibold text-foreground">{activeCycle ? formatTime(activeCycle.endsAt) : "—"}</p></div>
                    <div><p className="text-[11px] text-muted-foreground">Duração</p><p className="mt-1 text-sm font-semibold text-foreground">{formatDuration(cycleDuration)}</p></div>
                    <div><p className="text-[11px] text-muted-foreground">Patrocinadores</p><p className="mt-1 text-sm font-semibold text-foreground">{activeCycle?.entries.length || 0} patrocinador{(activeCycle?.entries.length || 0) === 1 ? "" : "es"}</p></div>
                  </div>
                </div>
              </div>

              {selectedDetails ? <p className="mt-3 text-xs text-muted-foreground">Selecionado: {selectedDetails.ad.name} · {formatTime(selectedDetails.startsAt)}–{formatTime(selectedDetails.endsAt)} · {formatDuration(selectedDetails.durationSeconds)}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
