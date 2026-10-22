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
function assertSafeUrl(value, label, { required = false } = {}) {
  const url = String(value || "").trim();

  if (!url) {
    if (required) throw new Error(`${label} é obrigatório`);
    return "";
  }

  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\"))
    return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // Falls through to the user-facing validation error below.
  }

  throw new Error(`${label} deve ser uma URL http(s) válida`);
}

export function normalizeSponsorAdminInput(ad) {
  const name = String(ad.name || "").trim();
  const kind = ALLOWED_SPONSOR_KINDS.has(ad.type) ? ad.type : "NORMAL";
  const mediaType = ALLOWED_MEDIA_TYPES.has(ad.mediaType)
    ? ad.mediaType
    : "image";
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
    duration: Math.max(3, Number(ad.duration) || 10),
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
    totals: {
      advertisers: advertisers.length,
      totalViews: advertisers.reduce(
        (sum, advertiser) => sum + (advertiser.views || 0),
        0,
      ),
      totalSeconds: advertisers.reduce(
        (sum, advertiser) => sum + (advertiser.totalSeconds || 0),
        0,
      ),
    },
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
    daily: (report.daily || []).map((item) => ({
      date: item.displayed_on,
      total: Number(item.views) || 0,
      seconds: Number(item.total_seconds) || 0,
    })),
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
