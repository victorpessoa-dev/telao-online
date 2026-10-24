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
  getDesignValue,
  getMediaDuration,
} from "@/lib/services/telao-player";
import {
  getSchedulePosition,
  millisecondsUntilScheduleChange,
} from "@/lib/services/telao-schedule";
import { SPONSOR_LOG_QUEUE_PREFIX } from "@/lib/services/sponsor-local-metrics";

const ADS_CACHE_KEY = "vplaycast:telao:ads-cache";
const LOG_QUEUE_KEY = SPONSOR_LOG_QUEUE_PREFIX.slice(0, -1);
const ADS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LOG_FLUSH_INTERVAL_MS = 90 * 1000;
const LOG_BATCH_SIZE = 100;
const DISPLAY_CLIENT_KEY = "vplaycast:official-display-client";

function getTelaoProfile(width) {
  if (width < 768) return "MOBILE";
  if (width < 1024) return "TABLET";
  return "DESKTOP";
}

function useTelaoProfile() {
  const [profile, setProfile] = useState("DESKTOP");

  useEffect(() => {
    const updateProfile = () => setProfile(getTelaoProfile(window.innerWidth));
    updateProfile();
    window.addEventListener("resize", updateProfile);
    return () => window.removeEventListener("resize", updateProfile);
  }, []);

  return profile;
}

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
  return { sessionId, token, clientId };
}

function clearDisplaySessionHash() {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

function sameOfficialDisplay(left, right) {
  return (
    left?.sessionId === right?.sessionId &&
    left?.token === right?.token &&
    left?.clientId === right?.clientId
  );
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
  const [eventActive, setEventActive] = useState(null);
  const [globalSchedule, setGlobalSchedule] = useState(null);
  const adsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const lastSignatureRef = useRef("");
  const lastContentVersionRef = useRef(null);
  const lastScheduleVersionRef = useRef(null);
  const globalScheduleRef = useRef(null);
  const serverClockOffsetRef = useRef(0);
  const officialDisplayRef = useRef(null);
  const officialDisplayCandidateRef = useRef(null);
  const officialClaimRequestRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const flushTimerRef = useRef(null);
  const rotationTimerRef = useRef(null);
  const advancingRef = useRef(false);
  const flushingLogsRef = useRef(false);
  const imagePreloadsRef = useRef(new Map());
  const displayScope = churchId || churchSlug || "default";
  const cacheKey = `${ADS_CACHE_KEY}:${displayScope}:${kind}`;
  // A screen must never flush another church's offline events after an
  // operator changes routes in the same browser.
  const logQueueKey = `${LOG_QUEUE_KEY}:${displayScope}:${kind}`;

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
    // Keep the URL fragment until the server confirms the claim. In React
    // development Strict Mode effects are replayed; consuming the fragment in
    // the first pass used to leave the second pass without a token, even though
    // the database had already accepted the claim.
    const officialDisplay =
      officialDisplayCandidateRef.current || getDisplaySessionFromHash();
    if (!officialDisplay) return undefined;
    officialDisplayCandidateRef.current = officialDisplay;

    if (officialClaimRequestRef.current) return undefined;

    // Claim the official display before its first rotation. This locks the
    // session to this browser; waiting for the first batch would leave a
    // window for another device to take it over.
    officialClaimRequestRef.current = fetch("/api/telao/official-session/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(officialDisplay),
    })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (response.ok && body.claimed) {
          officialDisplayRef.current = officialDisplay;
          clearDisplaySessionHash();
          return;
        }
        if (sameOfficialDisplay(officialDisplayCandidateRef.current, officialDisplay)) {
          officialDisplayCandidateRef.current = null;
        }
        console.warn("O telão não foi autorizado para registrar exibições.");
      })
      .catch((error) => {
        if (sameOfficialDisplay(officialDisplayCandidateRef.current, officialDisplay)) {
          officialDisplayCandidateRef.current = null;
        }
        console.warn("Não foi possível autorizar o telão para contagem.", error);
      })
      .finally(() => {
        officialClaimRequestRef.current = null;
      });
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

  useEffect(() => {
    const metricsPaused =
      kind !== "ALL" && Boolean(sponsorSettings.metricsPaused?.[kind]);
    if (
      !loaded ||
      (eventActive !== false && sponsorSettings.metricsEnabled && !metricsPaused)
    )
      return;
    // Once disabled or paused, pending local impressions must not look valid
    // in the admin preview and must not be sent in a later batch.
    officialDisplayRef.current = null;
    officialDisplayCandidateRef.current = null;
    localStorage.removeItem(logQueueKey);
  }, [
    eventActive,
    kind,
    loaded,
    logQueueKey,
    sponsorSettings.metricsEnabled,
    sponsorSettings.metricsPaused,
  ]);

  const preloadImages = useCallback((items) => {
    const preload = (src) => {
      if (imagePreloadsRef.current.has(src)) {
        return imagePreloadsRef.current.get(src);
      }

      const request = new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (typeof image.decode !== "function") {
            resolve(true);
            return;
          }
          image.decode().then(
            () => resolve(true),
            // A decoded image can reject in browsers that have already
            // painted it, so the successful load remains sufficient here.
            () => resolve(true),
          );
        };
        // Do not keep the display on its loading screen forever for a broken
        // asset. The browser will still render its normal broken-image state.
        image.onerror = () => resolve(false);
        image.src = src;
      });
      imagePreloadsRef.current.set(src, request);
      return request;
    };

    return Promise.all(
      items
        .filter((item) => item.mediaType === "image" && item.src)
        .map((item) => preload(item.src)),
    );
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
      // The queue is also read by the admin views to show an immediate local
      // preview while the confirmed total waits for the three-minute sync.
      localStorage.setItem(logQueueKey, JSON.stringify(currentQueue));
    },
    [logQueueKey],
  );

  const flushLogQueue = useCallback(async () => {
    if (flushingLogsRef.current) return;

    const queue = readLogQueue(logQueueKey);
    if (queue.length === 0) return;

    flushingLogsRef.current = true;
    let pending = queue;
    try {
      // An older, expired session must not stop later valid sessions from
      // being sent. The SQL RPC authorizes a batch from its first item, so
      // submit each session group separately.
      const groups = new Map();
      pending.forEach((log) => {
        const key = [
          log.displaySessionId || "",
          log.displayToken || "",
          log.displayClientId || "",
        ].join(":");
        const group = groups.get(key) || [];
        group.push(log);
        groups.set(key, group);
      });

      const unconfirmed = [];
      for (const group of groups.values()) {
        let groupPending = group;
        try {
          while (groupPending.length) {
            const batch = groupPending.slice(0, LOG_BATCH_SIZE);
            const response = await fetch("/api/parceiros/logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ logs: batch }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || Number(payload.processed) < 1) {
              throw new Error(payload.error || "O banco não confirmou a exibição");
            }
            groupPending = groupPending.slice(batch.length);
          }
        } catch (error) {
          unconfirmed.push(...groupPending);
          console.warn("Não foi possível salvar algumas exibições do telão.", error);
        }
      }
      pending = unconfirmed;
      if (pending.length) {
        localStorage.setItem(logQueueKey, JSON.stringify(pending));
      } else {
        localStorage.removeItem(logQueueKey);
      }
    } finally {
      flushingLogsRef.current = false;
    }
  }, [logQueueKey]);

  const registrarExibicao = useCallback(
    (log) => {
      enqueueLog(log);
    },
    [enqueueLog],
  );

  const carregarAnuncios = useCallback(async () => {
    try {
      if (!churchId) throw new Error("Igreja não informada para o telão");

      let data;
      let publicSettings;
      let payloadSchedule = null;
      if (churchSlug) {
        const isOfficialDisplay = Boolean(officialDisplayCandidateRef.current);
        const cacheSuffix = isOfficialDisplay
          ? `?official=${Date.now()}`
          : "";
        const response = await fetch(
          `/api/telao/${encodeURIComponent(churchSlug)}${cacheSuffix}`,
          isOfficialDisplay ? { cache: "no-store" } : undefined,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || "Falha ao carregar telão");
        if (payload.active !== true) {
          // The route intentionally stays lightweight outside an event. Do
          // not revive a cached playlist or leave queued logs behind.
          setEventActive(false);
          setAds([]);
          setSponsorSettings(
            mergeSponsorSettings(payload.settings || emptyTelaoSettings),
          );
          setGlobalSchedule(null);
          globalScheduleRef.current = null;
          officialDisplayRef.current = null;
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(logQueueKey);
          return false;
        }
        setEventActive(true);
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

      // Filter by type and active status. The global Master-only preference is
      // part of the public settings payload, so every public display follows
      // the same mode rather than depending on the browser URL.
      const masterOnly = Boolean(filterMaster || publicSettings?.adsFilterMaster);
      const filteredAds = (data || [])
        .map(mapSponsorRow)
        .filter(Boolean)
        .filter((ad) => {
          const adKind = ad.kind || ad.type || "NORMAL";
          if (masterOnly && adKind !== "MASTER") return false;
          if (kind !== "ALL" && adKind !== kind) return false;
          // Apenas patrocinadores ativos
          return ad.active !== false;
        });

      // Merge with settings from the API
      const mergedSettings = mergeSponsorSettings(
        publicSettings || emptyTelaoSettings,
      );
      // Existing sponsors may carry the duration that was configured when
      // they were created. Normalize them before deriving the shared schedule
      // so a later settings change applies immediately everywhere.
      const normalizedAds = filteredAds.map((ad) => ({
        ...ad,
        duration: getMediaDuration(ad, mergedSettings.mediaDurations),
      }));

      // The public payload carries one UTC schedule for every display. Keep a
      // stable base list; each device derives the same cycle order locally.
      const nextSignature = JSON.stringify({
        playlist: buildAdsSignature(normalizedAds, mergedSettings),
        schedule: payloadSchedule?.version || payloadSchedule?.startsAt || null,
      });
      const shouldUpdate = lastSignatureRef.current !== nextSignature;
      const nextSchedule = churchSlug ? payloadSchedule : null;
      const position = nextSchedule
        ? getSchedulePosition(
            normalizedAds,
            nextSchedule,
            Date.now() + serverClockOffsetRef.current,
          )
        : null;
      const scheduledAds = position?.order || normalizedAds;

      const currentAds = adsRef.current;
      const currentAd =
        currentAds[currentIndexRef.current] || currentAds[0] || null;
      const preservedIndex = currentAd
        ? scheduledAds.findIndex((ad) => ad.id === currentAd.id)
        : -1;

      if (shouldUpdate || isOfflineCache) {
        // Start the schedule only after every image in its playlist is in the
        // browser cache. This means the next sponsor is ready before its
        // configured slot begins, so rotation never needs to extend a slot
        // while waiting for an image download.
        await preloadImages(scheduledAds);
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
      return true;
    } catch {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.ads?.length) {
        const cachedSettings = mergeSponsorSettings(
          cached.sponsorSettings || emptyTelaoSettings,
        );
        await preloadImages(cached.ads);
        setAds(cached.ads);
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
        return true;
      }
      return false;
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
      if (payload.active !== true) {
        setEventActive(false);
        setAds([]);
        setGlobalSchedule(null);
        globalScheduleRef.current = null;
        officialDisplayRef.current = null;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(logQueueKey);
        return;
      }
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
  }, [cacheKey, carregarAnuncios, churchSlug, logQueueKey]);

  const avancarAd = useCallback(async () => {
    if (ads.length === 0 || advancingRef.current) return;
    advancingRef.current = true;
    if (rotationTimerRef.current) window.clearTimeout(rotationTimerRef.current);

    const currentAd = ads[currentIndex] || ads[0];
    // An impression represents one scheduled slot, not a browser timer
    // measurement. Timers can fire late (or begin partway through a shared
    // schedule), which previously made totals such as 11 × 5 s become 51 s.
    // Record the configured slot duration so views and accumulated time always
    // describe the same thing.
    const durationSeconds = getMediaDuration(
      currentAd,
      sponsorSettings.mediaDurations,
    );

    const currentAdKind = currentAd.type || currentAd.kind || "NORMAL";
    const metricsPaused = Boolean(
      sponsorSettings.metricsPaused?.[currentAdKind],
    );

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
    sponsorSettings.mediaDurations,
    sponsorSettings.metricsPaused,
  ]);

  useEffect(() => {
    carregarAnuncios().then((isActive) => {
      if (isActive) flushLogQueue();
    });

    const handleOnline = () => {
      carregarAnuncios().then((isActive) => {
        if (isActive) flushLogQueue();
      });
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
      if (eventActive === true) flushLogQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [carregarAnuncios, checkContentVersion, eventActive, flushLogQueue]);

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
    if (eventActive !== true) return undefined;

    const adsRefreshTimer = window.setInterval(checkContentVersion, ADS_REFRESH_INTERVAL_MS);
    const scheduleNextFlush = () => {
      const jitterMs = Math.round((Math.random() - 0.5) * 10_000);
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
  }, [checkContentVersion, eventActive, flushLogQueue]);

  const telaoProfile = useTelaoProfile();
  const currentAd = useMemo(
    () => ads[currentIndex] || ads[0],
    [ads, currentIndex],
  );
  const design = currentAd
    ? sponsorSettings?.designs?.[telaoProfile] ||
      sponsorSettings?.designs?.DESKTOP ||
      sponsorSettings?.designs?.SHARED
    : null;
  const canvasClassName = {
    MOBILE:
      // Each profile owns a fixed model canvas. It can only change when the
      // viewport crosses a profile breakpoint; it never stretches to match a
      // handset's arbitrary aspect ratio.
      "absolute left-1/2 top-1/2 aspect-[9/16] w-[min(100dvw,56.25dvh)] -translate-x-1/2 -translate-y-1/2",
    TABLET:
      "absolute left-1/2 top-1/2 aspect-[4/3] w-[min(100dvw,133.333dvh)] -translate-x-1/2 -translate-y-1/2",
    DESKTOP:
      "absolute left-1/2 top-1/2 aspect-video w-[min(100dvw,177.777dvh)] -translate-x-1/2 -translate-y-1/2",
  }[telaoProfile];
  const masterOnlyMode = Boolean(filterMaster || sponsorSettings.adsFilterMaster);
  const activeCanvasClassName = masterOnlyMode
    ? "absolute left-1/2 top-1/2 aspect-video w-[min(100dvw,177.777dvh)] -translate-x-1/2 -translate-y-1/2"
    : canvasClassName;

  useEffect(() => {
    if (!masterOnlyMode) return undefined;
    const root = document.documentElement;
    const body = document.body;
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    root.style.backgroundColor = "transparent";
    body.style.backgroundColor = "transparent";
    return () => {
      root.style.backgroundColor = previousRootBackground;
      body.style.backgroundColor = previousBodyBackground;
    };
  }, [masterOnlyMode]);
  const currentAdDuration = getMediaDuration(
    currentAd,
    sponsorSettings.mediaDurations,
  );
  const emptyMessage = useMemo(() => {
    return {
      title: "Nenhum patrocinador ativo",
    };
  }, []);

  // Master-only is a clean playback mode: it hides the background as well as
  // excluding NORMAL ads. The setting stays authoritative across all screens.
  const showBackground = useMemo(() => {
    if (masterOnlyMode) return false;
    if (!design?.enabled || !design?.backgroundUrl) return false;
    if (backgroundMode === "always") return true;
    if (backgroundMode === "never") return false;
    return true;
  }, [backgroundMode, design?.backgroundUrl, design?.enabled, masterOnlyMode]);

  if (!loaded) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${masterOnlyMode ? "bg-transparent" : "bg-black"}`}>
        <LoadingIndicator className="[&_img]:brightness-0 [&_img]:invert" />
      </div>
    );
  }

  if (eventActive === false) {
    const inactiveDesign =
      sponsorSettings?.designs?.[telaoProfile] ||
      sponsorSettings?.designs?.DESKTOP ||
      sponsorSettings?.designs?.SHARED ||
      {};
    const inactiveBackground =
      inactiveDesign.backgroundUrl ||
      "/brand/background-virtus-playcast.webp";
    const inactiveMessageStyle = {
      width: `${getDesignValue(
        inactiveDesign,
        "contentWidth",
        "imageWidth",
        58,
      )}%`,
      height: `${getDesignValue(
        inactiveDesign,
        "contentHeight",
        "imageHeight",
        58,
      )}%`,
      left: `${getDesignValue(inactiveDesign, "x", null, 50)}%`,
      top: `${getDesignValue(inactiveDesign, "y", null, 50)}%`,
    };

    return (
      <main className="ads-telao-screen fixed inset-0 overflow-hidden bg-black select-none">
        <div className={`${canvasClassName} overflow-hidden bg-[#071423]`}>
          <img
            src={inactiveBackground}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            draggable={false}
          />
          <div
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-3xl border border-sky-300/45 bg-slate-950/65 px-5 py-6 text-center shadow-2xl backdrop-blur-sm sm:px-10 sm:py-12"
            style={inactiveMessageStyle}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-300 sm:text-xs sm:tracking-[0.32em]">
              Espaço para patrocinadores
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-blue-400 sm:text-6xl">
              Sua marca aqui
            </h1>
            <p className="mt-4 max-w-xl text-xs leading-5 text-blue-200 sm:mt-5 sm:text-base sm:leading-6">
              O telão oficial, com os parceiros, é ativado durante o evento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!currentAd) {
    return (
      <main
        className={`ads-telao-screen fixed inset-0 flex items-center justify-center overflow-hidden select-none ${masterOnlyMode ? "bg-transparent" : "bg-black"}`}
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
      className={`ads-telao-screen fixed inset-0 overflow-hidden select-none ${masterOnlyMode ? "bg-transparent" : "bg-black"}`}
      style={{ userSelect: "none" }}
    >
      <div className={`${activeCanvasClassName} overflow-hidden ${masterOnlyMode ? "bg-transparent" : "bg-black"}`}>
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
                design={masterOnlyMode ? undefined : design}
                onVideoEnded={avancarAd}
                videoDurationLimit={currentAdDuration}
              />
            </div>
          </>
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${masterOnlyMode ? "bg-transparent" : "bg-black"}`}>
            <TelaoMedia
              ad={currentAd}
              design={masterOnlyMode ? undefined : design}
              onVideoEnded={avancarAd}
              videoDurationLimit={currentAdDuration}
            />
          </div>
        )}
      </div>

    </main>
  );
}
