import {
  defaultAdminSettings,
  mergeAdminSettings,
} from "@/lib/mappers/settings";
import { deleteAllSponsors } from "@/lib/repositories/sponsors";
import { getAppSetting, upsertAppSetting } from "@/lib/repositories/settings";

/** Ensures settings mutations cannot silently target an undefined church. */
function requireChurchId(churchId) {
  if (!churchId)
    throw new Error("Cadastre sua igreja antes de salvar configurações.");
}

/**
 * Retrieves the administrative settings and merges them with current defaults.
 *
 * @returns {Promise<object>} Complete settings document expected by the UI.
 */
export async function getAdminSettings(supabase, churchId) {
  requireChurchId(churchId);
  return mergeAdminSettings(
    await getAppSetting(supabase, "admin_settings", churchId),
  );
}

/**
 * Persists only administrative settings; church appearance is stored separately.
 *
 * @returns {Promise<object>} The normalized settings retained by the interface.
 */
export async function saveAdminSettings(supabase, settings, churchId) {
  requireChurchId(churchId);
  const normalized = mergeAdminSettings(settings);
  const { appearance: _appearance, ...adminSettings } = normalized;
  await upsertAppSetting(supabase, "admin_settings", adminSettings, churchId);
  return normalized;
}

/** Resets the configurable telão defaults without removing church identity. */
export async function resetAdminSettings(supabase, churchId) {
  requireChurchId(churchId);
  await upsertAppSetting(
    supabase,
    "admin_settings",
    { telao: defaultAdminSettings.telao },
    churchId,
  );
  return defaultAdminSettings;
}

/**
 * Removes all sponsors and restores administrative defaults in parallel.
 * This operation is destructive and is only called after UI confirmation.
 */
export async function resetAdministrativeData(supabase, churchId) {
  requireChurchId(churchId);
  await Promise.all([
    deleteAllSponsors(supabase, churchId),
    upsertAppSetting(
      supabase,
      "admin_settings",
      { telao: defaultAdminSettings.telao },
      churchId,
    ),
  ]);

  return defaultAdminSettings;
}

/**
 * Resolves effective image and video durations, including legacy fallback data.
 *
 * @returns {Promise<{ IMAGE: number, VIDEO: number }>}
 */
export async function getTelaoDefaultDurations(supabase, churchId) {
  requireChurchId(churchId);
  const settings = await getAdminSettings(supabase, churchId);

  return {
    IMAGE:
      Number(settings.telao.defaultDurationImage) ||
      Number(settings.telao.defaultDuration) ||
      10,
    VIDEO:
      Number(settings.telao.defaultDurationVideo) ||
      Number(settings.telao.defaultDuration) ||
      15,
  };
}
