import {
  defaultAdminSettings,
  mergeAdminSettings,
} from "@/lib/mappers/settings";
import { deleteAllSponsors } from "@/lib/repositories/sponsors";
import { getAppSetting, upsertAppSetting } from "@/lib/repositories/settings";

function requireChurchId(churchId) {
  if (!churchId)
    throw new Error("Cadastre sua igreja antes de salvar configurações.");
}

export async function getAdminSettings(supabase, churchId) {
  requireChurchId(churchId);
  return mergeAdminSettings(
    await getAppSetting(supabase, "admin_settings", churchId),
  );
}

export async function saveAdminSettings(supabase, settings, churchId) {
  requireChurchId(churchId);
  const normalized = mergeAdminSettings(settings);
  const { appearance: _appearance, ...adminSettings } = normalized;
  await upsertAppSetting(supabase, "admin_settings", adminSettings, churchId);
  return normalized;
}

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
