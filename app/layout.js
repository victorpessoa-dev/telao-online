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
  variable: "--font-vplaycast",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "vPlayCast",
    template: "%s | vPlayCast",
  },
  description:
    "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
  applicationName: "vPlayCast",
  keywords: [
    "novenário",
    "festa paroquial",
    "telão",
    "parcerias",
    "patrocinadores",
    "vPlayCast",
  ],
  icons: {
    icon: "/brand/virtus-playcast-mark.png",
    apple: "/brand/virtus-playcast-mark.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "vPlayCast",
    title: "vPlayCast",
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: [{ url: "/brand/virtus-playcast-mark.png", alt: "vPlayCast" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "vPlayCast",
    description:
      "Transparência na divulgação de parceiros em novenários e festas paroquiais.",
    images: ["/brand/virtus-playcast-mark.png"],
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
