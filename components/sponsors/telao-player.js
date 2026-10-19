"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingIndicator } from "@/components/shared/loading-state";
import { createSupabaseBrowserClient } from "@/services/supabase/browser";
import TelaoMedia from "@/components/sponsors/telao-media";
import { mapSponsorRow } from "@/lib/mappers/sponsors";
import { mergeSponsorSettings } from "@/lib/mappers/settings";
import {
  fetchPublicSponsors,
  fetchSponsorSettings,
} from "@/lib/repositories/sponsors";
import {
  buildAdsSignature,
  emptyTelaoSettings,
  getMediaDuration,
} from "@/lib/services/telao-player";
import {
  getSchedulePosition,
  millisecondsUntilScheduleChange,
} from "@/lib/services/telao-schedule";

const ADS_CACHE_KEY = "vplaycast:telao:ads-cache";
const LOG_QUEUE_KEY = "vplaycast:telao:log-queue";
const ADS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LOG_FLUSH_INTERVAL_MS = 2 * 60 * 1000;
const LOG_BATCH_SIZE = 100;
const DISPLAY_CLIENT_KEY = "vplaycast:official-display-client";

function readLogQueue(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const value = Math.floor(Math.random() * 16);
    const digit = token === "x" ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

function getDisplaySessionFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const sessionId = params.get("displaySession");
  const token = params.get("displayToken");
  if (!sessionId || !token) return null;
  let clientId = sessionStorage.getItem(DISPLAY_CLIENT_KEY);
  if (!clientId) {
    clientId = createEventId();
    sessionStorage.setItem(DISPLAY_CLIENT_KEY, clientId);
  }
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return { sessionId, token, clientId };
}
export default function TelaoPlayer({
  kind = "NORMAL",
  backgroundMode = "auto",
  filterMaster = false,
  churchId,
  churchSlug = "",
}) {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sponsorSettings, setSponsorSettings] = useState(emptyTelaoSettings);
  const [loaded, setLoaded] = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [globalSchedule, setGlobalSchedule] = useState(null);
  const adsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const lastSignatureRef = useRef("");
  const lastContentVersionRef = useRef(null);
  const lastScheduleVersionRef = useRef(null);
  const globalScheduleRef = useRef(null);
  const serverClockOffsetRef = useRef(0);
  const officialDisplayRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const flushTimerRef = useRef(null);
  const rotationTimerRef = useRef(null);
  const advancingRef = useRef(false);
  const flushingLogsRef = useRef(false);
  const cacheKey = `${ADS_CACHE_KEY}:${churchId || "default"}:${kind}`;
  // A screen must never flush another church's offline events after an
  // operator changes routes in the same browser.
  const logQueueKey = `${LOG_QUEUE_KEY}:${churchId || "default"}:${kind}`;

  useEffect(() => {
    adsRef.current = ads;
  }, [ads]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    globalScheduleRef.current = globalSchedule;
  }, [globalSchedule]);

  useEffect(() => {
    officialDisplayRef.current = getDisplaySessionFromHash();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  const preloadImages = useCallback((items) => {
    items
      .filter((item) => item.mediaType === "image" && item.src)
      .forEach((item) => {
        const image = new Image();
        image.src = item.src;
      });
  }, []);

  const enqueueLog = useCallback(
    (log) => {
      const currentQueue = readLogQueue(logQueueKey);
      const displayedAt = new Date(log.displayedAt || Date.now());
      const day = displayedAt.toISOString().slice(0, 10);
      const aggregateKey = `${log.sponsorId}:${day}:${log.source || "telao"}:${log.displaySessionId}`;
      const existingIndex = currentQueue.findIndex(
        (item) => item.aggregateKey === aggregateKey,
      );
      const nextLog = {
        ...log,
        aggregateKey,
        displayedAt: displayedAt.toISOString(),
        durationSeconds: Math.max(0, Number(log.durationSeconds) || 0),
        viewsCount: 1,
        eventId: createEventId(),
      };
      if (existingIndex >= 0) {
        const previous = currentQueue[existingIndex];
        currentQueue[existingIndex] = {
          ...previous,
          displayedAt: nextLog.displayedAt,
          durationSeconds: previous.durationSeconds + nextLog.durationSeconds,
          viewsCount: previous.viewsCount + 1,
        };
      } else {
        currentQueue.push(nextLog);
      }
      // Metrics are eventually consistent. Batching protects the public player
      // and the database when many displays rotate at the same time.
      localStorage.setItem(logQueueKey, JSON.stringify(currentQueue));
    },
    [logQueueKey],
  );

  const registrarExibicao = useCallback(
    async (log) => enqueueLog(log),
    [enqueueLog],
  );

  const flushLogQueue = useCallback(async () => {
    if (flushingLogsRef.current) return;

    const queue = readLogQueue(logQueueKey);
    if (queue.length === 0) return;

    flushingLogsRef.current = true;
    let pending = queue;
    try {
      while (pending.length) {
        const batch = pending.slice(0, LOG_BATCH_SIZE);
        const response = await fetch("/api/anunciantes/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batch }),
        });
        if (!response.ok) throw new Error("Falha ao reenviar fila");
        pending = pending.slice(batch.length);
        localStorage.setItem(logQueueKey, JSON.stringify(pending));
      }
      localStorage.removeItem(logQueueKey);
    } catch {
      // Mantém apenas os itens ainda não confirmados para nova tentativa.
      localStorage.setItem(logQueueKey, JSON.stringify(pending));
    } finally {
      flushingLogsRef.current = false;
    }
  }, [logQueueKey]);

  const carregarAnuncios = useCallback(async () => {
    try {
      if (!churchId) throw new Error("Igreja não informada para o telão");

      let data;
      let publicSettings;
      let payloadSchedule = null;
      if (churchSlug) {
        const response = await fetch(
          `/api/telao/${encodeURIComponent(churchSlug)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || "Falha ao carregar telão");
        data = payload.sponsors || [];
        publicSettings = payload.settings || {};
        lastContentVersionRef.current = payload.version ?? null;
        lastScheduleVersionRef.current = payload.schedule?.version ?? null;
        payloadSchedule = payload.schedule || null;
        setGlobalSchedule(payloadSchedule);
        globalScheduleRef.current = payloadSchedule;
        const serverTime = Date.parse(payload.schedule?.serverTime || "");
        if (Number.isFinite(serverTime)) {
          serverClockOffsetRef.current = serverTime - Date.now();
        }
      } else {
        // Compatibility fallback for internal callers without a public slug.
        const supabase = createSupabaseBrowserClient();
        [data, publicSettings] = await Promise.all([
          fetchPublicSponsors(supabase, churchId),
          fetchSponsorSettings(supabase, churchId),
        ]);
      }

      // Filter by type and active status, respecting the filterMaster setting
      const filteredAds = (data || [])
        .map(mapSponsorRow)
        .filter(Boolean)
        .filter((ad) => {
          const adKind = ad.kind || ad.type || "NORMAL";
          // Se filterMaster estiver ativo, apenas MASTER são elegíveis
          if (filterMaster && adKind !== "MASTER") return false;
          if (kind !== "ALL" && adKind !== kind) return false;
          // Apenas patrocinadores ativos
          return ad.active !== false;
        });

      // Merge with settings from the API
      const mergedSettings = mergeSponsorSettings(
        publicSettings || emptyTelaoSettings,
      );

      // The public payload carries one UTC schedule for every display. Keep a
      // stable base list; each device derives the same cycle order locally.
      const nextSignature = JSON.stringify({
        playlist: buildAdsSignature(filteredAds, mergedSettings),
        schedule: payloadSchedule?.version || payloadSchedule?.startsAt || null,
      });
      const shouldUpdate = lastSignatureRef.current !== nextSignature;
      const nextSchedule = churchSlug ? payloadSchedule : null;
      const position = nextSchedule
        ? getSchedulePosition(
            filteredAds,
            nextSchedule,
            Date.now() + serverClockOffsetRef.current,
          )
        : null;
      const scheduledAds = position?.order || filteredAds;

      const currentAds = adsRef.current;
      const currentAd =
        currentAds[currentIndexRef.current] || currentAds[0] || null;
      const preservedIndex = currentAd
        ? scheduledAds.findIndex((ad) => ad.id === currentAd.id)
        : -1;

      if (shouldUpdate || isOfflineCache) {
        setAds(scheduledAds);
        setSponsorSettings(mergedSettings);
        setCurrentIndex(
          position?.index ?? (preservedIndex >= 0 ? preservedIndex : 0),
        );
      }

      setIsOfflineCache(false);
      lastSignatureRef.current = nextSignature;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ads: scheduledAds,
          sponsorSettings: mergedSettings,
          schedule: nextSchedule,
          version: lastContentVersionRef.current,
          fetchedAt: new Date().toISOString(),
        }),
      );
    } catch {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.ads?.length) {
        setAds(cached.ads);
        const cachedSettings = mergeSponsorSettings(
          cached.sponsorSettings || emptyTelaoSettings,
        );
        setSponsorSettings(cachedSettings);
        setCurrentIndex((prev) =>
          Math.min(prev, Math.max(cached.ads.length - 1, 0)),
        );
        setIsOfflineCache(true);
        lastSignatureRef.current = buildAdsSignature(
          cached.ads,
          cachedSettings,
        );
        lastContentVersionRef.current = cached.version ?? null;
        setGlobalSchedule(cached.schedule ?? null);
        preloadImages(cached.ads);
      }
    } finally {
      setLoaded(true);
    }
  }, [
    cacheKey,
    churchId,
    churchSlug,
    filterMaster,
    isOfflineCache,
    kind,
    preloadImages,
  ]);

  const checkContentVersion = useCallback(async () => {
    if (!churchSlug || !navigator.onLine) return;
    try {
      const response = await fetch(
        `/api/telao/${encodeURIComponent(churchSlug)}/version`,
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const hasContentChange =
        lastContentVersionRef.current !== null &&
        String(payload.version) !== String(lastContentVersionRef.current);
      const hasScheduleChange =
        lastScheduleVersionRef.current !== null &&
        String(payload.scheduleVersion) !== String(lastScheduleVersionRef.current);
      if (hasContentChange || hasScheduleChange) {
        carregarAnuncios();
      } else if (lastContentVersionRef.current === null) {
        lastContentVersionRef.current = payload.version;
        lastScheduleVersionRef.current = payload.scheduleVersion ?? null;
      }
    } catch {
      // The cached playlist keeps running until connectivity returns.
    }
  }, [carregarAnuncios, churchSlug]);

  const avancarAd = useCallback(async () => {
    if (ads.length === 0 || advancingRef.current) return;
    advancingRef.current = true;
    if (rotationTimerRef.current) window.clearTimeout(rotationTimerRef.current);

    const currentAd = ads[currentIndex] || ads[0];
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );

    const metricsPaused = Boolean(sponsorSettings.metricsPaused?.[kind]);

    try {
      if (sponsorSettings.metricsEnabled && !metricsPaused) {
        const officialDisplay = officialDisplayRef.current;
        if (officialDisplay) {
          await registrarExibicao({
            sponsorId: currentAd.id,
            displayedAt: new Date(startTimeRef.current).toISOString(),
            durationSeconds,
            source: kind === "MASTER" ? "telao-master" : "telao",
            displaySessionId: officialDisplay.sessionId,
            displayToken: officialDisplay.token,
            displayClientId: officialDisplay.clientId,
          });
        }
      }

      const schedule = globalScheduleRef.current;
      if (schedule) {
        const position = getSchedulePosition(
          adsRef.current,
          schedule,
          Date.now() + serverClockOffsetRef.current + 50,
        );
        setAds(position.order);
        setCurrentIndex(position.index);
      } else {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }
      startTimeRef.current = Date.now();
    } finally {
      advancingRef.current = false;
    }
  }, [
    ads,
    currentIndex,
    kind,
    registrarExibicao,
    sponsorSettings.metricsEnabled,
    sponsorSettings.metricsPaused,
  ]);

  useEffect(() => {
    carregarAnuncios();
    flushLogQueue();

    const handleOnline = () => {
      carregarAnuncios();
      flushLogQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkContentVersion();
        flushLogQueue();
      }
    };

    const handlePageHide = () => {
      // The queue remains persisted even when the browser cancels this
      // request. The next start/online event will retry it safely.
      flushLogQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [carregarAnuncios, checkContentVersion, flushLogQueue]);

  useEffect(() => {
    if (!loaded || ads.length === 0) return undefined;

    const currentAd = ads[currentIndex] || ads[0];
    const duration = getMediaDuration(
      currentAd,
      sponsorSettings.mediaDurations,
    );
    const scheduledDelay = globalSchedule
      ? millisecondsUntilScheduleChange(
          ads,
          globalSchedule,
          Date.now() + serverClockOffsetRef.current,
        )
      : duration * 1000;
    startTimeRef.current = Date.now();

    rotationTimerRef.current = window.setTimeout(() => {
      avancarAd();
    }, scheduledDelay);

    return () => {
      if (rotationTimerRef.current)
        window.clearTimeout(rotationTimerRef.current);
    };
  }, [
    ads,
    avancarAd,
    currentIndex,
    globalSchedule,
    loaded,
    sponsorSettings.mediaDurations,
  ]);

  useEffect(() => {
    const adsRefreshTimer = window.setInterval(
      checkContentVersion,
      Math.min(ADS_REFRESH_INTERVAL_MS, 30_000),
    );
    const scheduleNextFlush = () => {
      const jitterMs = Math.round((Math.random() - 0.5) * 60_000);
      flushTimerRef.current = window.setTimeout(async () => {
        if (navigator.onLine) await flushLogQueue();
        scheduleNextFlush();
      }, LOG_FLUSH_INTERVAL_MS + jitterMs);
    };
    scheduleNextFlush();

    return () => {
      window.clearInterval(adsRefreshTimer);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    };
  }, [checkContentVersion, flushLogQueue]);

  const currentAd = useMemo(
    () => ads[currentIndex] || ads[0],
    [ads, currentIndex],
  );
  // A single design keeps every sponsor in the same visual composition.
  const design = currentAd ? sponsorSettings?.designs?.SHARED : null;
  const currentAdDuration = getMediaDuration(
    currentAd,
    sponsorSettings.mediaDurations,
  );
  const emptyMessage = useMemo(() => {
    return {
      title: "Nenhum patrocinador ativo",
    };
  }, []);

  // Only show background if design is enabled and has backgroundUrl
  const showBackground = useMemo(() => {
    if (!design?.enabled || !design?.backgroundUrl) return false;
    if (backgroundMode === "always") return true;
    if (backgroundMode === "never") return false;
    return true;
  }, [backgroundMode, design?.backgroundUrl, design?.enabled]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
        <LoadingIndicator className="[&_img]:brightness-0 [&_img]:invert" />
      </div>
    );
  }

  if (!currentAd) {
    return (
      <main
        className="fixed inset-0 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black select-none"
        style={{ userSelect: "none" }}
      >
        <div className="max-w-lg px-6 text-center">
          <div className="text-2xl font-semibold text-white">
            {emptyMessage.title}
          </div>
          <div className="mt-3 text-sm leading-6 text-white/65">
            Sem anúncios ativos no telão
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-black select-none"
      style={{ userSelect: "none" }}
    >
      <div className="absolute left-1/2 top-1/2 aspect-video w-[min(100vw,177.777dvh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black">
        {showBackground ? (
          <>
            <img
              src={design.backgroundUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover select-none"
              draggable={false}
            />
            <div className="absolute inset-0">
              <TelaoMedia
                ad={currentAd}
                design={design}
                onVideoEnded={avancarAd}
                videoDurationLimit={currentAdDuration}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <TelaoMedia
              ad={currentAd}
              design={design}
              onVideoEnded={avancarAd}
              videoDurationLimit={currentAdDuration}
            />
          </div>
        )}
      </div>

    </main>
  );
}
