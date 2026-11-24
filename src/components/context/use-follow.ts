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

/** 화면 위·아래에 붙어 가리는 높이(폰 강 화면 위 재생기, 다른 화면의 아래 재생 막대) */
function covered(): { top: number; bottom: number } {
  let top = 0;
  let bottom = 0;
  for (const el of document.querySelectorAll<HTMLElement>(
    "[data-player-bar]",
  )) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const position = getComputedStyle(el).position;
    if (position === "fixed" && r.bottom >= window.innerHeight - 1)
      bottom = Math.max(bottom, window.innerHeight - r.top);
    // 위에 붙어 있는(sticky가 걸린) 재생기
    if (position === "sticky" && r.top <= 1) top = Math.max(top, r.bottom);
  }
  return { top, bottom };
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
    const cov = covered();
    const view = {
      height: window.innerHeight,
      coveredTop: cov.top,
      coveredBottom: cov.bottom,
    };
    if (!needsScroll(r, view)) return;
    // 지금 문장을 가리지 않는 띠의 위쪽 1/3쯤에 둔다
    const band = window.innerHeight - cov.top - cov.bottom;
    const offset = Math.max(
      window.innerHeight * 0.12,
      cov.top + Math.max(16, (band - r.height) / 3),
    );
    const top = window.scrollY + r.top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [key, selector]);
}
