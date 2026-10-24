import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import NetworkStatus from "@/components/shared/network-status";
import PwaServiceWorker from "@/components/shared/pwa-service-worker";
import AppMotion from "@/components/shared/app-motion";
import { HoverTipProvider } from "@/components/shared/hover-tip";
import { BRAND } from "@/lib/constants/brand";

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
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
  applicationName: BRAND.name,
  keywords: [
    "novenário",
    "festa paroquial",
    "telão",
    "parcerias",
    "patrocinadores",
    BRAND.name,
  ],
  icons: {
    icon: BRAND.markAsset,
    apple: BRAND.markAsset,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: BRAND.name,
    title: BRAND.name,
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: [{ url: BRAND.emblemAsset, alt: BRAND.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: [BRAND.emblemAsset],
  },
};

/** Root server layout that provides metadata, typography, motion and PWA wiring. */
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
