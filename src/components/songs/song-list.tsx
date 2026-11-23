"use client";

import Link from "next/link";
import type { SongSummary } from "@/lib/songs/schema";
import { knownCount } from "@/lib/songs/study-state";
import { useSongsStudyStore } from "@/lib/songs/study-store";
import { useSongsStudyReady } from "./use-songs-study";

/** 노래 목록: 제목·가수·익힌 줄. 관리자에게는 가사 공개 여부와 박자를 맞춘 줄도 */
export function SongList({
  songs,
  isAdmin,
}: {
  songs: SongSummary[];
  isAdmin: boolean;
}) {
  const ready = useSongsStudyReady();
  const data = useSongsStudyStore((s) => s.data);

  if (songs.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-ink-faint">
        {isAdmin
          ? "아직 넣은 노래가 없습니다. 오른쪽 위 “노래 넣기”로 첫 곡을 넣으세요."
          : "아직 공개한 노래가 없습니다."}
      </p>
    );

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {songs.map((song) => {
        const known = ready ? knownCount(data, song.slug, song.lineKeys) : 0;
        const ratio = song.lineCount > 0 ? known / song.lineCount : 0;
        return (
          <li key={song.slug}>
            <Link
              href={`/songs/${song.slug}`}
              className="block rounded-2xl bg-bg-raised p-4 hover:ring-1 hover:ring-accent/50 active:bg-bg-sunken lg:p-5"
            >
              <span
                lang="ja"
                className="block font-ja-serif text-xl font-bold lg:text-2xl"
              >
                {song.title}
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                {song.artist}
              </span>
              <span className="mt-3 block h-1 overflow-hidden rounded bg-line">
                <span
                  className="block h-full bg-good"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </span>
              <span className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-faint">
                <span>
                  익힌 줄 {known}/{song.lineCount}
                </span>
                {isAdmin ? (
                  <>
                    <span>
                      박자 {song.timedCount}/{song.lineCount}
                    </span>
                    {song.lyricsPublic ? null : (
                      <span className="text-warn">가사 비공개</span>
                    )}
                  </>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
