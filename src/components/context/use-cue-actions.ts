"use client";

import { useCallback } from "react";
import type { ContextCue } from "@/lib/context/cues";
import { usePlaybackClock } from "@/lib/player/clock";
import {
  type CueLoop,
  resolveLoopCue,
  toggleLoop,
} from "@/lib/player/cue-loop";
import { usePlayer } from "@/lib/player/store";

/** 마지막으로 자막 줄을 눌러 옮긴 곳(반복이 그 줄을 잡게) */
export function recentSeek(): { sec: number; ageSec: number } | null {
  const req = usePlayer.getState().seekRequest;
  return req ? { sec: req.sec, ageSec: (Date.now() - req.at) / 1000 } : null;
}

/**
 * 자막 줄에서 쓰는 손잡이: 그 말부터 듣기, 그 문장 반복.
 * 반복 중에 다른 줄을 누르면 반복도 그 줄로 옮긴다(풀리지 않게).
 * 반복을 걸 때는 누른 순간 재생 위치가 다음 문장으로 넘어갔어도 화면에 보이던 문장을 잡는다(resolveLoopCue).
 */
export function useCueActions(
  book: string,
  item: string,
  cues: ContextCue[] = [],
) {
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
      const clock = usePlaybackClock.getState();
      let target = cue;
      const pressed = cues.indexOf(cue);
      if (clock.book === book && clock.item === item && pressed >= 0) {
        const i = resolveLoopCue(cues, clock.pos, {
          pressed,
          seek: recentSeek(),
        });
        if (i >= 0) target = cues[i];
      }
      const next = toggleLoop(st.cueLoop, loopOf(target));
      // 반복 중인 문장의 단추를 다시 누르면(화면이 다음 줄로 넘어갔어도) 푼다
      if (st.cueLoop && next && st.cueLoop.start === cue.start) {
        st.setCueLoop(null);
        return;
      }
      st.setCueLoop(next);
      if (next) st.seekTo(target.start);
    },
    [book, item, cues, loopOf],
  );

  const isLooping = (cue: ContextCue) => loop?.start === cue.start;

  return { seek, toggle, isLooping, looping: loop !== null };
}
