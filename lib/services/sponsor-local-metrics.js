export const SPONSOR_LOG_QUEUE_PREFIX = "telao-online:telao:log-queue:";
export const LEGACY_SPONSOR_LOG_QUEUE_PREFIX = "vplaycast:telao:log-queue:";
const DEFAULT_CHURCH_ID = "default";

function getQueueScope(churchId) {
  return churchId || DEFAULT_CHURCH_ID;
}

/** Builds the current local-storage namespace for one church's pending logs. */
export function getSponsorLogQueuePrefix(churchId) {
  return `${SPONSOR_LOG_QUEUE_PREFIX}${getQueueScope(churchId)}:`;
}

/** Builds the legacy namespace so an upgrade never abandons unsent metrics. */
export function getLegacySponsorLogQueuePrefix(churchId) {
  return `${LEGACY_SPONSOR_LOG_QUEUE_PREFIX}${getQueueScope(churchId)}:`;
}

/** Returns every supported queue namespace, with the current one first. */
export function getSponsorLogQueuePrefixes(churchId) {
  return [
    getSponsorLogQueuePrefix(churchId),
    getLegacySponsorLogQueuePrefix(churchId),
  ];
}

function parseQueue(value) {
  try {
    const queue = JSON.parse(value || "[]");
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

function isQueueForChurch(key, prefixes) {
  return Boolean(key) && prefixes.some((prefix) => key.startsWith(prefix));
}

function getEmptyMetrics() {
  return { views: 0, totalSeconds: 0, lastDisplayedAt: null };
}

function accumulateMetrics(previous, log) {
  const displayedAt = log.displayedAt || previous.lastDisplayedAt;

  return {
    views: previous.views + Math.max(0, Number(log.viewsCount) || 0),
    totalSeconds:
      previous.totalSeconds + Math.max(0, Number(log.durationSeconds) || 0),
    lastDisplayedAt:
      !previous.lastDisplayedAt ||
      (displayedAt && displayedAt > previous.lastDisplayedAt)
        ? displayedAt
        : previous.lastDisplayedAt,
  };
}

// The queue is the optimistic source of truth only until the server confirms
// it. Persisted totals must never be mutated with these values.
/**
 * Aggregates unsent local display logs for optimistic reporting previews.
 * Persisted database totals are never changed by this function.
 */
export function getPendingSponsorMetrics(storage, churchId) {
  if (!storage) return {};

  const prefixes = getSponsorLogQueuePrefixes(churchId);
  const pending = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!isQueueForChurch(key, prefixes)) continue;

    parseQueue(storage.getItem(key)).forEach((log) => {
      if (!log?.sponsorId) return;
      pending[log.sponsorId] = accumulateMetrics(
        pending[log.sponsorId] || getEmptyMetrics(),
        log,
      );
    });
  }
  return pending;
}

/** Returns display copies of sponsors enriched with locally pending metrics. */
export function withPendingSponsorMetrics(ads, pendingMetrics) {
  return ads.map((ad) => {
    const pending = pendingMetrics[ad.id];
    if (!pending) return ad;

    return {
      ...ad,
      views: (Number(ad.views) || 0) + pending.views,
      totalSeconds: (Number(ad.totalSeconds) || 0) + pending.totalSeconds,
      lastDisplayedAt: pending.lastDisplayedAt || ad.lastDisplayedAt,
      hasPendingMetrics: true,
    };
  });
}
