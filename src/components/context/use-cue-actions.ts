"use client";

import { useCallback } from "react";
import type { ContextCue } from "@/lib/context/cues";
import { type CueLoop, toggleLoop } from "@/lib/player/cue-loop";
import { usePlayer } from "@/lib/player/store";

/**
 * 자막 줄에서 쓰는 손잡이: 그 말부터 듣기, 그 문장 반복.
 * 반복 중에 다른 줄을 누르면 반복도 그 줄로 옮긴다(풀리지 않게).
 */
export function useCueActions(book: string, item: string) {
  const loop = usePlayer((s) =>
    s.cueLoop && s.cueLoop.book === book && s.cueLoop.item === item
      ? s.cueLoop
      : null,
  );

  const loopOf = useCallback(
    (cue: ContextCue): CueLoop => ({
      book,
      item,
      start: cue.start,
      end: cue.end,
    }),
    [book, item],
  );

  const seek = useCallback(
    (cue: ContextCue) => {
      const st = usePlayer.getState();
      if (st.cueLoop) st.setCueLoop(loopOf(cue));
      st.seekTo(cue.start);
    },
    [loopOf],
  );

  const toggle = useCallback(
    (cue: ContextCue) => {
      const st = usePlayer.getState();
      const next = toggleLoop(st.cueLoop, loopOf(cue));
      st.setCueLoop(next);
      if (next) st.seekTo(cue.start);
    },
    [loopOf],
  );

  const isLooping = (cue: ContextCue) => loop?.start === cue.start;

  return { seek, toggle, isLooping, looping: loop !== null };
}
