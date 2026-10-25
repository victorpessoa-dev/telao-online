import { BRAND } from "@/lib/constants/brand";

/** Builds the installable web-app manifest from the centralized brand contract. */
export default function manifest() {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: "Transmissão de missas e celebrações religiosas da paróquia",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#f8fbff",
    lang: "pt-BR",
    categories: ["religion", "video"],
    icons: [
      {
        src: BRAND.markAsset,
        sizes: "1110x780",
        type: "image/webp",
        purpose: "any maskable",
      },
    ],
  };
}
