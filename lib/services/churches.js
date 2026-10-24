import {
  formatWhatsAppNumber,
  getWhatsAppUrl,
} from "@/lib/utils/whatsapp";

/**
 * Loads the public church directory through the application API.
 *
 * @param {{ signal?: AbortSignal }} options - Optional cancellation signal.
 * @returns {Promise<Array<object>>} Active churches visible to the public.
 * @throws {Error} When the API cannot provide the directory.
 */
export async function fetchPublicChurches({ signal } = {}) {
  const response = await fetch("/api/igrejas", { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "Não foi possível carregar as igrejas");
  return payload.churches || [];
}

/**
 * Enables or disables a church's public routes.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Authenticated client.
 * @param {string} churchId - Church whose public visibility will change.
 * @param {boolean} isActive - Target visibility state.
 * @returns {Promise<void>}
 */
export async function setChurchRouteActive(supabase, churchId, isActive) {
  if (!churchId) throw new Error("Igreja não identificada");
  const { error } = await supabase
    .from("churches")
    .update({ is_active: Boolean(isActive) })
    .eq("id", churchId);
  if (error) throw error;
}

const churchAppearanceFields =
  "name, city, logo_url, cover_url, social_links, sponsorship_guidelines";

function isSponsorshipWhatsApp(link) {
  return /whatsapp.*patroc|patroc.*whatsapp/i.test(String(link?.label || ""));
}

/**
 * Retrieves only the persisted fields used by the church appearance form.
 *
 * @returns {Promise<object>} Raw database row for the requested church.
 * @throws {Error} When the church is missing or the query fails.
 */
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

/**
 * Maps database naming into the settings form contract without mutating input.
 * The sponsorship WhatsApp contact remains a dedicated field even though it is
 * stored alongside the remaining social links.
 *
 * @param {object | null | undefined} church - Church row returned by Supabase.
 * @returns {object} Appearance settings used by the administrative interface.
 */
export function mapChurchAppearance(church) {
  const socialLinks = Array.isArray(church?.social_links)
    ? church.social_links
    : [];
  const sponsorshipContact = socialLinks.find(isSponsorshipWhatsApp);
  return {
    parishName: church?.name || "",
    parishCity: church?.city || "",
    parishLogoUrl: church?.logo_url || "",
    parishCoverUrl: church?.cover_url || "",
    parishSocialLinks: socialLinks.filter((link) => !isSponsorshipWhatsApp(link)),
    parishSponsorshipGuidelines: church?.sponsorship_guidelines || "",
    parishSponsorshipWhatsApp: formatWhatsAppNumber(sponsorshipContact?.url),
  };
}

/**
 * Validates and persists the church's public identity and contact channels.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Authenticated client.
 * @param {string} churchId - Church being updated.
 * @param {object} appearance - Form values in application naming.
 * @returns {Promise<object>} Normalized appearance settings after persistence.
 * @throws {Error} When required identity fields are missing or persistence fails.
 */
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
    social_links: [
      ...(Array.isArray(appearance.parishSocialLinks)
        ? appearance.parishSocialLinks.filter(
            (link) => !isSponsorshipWhatsApp(link),
          )
        : []),
      ...(appearance.parishSponsorshipWhatsApp?.trim()
        ? [
            {
              label: "WhatsApp para patrocínios",
              url: getWhatsAppUrl(appearance.parishSponsorshipWhatsApp),
            },
          ]
        : []),
    ],
    sponsorship_guidelines:
      appearance.parishSponsorshipGuidelines?.trim() || "",
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
