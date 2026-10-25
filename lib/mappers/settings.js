export const MIN_TELAO_DURATION_SECONDS = 3;
export const MAX_TELAO_DURATION_SECONDS = 25;

/** Keeps persisted and legacy Telão durations inside the supported range. */
function clampTelaoDuration(value, fallback) {
  const duration = Number(value);
  if (!Number.isFinite(duration)) return fallback;

  return Math.min(
    MAX_TELAO_DURATION_SECONDS,
    Math.max(MIN_TELAO_DURATION_SECONDS, Math.round(duration)),
  );
}

export const defaultAdminSettings = {
  telao: {
    defaultDurationImage: 10,
    defaultDurationVideo: 15,
  },
  appearance: {
    parishName: "",
    parishCity: "",
    parishLogoUrl: "/brand/logo-telao-online.webp",
    parishCoverUrl: "",
    parishSocialLinks: [],
    parishSponsorshipGuidelines: "",
    parishSponsorshipWhatsApp: "",
  },
};

export const defaultSponsorSettings = {
  metricsEnabled: false,
  metricsPaused: {
    NORMAL: false,
    MASTER: false,
  },
  adsFilterMaster: false,
  mediaDurations: {
    image: 10,
    video: 15,
  },
  designs: {
    SHARED: {
      enabled: true,
      backgroundEnabled: false,
      backgroundUrl: "",
      contentWidth: 58,
      contentHeight: 58,
      x: 50,
      y: 50,
      objectFit: "cover",
    },
    MOBILE: {
      enabled: true,
      backgroundEnabled: false,
      backgroundUrl: "",
      contentWidth: 58,
      contentHeight: 58,
      x: 50,
      y: 50,
      objectFit: "cover",
    },
    TABLET: {
      enabled: true,
      backgroundEnabled: false,
      backgroundUrl: "",
      contentWidth: 58,
      contentHeight: 58,
      x: 50,
      y: 50,
      objectFit: "cover",
    },
    DESKTOP: {
      enabled: true,
      backgroundEnabled: false,
      backgroundUrl: "",
      contentWidth: 58,
      contentHeight: 58,
      x: 50,
      y: 50,
      objectFit: "cover",
    },
  },
};

/**
 * Merges persisted administrative settings with defaults and migrates removed
 * legacy keys without rewriting the stored document during reads.
 */
export function mergeAdminSettings(settings) {
  const rawTelao = settings?.telao || {};
  const rawAppearance = settings?.appearance || {};
  const appearanceWithoutLegacyLinks = { ...rawAppearance };
  delete appearanceWithoutLegacyLinks.parishInstagramUrl;
  delete appearanceWithoutLegacyLinks.parishFacebookUrl;
  delete appearanceWithoutLegacyLinks.parishYoutubeUrl;
  delete appearanceWithoutLegacyLinks.parishWhatsappUrl;
  delete appearanceWithoutLegacyLinks.parishWebsiteUrl;
  const merged = {
    ...defaultAdminSettings,
    ...(settings || {}),
    telao: {
      ...defaultAdminSettings.telao,
      ...rawTelao,
    },
    appearance: {
      ...defaultAdminSettings.appearance,
      ...appearanceWithoutLegacyLinks,
      parishSocialLinks: Array.isArray(rawAppearance.parishSocialLinks)
        ? rawAppearance.parishSocialLinks
        : [],
    },
  };

  const legacyDefault = Number(rawTelao.defaultDuration);
  const legacyNormal = Number(rawTelao.defaultDurationNormal);
  const legacyMaster = Number(rawTelao.defaultDurationMaster);
  if (
    rawTelao.defaultDurationImage == null &&
    (Number.isFinite(legacyNormal) || Number.isFinite(legacyDefault))
  ) {
    merged.telao.defaultDurationImage = Number.isFinite(legacyNormal)
      ? legacyNormal
      : legacyDefault;
  }
  if (
    rawTelao.defaultDurationVideo == null &&
    (Number.isFinite(legacyMaster) || Number.isFinite(legacyDefault))
  ) {
    merged.telao.defaultDurationVideo = Number.isFinite(legacyMaster)
      ? legacyMaster
      : legacyDefault;
  }

  // Old records may contain the former 60-second limit. Normalize on read so
  // the control, saved document, and public Telão use the same policy.
  merged.telao.defaultDurationImage = clampTelaoDuration(
    merged.telao.defaultDurationImage,
    defaultAdminSettings.telao.defaultDurationImage,
  );
  merged.telao.defaultDurationVideo = clampTelaoDuration(
    merged.telao.defaultDurationVideo,
    defaultAdminSettings.telao.defaultDurationVideo,
  );

  return merged;
}

/**
 * Normalizes sponsor display settings and adapts legacy design structures.
 */
export function mergeSponsorSettings(settings) {
  const sharedSettings = settings?.designs?.SHARED || {};
  const mobileSettings = settings?.designs?.MOBILE || {};
  const tabletSettings = settings?.designs?.TABLET || {};
  const desktopSettings = settings?.designs?.DESKTOP || {};
  const masterSettings = settings?.designs?.MASTER || {};
  const normalSettings = settings?.designs?.NORMAL || {};
  // Old installations persisted one design per type. Prefer the normal layout
  // for migration, falling back to master when it is the only configured one.
  const legacySettings =
    Object.keys(normalSettings).length > 0 ? normalSettings : masterSettings;
  const metricsPaused = settings?.metricsPaused || {};
  const adsFilterMaster = settings?.adsFilterMaster;
  const mediaDurations = settings?.mediaDurations || {};

  return {
    ...defaultSponsorSettings,
    ...(settings || {}),
    metricsPaused: {
      NORMAL: Boolean(metricsPaused.NORMAL),
      MASTER: Boolean(metricsPaused.MASTER),
    },
    adsFilterMaster:
      adsFilterMaster !== undefined
        ? Boolean(adsFilterMaster)
        : defaultSponsorSettings.adsFilterMaster,
    mediaDurations: {
      image:
        Number(mediaDurations.image) ||
        defaultSponsorSettings.mediaDurations.image,
      video:
        Number(mediaDurations.video) ||
        defaultSponsorSettings.mediaDurations.video,
    },
    designs: {
      SHARED: {
        ...defaultSponsorSettings.designs.SHARED,
        ...legacySettings,
        ...sharedSettings,
        contentWidth:
          sharedSettings.contentWidth ??
          legacySettings.contentWidth ??
          legacySettings.imageWidth ??
          defaultSponsorSettings.designs.SHARED.contentWidth,
        contentHeight:
          sharedSettings.contentHeight ??
          legacySettings.contentHeight ??
          legacySettings.imageHeight ??
          defaultSponsorSettings.designs.SHARED.contentHeight,
      },
      MOBILE: {
        ...defaultSponsorSettings.designs.MOBILE,
        ...mobileSettings,
      },
      TABLET: {
        ...defaultSponsorSettings.designs.TABLET,
        ...tabletSettings,
      },
      DESKTOP: {
        ...defaultSponsorSettings.designs.DESKTOP,
        ...desktopSettings,
      },
    },
  };
}
