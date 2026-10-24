/** Extracts a storage-safe WhatsApp number from plain text or a supported URL. */
export function normalizeWhatsAppNumber(value) {
  const contact = String(value || "").trim();
  if (!contact) return "";

  const linkNumber = contact.match(/(?:wa\.me\/|phone=)(\d{8,15})/i);
  const digits = linkNumber?.[1] || contact.replace(/\D/g, "");
  return digits.slice(0, 13);
}

/** Formats a normalized Brazilian contact number for presentation. */
export function formatWhatsAppNumber(value) {
  const digits = normalizeWhatsAppNumber(value);
  if (!digits) return "";

  const hasBrazilCountryCode = digits.startsWith("55") && digits.length > 11;
  const countryCode = hasBrazilCountryCode ? "+55 " : "";
  const local = hasBrazilCountryCode ? digits.slice(2) : digits;

  if (local.length <= 2) return `${countryCode}${local}`;

  const areaCode = local.slice(0, 2);
  const number = local.slice(2);
  if (number.length <= 4) return `${countryCode}(${areaCode}) ${number}`;

  const firstPartLength = number.length === 9 ? 5 : 4;
  return `${countryCode}(${areaCode}) ${number.slice(0, firstPartLength)}-${number.slice(firstPartLength)}`;
}

/** Builds the canonical wa.me URL or returns an empty value for invalid input. */
export function getWhatsAppUrl(value) {
  const number = normalizeWhatsAppNumber(value);
  return number ? `https://wa.me/${number}` : "";
}
