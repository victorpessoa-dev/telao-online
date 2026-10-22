export const SPONSOR_LOG_QUEUE_PREFIX = "vplaycast:telao:log-queue:";

export function getSponsorLogQueuePrefix(churchId) {
  return `${SPONSOR_LOG_QUEUE_PREFIX}${churchId || "default"}:`;
}

function parseQueue(value) {
  try {
    const queue = JSON.parse(value || "[]");
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

// The queue is the optimistic source of truth only until the server confirms
// it. Persisted totals must never be mutated with these values.
export function getPendingSponsorMetrics(storage, churchId) {
  if (!storage) return {};

  const prefix = getSponsorLogQueuePrefix(churchId);
  const pending = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;

    parseQueue(storage.getItem(key)).forEach((log) => {
      if (!log?.sponsorId) return;
      const previous = pending[log.sponsorId] || {
        views: 0,
        totalSeconds: 0,
        lastDisplayedAt: null,
      };
      const displayedAt = log.displayedAt || previous.lastDisplayedAt;
      pending[log.sponsorId] = {
        views: previous.views + Math.max(0, Number(log.viewsCount) || 0),
        totalSeconds:
          previous.totalSeconds + Math.max(0, Number(log.durationSeconds) || 0),
        lastDisplayedAt:
          !previous.lastDisplayedAt ||
          (displayedAt && displayedAt > previous.lastDisplayedAt)
            ? displayedAt
            : previous.lastDisplayedAt,
      };
    });
  }
  return pending;
}

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
