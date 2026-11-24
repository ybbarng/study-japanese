"use client";

import { useEffect, useMemo, useRef } from "react";
import { transcriptCues } from "@/lib/context/cues";
import { usePlaybackClock } from "@/lib/player/clock";
import {
  FOLLOW_HOLD_MS,
  followIndexAt,
  needsScroll,
  sentenceTimeline,
} from "@/lib/player/follow";
import { useTranscript } from "./use-transcript";

/**
 * 예문 오디오를 들을 때 지금 소리 나는 화면 문장의 차례(없으면 -1).
 * items 가운데 재생기에 올라 있는 것의 자막(서버가 소책자 문장과 맞춘 카드)으로 정한다.
 * 같은 대본을 읽는 오디오가 여럿이면(회화 Basic·Advanced) items에 함께 넘긴다.
 */
export function useFollowIndex(
  book: string,
  items: string[],
  sentences: { ja: string }[],
): number {
  const playing = usePlaybackClock((s) =>
    s.book === book && s.item && items.includes(s.item) ? s.item : null,
  );
  const transcript = useTranscript(
    playing ? book : undefined,
    playing ?? undefined,
  );
  const timeline = useMemo(
    () =>
      transcript && transcript.item === playing
        ? sentenceTimeline(transcriptCues(transcript), sentences)
        : [],
    [transcript, playing, sentences],
  );
  return usePlaybackClock((s) =>
    playing && s.item === playing ? followIndexAt(timeline, s.pos) : -1,
  );
}

/** 폰에서 화면 아래에 떠서 가리는 높이(아래 단추 영역 + 재생 막대) */
function coveredBottom(): number {
  let covered = 0;
  for (const sel of ["[data-bottom-nav]", "[data-player-bar]"]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || getComputedStyle(el).position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0) covered = Math.max(covered, window.innerHeight - r.top);
  }
  return covered;
}

/**
 * 지금 문장(selector로 찾는 요소)이 바뀌면 화면을 굴려 보이게 한다.
 * 손으로 화면을 굴리면(휠·터치·키) 잠시(4초) 따라 굴리지 않아 읽는 것을 방해하지 않는다.
 */
export function useFollowScroll(key: string | null, selector: string) {
  const heldUntil = useRef(0);

  useEffect(() => {
    const hold = () => {
      heldUntil.current = Date.now() + FOLLOW_HOLD_MS;
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        ["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(
          e.key,
        )
      )
        hold();
    };
    window.addEventListener("wheel", hold, { passive: true });
    window.addEventListener("touchmove", hold, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", hold);
      window.removeEventListener("touchmove", hold);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (key === null || Date.now() < heldUntil.current) return;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const covered = coveredBottom();
    if (!needsScroll(r, { height: window.innerHeight, coveredBottom: covered }))
      return;
    // 지금 문장을 보기 좋은 띠의 위쪽 1/3쯤에 둔다
    const band = window.innerHeight - covered;
    const top =
      window.scrollY +
      r.top -
      Math.max(window.innerHeight * 0.12, (band - r.height) / 3);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [key, selector]);
}
