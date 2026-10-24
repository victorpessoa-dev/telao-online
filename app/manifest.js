export default function manifest() {
  return {
    name: "Telão Online",
    short_name: "Telão Online",
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
        src: "/brand/logo-telao-online.webp",
        sizes: "1110x780",
        type: "image/webp",
        purpose: "any maskable",
      },
    ],
  };
}
