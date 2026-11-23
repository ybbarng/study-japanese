import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";
import { SongCredit } from "@/components/songs/song-credit";
import { SongList } from "@/components/songs/song-list";
import { loadSongList } from "@/lib/songs/server-data";

export const metadata = { title: "노래 — にほんご" };

// 외워 부르는 노래로 배우기: 뜻을 모르고 부르던 줄을 낱말·읽는 법으로 풀어 본다.
export default async function SongsPage() {
  const { songs, isAdmin, unregistered } = await loadSongList();
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
      {unregistered.length > 0 ? (
        <section className="mt-8" aria-labelledby="unregistered-title">
          <h2 id="unregistered-title" className="text-lg font-bold">
            서버에 있는 음원 · 아직 넣지 않음
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            누르면 그 파일로 노래 넣기가 열립니다. 제목·가수와 가사를 붙여
            넣으세요.
          </p>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">
            {unregistered.map((file) => (
              <li key={file}>
                <Link
                  href={`/songs/new?file=${encodeURIComponent(file)}`}
                  className="flex items-center justify-between rounded-xl border border-dashed border-line px-4 py-3 text-sm hover:border-accent"
                >
                  <span className="font-mono">{file}</span>
                  <span className="text-accent">넣기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <SongCredit className="mt-8" />
    </PageFrame>
  );
}
