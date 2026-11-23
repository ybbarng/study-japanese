import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Sans_KR, Noto_Serif_JP } from "next/font/google";
import { AutoPrefetch } from "@/components/offline/auto-prefetch";
import { GlobalPlayer } from "@/components/player/global-player";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const sansKr = Noto_Sans_KR({
  variable: "--font-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});
const sansJp = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});
const serifJp = Noto_Serif_JP({
  variable: "--font-jp-serif",
  subsets: ["latin"],
  weight: ["500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "にほんご",
  description: "걸으며 듣고 따라 말하는 일본어 학습 공간",
  applicationName: "にほんご",
  appleWebApp: {
    capable: true,
    title: "にほんご",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0e1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${sansKr.variable} ${sansJp.variable} ${serifJp.variable}`}
    >
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <GlobalPlayer />
        <AutoPrefetch />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
