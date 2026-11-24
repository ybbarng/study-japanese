"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player/store";
import type { Span } from "@/lib/quiz/clips";

// 확인 문제의 소리(예문 mp3의 문장 한 구간)를 사이트 재생기와 따로 튼다.
// 재생기가 돌고 있으면 잠깐 멈추고, 구간이 끝나면 이어 튼다(퀴즈가 듣던 흐름을 끊지 않게).
// 구간을 트는 동안 학습자가 재생기를 다시 틀면 구간을 멈추고 재생기는 그대로 둔다.

let audio: HTMLAudioElement | null = null;
let stopCurrent: (() => void) | null = null;
const listeners = new Set<(playing: boolean) => void>();

function notify(playing: boolean) {
  for (const l of listeners) l(playing);
}

export function stopClip() {
  stopCurrent?.();
}

export function playClip(src: string, span: Span): void {
  stopClip();
  if (!audio) audio = new Audio();
  const el = audio;
  const player = usePlayer.getState();
  const resume = player.wantPlaying;
  if (resume) player.setPlaying(false);

  let frame = 0;
  let done = false;
  const start = () => {
    if (done) return;
    el.currentTime = span.start;
    el.play().then(
      () => {
        if (done) {
          el.pause();
          return;
        }
        notify(true);
        frame = requestAnimationFrame(tick);
      },
      () => finish(true),
    );
  };
  const fail = () => finish(true);
  const finish = (resumePlayer: boolean) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    el.removeEventListener("loadedmetadata", start);
    el.removeEventListener("error", fail);
    el.pause();
    unsubPlayer();
    stopCurrent = null;
    notify(false);
    if (resumePlayer && resume) usePlayer.getState().setPlaying(true);
  };
  // 재생기를 학습자가 다시 틀면 구간을 멈춘다(재생기는 건드리지 않는다)
  const unsubPlayer = usePlayer.subscribe((s, p) => {
    if (s.wantPlaying && !p.wantPlaying) finish(false);
  });
  const tick = () => {
    if (el.currentTime >= span.end || el.ended) finish(true);
    else frame = requestAnimationFrame(tick);
  };
  stopCurrent = () => finish(true);

  const url = new URL(src, window.location.href).href;
  if (el.src !== url || el.readyState < 1) {
    el.addEventListener("loadedmetadata", start, { once: true });
    el.addEventListener("error", fail, { once: true });
    if (el.src !== url) {
      el.src = url;
      el.preload = "auto";
      el.load();
    }
  } else start();
}

/** 구간이 지금 소리 나는 중인지 */
export function useClipPlaying(): boolean {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    listeners.add(setPlaying);
    return () => {
      listeners.delete(setPlaying);
    };
  }, []);
  return playing;
}

/** 화면을 떠나면 구간을 멈춘다 */
export function useStopClipOnUnmount() {
  useEffect(() => () => stopClip(), []);
}
