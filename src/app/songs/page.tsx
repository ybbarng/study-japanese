import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";
import { SongCredit } from "@/components/songs/song-credit";
import { SongList } from "@/components/songs/song-list";
import { loadSongList } from "@/lib/songs/server-data";

export const metadata = { title: "노래 — にほんご" };

// 외워 부르는 노래로 배우기: 뜻을 모르고 부르던 줄을 낱말·읽는 법으로 풀어 본다.
export default async function SongsPage() {
  const { songs, isAdmin } = await loadSongList();
  return (
    <PageFrame className="pb-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-ink-faint lg:hidden">
            ← にほんご
          </Link>
          <h1 className="mt-3 text-2xl font-bold lg:mt-0 lg:text-3xl">
            노래로 배우기
          </h1>
          <p className="mt-1 text-sm text-ink-soft lg:text-base">
            외워 부르는 노래의 줄마다 읽는 법과 낱말을 풀어 봅니다. 줄을 익히면
            표시하세요.
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/songs/new"
            className="mt-8 shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white lg:mt-0"
          >
            노래 넣기
          </Link>
        ) : null}
      </header>
      <div className="mt-6">
        <SongList songs={songs} isAdmin={isAdmin} />
      </div>
      <SongCredit className="mt-8" />
    </PageFrame>
  );
}
