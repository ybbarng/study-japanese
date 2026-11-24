import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Sans_KR, Noto_Serif_JP } from "next/font/google";
import { AutoPrefetch } from "@/components/offline/auto-prefetch";
import { GlobalPlayer } from "@/components/player/global-player";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

// 굵기를 따로 적지 않아 가변 글꼴 한 벌을 쓴다. 한중일 글꼴은 굵기마다 글자 범위 조각이 100개 넘게
// 붙어서, 굵기를 셋 적으면 화면을 그리기 전에 받아야 하는 글꼴 CSS가 세 배가 된다(느린 폰에서 첫 표시가 늦다).
const sansKr = Noto_Sans_KR({
  variable: "--font-kr",
  subsets: ["latin"],
  preload: false,
});
const sansJp = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  preload: false,
});
const serifJp = Noto_Serif_JP({
  variable: "--font-jp-serif",
  subsets: ["latin"],
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
