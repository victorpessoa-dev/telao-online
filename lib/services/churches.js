export async function fetchPublicChurches({ signal } = {}) {
  const response = await fetch("/api/igrejas", { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "Não foi possível carregar as igrejas");
  return payload.churches || [];
}

export async function setChurchRouteActive(supabase, churchId, isActive) {
  if (!churchId) throw new Error("Igreja não identificada");
  const { error } = await supabase
    .from("churches")
    .update({ is_active: Boolean(isActive) })
    .eq("id", churchId);
  if (error) throw error;
}

const churchAppearanceFields = "name, city, logo_url, cover_url, social_links";

export async function getChurchAppearance(supabase, churchId) {
  if (!churchId) throw new Error("Igreja não identificada");

  const { data, error } = await supabase
    .from("churches")
    .select(churchAppearanceFields)
    .eq("id", churchId)
    .single();

  if (error) throw error;
  return data;
}

export function mapChurchAppearance(church) {
  return {
    parishName: church?.name || "",
    parishCity: church?.city || "",
    parishLogoUrl: church?.logo_url || "",
    parishCoverUrl: church?.cover_url || "",
    parishSocialLinks: Array.isArray(church?.social_links)
      ? church.social_links
      : [],
  };
}

export async function saveChurchAppearance(supabase, churchId, appearance) {
  if (!churchId) throw new Error("Igreja não identificada");

  const name = appearance.parishName?.trim();
  const city = appearance.parishCity?.trim();
  if (!name || !city) {
    throw new Error("Informe o nome e a cidade da igreja.");
  }

  const payload = {
    name,
    city,
    logo_url: appearance.parishLogoUrl?.trim() || null,
    cover_url: appearance.parishCoverUrl?.trim() || null,
    social_links: Array.isArray(appearance.parishSocialLinks)
      ? appearance.parishSocialLinks
      : [],
  };

  const { data, error } = await supabase
    .from("churches")
    .update(payload)
    .eq("id", churchId)
    .select(churchAppearanceFields)
    .single();

  if (error) throw error;
  return mapChurchAppearance(data);
}
