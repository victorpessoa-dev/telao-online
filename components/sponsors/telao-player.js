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
  shuffleArray,
} from "@/lib/services/telao-player";

const ADS_CACHE_KEY = "vplaycast:telao:ads-cache";
const LOG_QUEUE_KEY = "vplaycast:telao:log-queue";
const ADS_REFRESH_INTERVAL_MS = 60_000;
const LOG_FLUSH_INTERVAL_MS = 2 * 60 * 1000;
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
  const adsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const refreshTimeoutRef = useRef(null);
  const lastSignatureRef = useRef("");
  const startTimeRef = useRef(Date.now());
  const flushTimerRef = useRef(null);
  const rotationTimerRef = useRef(null);
  const advancingRef = useRef(false);
  const cacheKey = `${ADS_CACHE_KEY}:${churchId || "default"}:${kind}`;

  useEffect(() => {
    adsRef.current = ads;
  }, [ads]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const preloadImages = useCallback((items) => {
    items
      .filter((item) => item.mediaType === "image" && item.src)
      .forEach((item) => {
        const image = new Image();
        image.src = item.src;
      });
  }, []);

  const enqueueLog = useCallback((log) => {
    const currentQueue = JSON.parse(
      localStorage.getItem(LOG_QUEUE_KEY) || "[]",
    );
    // Metrics are eventually consistent. Batching protects the public player
    // and the database when many displays rotate at the same time.
    const nextQueue = [...currentQueue, log].slice(-500);
    localStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(nextQueue));
  }, []);

  const registrarExibicao = useCallback(
    async (log) => enqueueLog(log),
    [enqueueLog],
  );

  const flushLogQueue = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(LOG_QUEUE_KEY) || "[]");
    if (queue.length === 0) return;

    let pending = queue;
    try {
      while (pending.length) {
        const batch = pending.slice(0, 100);
        const response = await fetch("/api/anunciantes/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batch }),
        });
        if (!response.ok) throw new Error("Falha ao reenviar fila");
        pending = pending.slice(batch.length);
        localStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(pending));
      }
      localStorage.removeItem(LOG_QUEUE_KEY);
    } catch {
      // Mantém apenas os itens ainda não confirmados para nova tentativa.
      localStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(pending));
    }
  }, []);

  const carregarAnuncios = useCallback(async () => {
    try {
      if (!churchId) throw new Error("Igreja não informada para o telão");

      let data;
      let publicSettings;
      if (churchSlug) {
        const response = await fetch(
          `/api/telao/${encodeURIComponent(churchSlug)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Falha ao carregar telão");
        data = payload.sponsors || [];
        publicSettings = payload.settings || {};
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

      // Build signature for shuffle detection
      const nextSignature = buildAdsSignature(filteredAds, mergedSettings);
      const shouldShuffle = lastSignatureRef.current !== nextSignature;
      const shuffledAds = shouldShuffle
        ? shuffleArray(filteredAds)
        : filteredAds;

      const currentAds = adsRef.current;
      const currentAd =
        currentAds[currentIndexRef.current] || currentAds[0] || null;
      const preservedIndex = currentAd
        ? shuffledAds.findIndex((ad) => ad.id === currentAd.id)
        : -1;

      if (shouldShuffle || isOfflineCache) {
        setAds(shuffledAds);
        setSponsorSettings(mergedSettings);
        setCurrentIndex(preservedIndex >= 0 ? preservedIndex : 0);
      }

      setIsOfflineCache(false);
      lastSignatureRef.current = nextSignature;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ads: shuffledAds,
          sponsorSettings: mergedSettings,
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
        preloadImages(cached.ads);
      }
    } finally {
      setLoaded(true);
    }
  }, [cacheKey, churchId, churchSlug, filterMaster, isOfflineCache, kind, preloadImages]);

  const scheduleFastRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      if (navigator.onLine) {
        carregarAnuncios();
      }
    }, 200);
  }, [carregarAnuncios]);

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
        await registrarExibicao({
          sponsorId: currentAd.id,
          displayedAt: new Date(startTimeRef.current).toISOString(),
          durationSeconds,
          source: kind === "MASTER" ? "telao-master" : "telao",
        });
      }

      setCurrentIndex((prev) => (prev + 1) % ads.length);
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
        carregarAnuncios();
        flushLogQueue();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [carregarAnuncios, flushLogQueue]);

  useEffect(() => {
    if (!loaded || ads.length === 0) return undefined;

    const currentAd = ads[currentIndex] || ads[0];
    const duration = getMediaDuration(
      currentAd,
      sponsorSettings.mediaDurations,
    );
    startTimeRef.current = Date.now();

    rotationTimerRef.current = window.setTimeout(() => {
      avancarAd();
    }, duration * 1000);

    return () => {
      if (rotationTimerRef.current)
        window.clearTimeout(rotationTimerRef.current);
    };
  }, [ads, avancarAd, currentIndex, loaded, sponsorSettings.mediaDurations]);

  useEffect(() => {
    const adsRefreshTimer = window.setInterval(() => {
      if (navigator.onLine) carregarAnuncios();
    }, ADS_REFRESH_INTERVAL_MS);

    flushTimerRef.current = window.setInterval(() => {
      if (navigator.onLine) flushLogQueue();
    }, LOG_FLUSH_INTERVAL_MS);

    return () => {
      window.clearInterval(adsRefreshTimer);
      if (flushTimerRef.current) window.clearInterval(flushTimerRef.current);
      if (refreshTimeoutRef.current)
        window.clearTimeout(refreshTimeoutRef.current);
    };
  }, [carregarAnuncios, flushLogQueue]);

  useEffect(() => {
    if (!churchId) return undefined;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`telao-live-${churchId}-${kind.toLowerCase()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sponsors",
          filter: `church_id=eq.${churchId}`,
        },
        scheduleFastRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: `church_id=eq.${churchId}`,
        },
        scheduleFastRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") scheduleFastRefresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [churchId, kind, scheduleFastRefresh]);

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
        className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black select-none"
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
      className="fixed inset-0 overflow-hidden bg-black select-none"
      style={{ userSelect: "none" }}
    >
      <div className="absolute left-1/2 top-1/2 aspect-video w-[min(100vw,177.777vh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black transition-[width] duration-200 ease-out">
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

      {isOfflineCache ? (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-100">
          Exibindo cache local
        </div>
      ) : null}
    </main>
  );
}
