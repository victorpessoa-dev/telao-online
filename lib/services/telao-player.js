export const emptyTelaoSettings = {
  metricsEnabled: false,
  metricsPaused: {
    NORMAL: false,
    MASTER: false,
  },
  designs: {
    SHARED: {},
  },
};

export function shuffleArray(items, random = Math.random) {
  const cloned = [...items];
  for (let index = 1; index < cloned.length; index += 1) {
    const randomIndex = Math.floor(random() * index);
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }
  return cloned;
}

export function getDesignValue(design, key, fallbackKey, defaultValue) {
  if (design?.[key] != null) return design[key];
  if (fallbackKey && design?.[fallbackKey] != null) return design[fallbackKey];
  return defaultValue;
}

export function buildAdsSignature(items, settings = null) {
  return JSON.stringify({
    ads: items.map((item) => ({
      id: item.id,
      updatedAt: item.updatedAt || null,
      duration: item.duration,
      active: item.active,
      src: item.src,
      type: item.type,
      mediaType: item.mediaType,
    })),
    settings,
  });
}

export function getMediaDuration(ad, mediaDurations = {}) {
  const configured =
    ad?.mediaType === "video" ? mediaDurations.video : mediaDurations.image;
  // The Telão settings are global and apply to every existing sponsorship.
  // A sponsor's stored duration is only a compatibility fallback for payloads
  // that do not include the current settings.
  return Math.max(3, Number(configured) || Number(ad?.duration) || 10);
}

export function shouldIncludeAd(ad, filterMaster) {
  if (filterMaster && ad.type !== "MASTER") return false;
  return ad.active;
}
