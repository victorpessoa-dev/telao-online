import {
  buildSponsorPayload,
  mapPublicAdRow,
  mapSponsorImpressionRow,
  mapSponsorRow,
  mapSponsorStoreRow,
} from "@/lib/mappers/sponsors";
import {
  fetchPublicSponsorDetail,
  fetchPublicSponsorDirectory,
  fetchPublicSponsorReport,
  fetchPublicSponsors,
  fetchSponsorSettings,
  insertSponsor,
  updateSponsorById,
} from "@/lib/repositories/sponsors";

const ALLOWED_SPONSOR_KINDS = new Set(["NORMAL", "MASTER"]);
const ALLOWED_MEDIA_TYPES = new Set(["image", "video"]);
const DEFAULT_SPONSOR_KIND = "NORMAL";
const DEFAULT_MEDIA_TYPE = "image";
const MIN_DURATION_SECONDS = 3;
const DEFAULT_DURATION_SECONDS = 10;

// Public URLs are persisted and later rendered by clients. Restricting the
// protocol here prevents unsafe links from crossing the service boundary.
function assertSafeUrl(value, label, { required = false } = {}) {
  const url = String(value || "").trim();

  if (!url) {
    if (required) throw new Error(`${label} é obrigatório`);
    return "";
  }

  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // Falls through to the user-facing validation error below.
  }

  throw new Error(`${label} deve ser uma URL http(s) válida`);
}

function calculateDirectoryTotals(advertisers) {
  return advertisers.reduce(
    (totals, advertiser) => ({
      advertisers: totals.advertisers + 1,
      totalViews: totals.totalViews + (advertiser.views || 0),
      totalSeconds: totals.totalSeconds + (advertiser.totalSeconds || 0),
    }),
    { advertisers: 0, totalViews: 0, totalSeconds: 0 },
  );
}

function mapDailyReportEntry(entry) {
  return {
    date: entry.displayed_on,
    total: Number(entry.views) || 0,
    seconds: Number(entry.total_seconds) || 0,
  };
}

export function normalizeSponsorAdminInput(ad) {
  const name = String(ad.name || "").trim();
  const kind = ALLOWED_SPONSOR_KINDS.has(ad.type)
    ? ad.type
    : DEFAULT_SPONSOR_KIND;
  const mediaType = ALLOWED_MEDIA_TYPES.has(ad.mediaType)
    ? ad.mediaType
    : DEFAULT_MEDIA_TYPE;
  const mediaUrl = assertSafeUrl(ad.src, "Link da mídia", { required: true });
  const websiteUrl = assertSafeUrl(ad.websiteUrl, "Site do anunciante");

  if (!name) throw new Error("Digite um nome para o patrocínio");

  return {
    ...ad,
    name,
    type: kind,
    mediaType,
    src: mediaUrl,
    websiteUrl,
    duration: Math.max(
      MIN_DURATION_SECONDS,
      Number(ad.duration) || DEFAULT_DURATION_SECONDS,
    ),
  };
}

export async function getPublicAdsPayload(supabase) {
  const [ads, settings] = await Promise.all([
    fetchPublicSponsors(supabase),
    fetchSponsorSettings(supabase),
  ]);

  return {
    ads: ads.map(mapPublicAdRow).filter((ad) => ad?.src),
    sponsorSettings: settings,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSponsorDirectoryPayload(supabase) {
  const advertisers = (await fetchPublicSponsorDirectory(supabase))
    .map(mapSponsorRow)
    .filter((advertiser) => advertiser?.active === true);

  return {
    totals: calculateDirectoryTotals(advertisers),
    advertisers,
  };
}

export async function getSponsorDetailPayload(
  supabase,
  sponsorId,
  churchId,
  pagination = {},
) {
  if (!churchId) return null;

  const [advertiserRow, report] = await Promise.all([
    fetchPublicSponsorDetail(supabase, sponsorId, churchId),
    fetchPublicSponsorReport(supabase, sponsorId, churchId, pagination),
  ]);

  const advertiser = mapSponsorRow(advertiserRow);
  if (!advertiser || advertiser.active !== true) return null;

  return {
    advertiser,
    logs: (report.logs || []).map(mapSponsorImpressionRow),
    daily: (report.daily || []).map(mapDailyReportEntry),
    pagination: {
      page: Number(report.page) || 1,
      pageSize: Number(report.pageSize) || 20,
      totalItems: Number(report.totalItems) || 0,
    },
  };
}

export async function createSponsorForAdmin(supabase, ad, churchId) {
  return mapSponsorStoreRow(
    await insertSponsor(
      supabase,
      buildSponsorPayload(normalizeSponsorAdminInput(ad)),
      churchId,
    ),
  );
}

export async function updateSponsorForAdmin(
  supabase,
  currentAd,
  updates,
  churchId,
) {
  const payload = buildSponsorPayload(
    normalizeSponsorAdminInput({ ...currentAd, ...updates }),
  );
  return mapSponsorStoreRow(
    await updateSponsorById(supabase, currentAd.id, payload, churchId),
  );
}
