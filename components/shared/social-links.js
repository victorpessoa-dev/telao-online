"use client";

import {
  Facebook,
  Globe,
  Instagram,
  Music2,
  Send,
  Youtube,
} from "lucide-react";
import { isSafePublicUrl, normalizePublicUrl } from "@/lib/utils/url";

export function WhatsAppIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12.04 2.25A9.7 9.7 0 0 0 2.3 11.94c0 1.7.45 3.35 1.3 4.8l-1.38 5.01 5.14-1.34a9.72 9.72 0 0 0 4.68 1.2h.01a9.69 9.69 0 0 0-.01-19.36Zm0 17.72h-.01a8.07 8.07 0 0 1-4.1-1.12l-.3-.17-3.05.8.82-2.97-.19-.31a8.05 8.05 0 1 1 6.83 3.77Zm4.42-6.02c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function getSocialIcon(label = "") {
  const normalized = label.toLowerCase();
  if (normalized.includes("whatsapp") || normalized.includes("zap"))
    return WhatsAppIcon;
  if (normalized.includes("instagram")) return Instagram;
  if (normalized.includes("facebook")) return Facebook;
  if (normalized.includes("youtube")) return Youtube;
  if (normalized.includes("tiktok")) return Music2;
  if (normalized.includes("telegram")) return Send;
  return Globe;
}

export function normalizeSocialLinks(profile = {}) {
  const extraLinks = Array.isArray(profile.parishSocialLinks)
    ? profile.parishSocialLinks
    : [];

  return extraLinks
    .map((item, index) => {
      const label = String(item?.label || "").trim();
      const url = normalizePublicUrl(item?.url);
      return {
        key: item?.id || `social-${index}`,
        label: label || "Link",
        url,
        Icon: getSocialIcon(label || url),
      };
    })
    .filter((item) => isSafePublicUrl(item.url));
}
