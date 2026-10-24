import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import NetworkStatus from "@/components/shared/network-status";
import PwaServiceWorker from "@/components/shared/pwa-service-worker";
import AppMotion from "@/components/shared/app-motion";
import { HoverTipProvider } from "@/components/shared/hover-tip";

const poppins = localFont({
  src: "../public/fonts/Poppins-ExtraBold.ttf",
  weight: "800",
  variable: "--font-telao-online",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Telão Online",
    template: "%s | Telão Online",
  },
  description:
    "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
  applicationName: "Telão Online",
  keywords: [
    "novenário",
    "festa paroquial",
    "telão",
    "parcerias",
    "patrocinadores",
    "Telão Online",
  ],
  icons: {
    icon: "/brand/logo-telao-online.png",
    apple: "/brand/logo-telao-online.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Telão Online",
    title: "Telão Online",
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: [{ url: "/brand/emblema-telao-online.png", alt: "Telão Online" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Telão Online",
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: ["/brand/emblema-telao-online.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${poppins.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <HoverTipProvider>
          <AppMotion>{children}</AppMotion>
          <NetworkStatus />
          <PwaServiceWorker />
          <Analytics />
        </HoverTipProvider>
      </body>
    </html>
  );
}
