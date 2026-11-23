import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFrame } from "@/components/shell/page-frame";
import { SongForm } from "@/components/songs/song-form";
import { isSlug } from "@/lib/songs/schema";
import { loadSongPage } from "@/lib/songs/server-data";

export const metadata = { title: "노래 고치기 — にほんご" };

interface Props {
  params: Promise<{ slug: string }>;
}

// 관리자만(proxy.ts가 로그인 화면으로 보낸다)
export default async function EditSongPage({ params }: Props) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const data = await loadSongPage(slug);
  if (!data?.isAdmin) notFound();
  return (
    <PageFrame className="pb-16">
      <Link href={`/songs/${slug}`} className="text-sm text-ink-faint">
        ← 가사로
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold">노래 고치기</h1>
      <SongForm song={data.song} />
    </PageFrame>
  );
}
