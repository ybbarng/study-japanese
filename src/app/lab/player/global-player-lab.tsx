"use client";

import type { Track } from "@/lib/player/queue";
import { usePlayer } from "@/lib/player/store";

/** 사이트 전체 재생기로 1강 예문을 따라 말하기 간격과 함께 틀어 본다. */
export function GlobalPlayerLab({ tracks }: { tracks: Track[] }) {
  const playQueue = usePlayer((s) => s.playQueue);
  const setShadowGap = usePlayer((s) => s.setShadowGap);
  return (
    <section className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <button
        type="button"
        onClick={() => {
          setShadowGap(true);
          playQueue(tracks);
        }}
        className="w-full rounded-2xl bg-accent-soft p-5 text-left"
      >
        <span className="block text-lg font-medium text-accent">
          사이트 재생기로 시험
        </span>
        <span className="text-sm text-ink-soft">
          1강 예문 6개, 따라 말하기 간격 켬. 화면을 끄고 넘어가는지 보세요.
        </span>
      </button>
    </section>
  );
}
