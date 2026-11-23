import { notFound } from "next/navigation";
import { TapSync } from "@/components/songs/tap-sync";
import { isSlug } from "@/lib/songs/schema";
import { loadSongPage } from "@/lib/songs/server-data";

export const metadata = { title: "박자 맞추기 — にほんご" };

interface Props {
  params: Promise<{ slug: string }>;
}

// 관리자만(proxy.ts가 로그인 화면으로 보낸다)
export default async function SongSyncPage({ params }: Props) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const data = await loadSongPage(slug);
  if (!data?.isAdmin) notFound();
  return <TapSync song={data.song} />;
}
