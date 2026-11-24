"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DictExample } from "@/lib/dictionary/server";
import { usePlaybackClock } from "@/lib/player/clock";
import { usePlayer } from "@/lib/player/store";

/**
 * 예문 mp3를 그 문장 자리부터 튼다. 트랙을 올린 뒤 재생기가 그 트랙 위치를 알리면 옮긴다
 * (불러오기 전에 옮기면 무시될 수 있어서).
 */
function playExample(ex: DictExample) {
  const player = usePlayer.getState();
  player.playQueue([ex.track]);
  const cue = ex.cue;
  if (!cue) return;
  const unsub = usePlaybackClock.subscribe((s) => {
    if (s.book !== ex.track.book || s.item !== ex.track.item) return;
    unsub();
    usePlayer.getState().seekTo(cue.start);
  });
  setTimeout(unsub, 15_000);
}

/** 낱말이 나오는 교재 예문. 낱말 자리는 강조하고, 누르면 그 문장 소리를 듣는다 */
export function WordExamples({ examples }: { examples: DictExample[] }) {
  const now = usePlayer((s) => s.queue[s.index]?.item ?? null);
  if (examples.length === 0)
    return (
      <p className="text-sm text-ink-faint">
        아직 이 낱말이 든 예문 분석이 없습니다.
      </p>
    );
  return (
    <ol className="flex flex-col gap-3">
      {examples.map((ex, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 같은 문장이 여러 예문에 나올 수 있다
        <li key={i} className="flex gap-3 rounded-2xl bg-bg-raised p-4">
          <button
            type="button"
            onClick={() => playExample(ex)}
            aria-label={`${ex.lessonLabel} ${ex.kindLabel} 예문 듣기`}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full",
              now === ex.track.item
                ? "bg-accent text-white"
                : "bg-accent-soft text-accent",
            )}
          >
            ▶
          </button>
          <div className="min-w-0 flex-1">
            <p
              lang="ja"
              className="font-ja-serif text-xl leading-loose [&_rt]:text-[0.45em] lg:text-2xl"
            >
              {ex.parts.map((p, k) => {
                const hit = cn(p.hit && "text-accent font-bold");
                // 글 조각 차례가 곧 열쇠다
                const key = `${k}-${p.text}`;
                return p.reading ? (
                  <ruby key={key} className={hit}>
                    {p.text}
                    <rt className="text-ink-soft">{p.reading}</rt>
                  </ruby>
                ) : (
                  <span key={key} className={hit}>
                    {p.text}
                  </span>
                );
              })}
            </p>
            <p className="text-ink-soft">{ex.ko}</p>
            <p className="mt-1 text-xs text-ink-faint">
              <Link
                href={`/ilmuta/${ex.lesson}`}
                className="underline underline-offset-4"
              >
                일무따 {ex.lessonLabel}
              </Link>{" "}
              · {ex.kindLabel}
              {ex.cue ? "" : " · 이 문장 자리를 못 찾아 파일 처음부터 재생"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
