import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";
import { SongForm } from "@/components/songs/song-form";

export const metadata = { title: "노래 넣기 — にほんご" };

// 관리자만(proxy.ts가 로그인 화면으로 보낸다)
export default function NewSongPage() {
  return (
    <PageFrame className="pb-16">
      <Link href="/songs" className="text-sm text-ink-faint">
        ← 노래 목록
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold">노래 넣기</h1>
      <SongForm />
    </PageFrame>
  );
}
