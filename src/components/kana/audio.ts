"use client";

import { audioUrl, hasAudio } from "@/lib/kana/data";
import { tokenize } from "@/lib/kana/text";

/**
 * 가나 소리는 사이트 재생기(교재 오디오 대기열)와 따로, 짧은 효과음처럼 낸다.
 * 파일을 받지 못한 소리는 다시 시도하지 않는다(파일이 없으면 화면은 글로 대신한다).
 */
const missing = new Set<string>();
let current: HTMLAudioElement | null = null;

/** played: 끝까지 냄 / missing: 파일 없음 / skipped: 다른 소리로 끊김·자동 재생 막힘 */
export type PlayResult = "played" | "missing" | "skipped";

export function canPlay(soundId: string): boolean {
  return hasAudio(soundId) && !missing.has(soundId);
}

export function playSound(soundId: string): Promise<PlayResult> {
  if (!canPlay(soundId)) return Promise.resolve("missing");
  if (typeof Audio === "undefined") return Promise.resolve("skipped");
  current?.pause();
  const audio = new Audio(audioUrl(soundId));
  current = audio;
  return new Promise((resolve) => {
    audio.onended = () => resolve("played");
    // 다른 소리가 이 소리를 멈춘 것. 파일 문제가 아니다.
    audio.onpause = () => {
      if (!audio.ended) resolve("skipped");
    };
    audio.onerror = () => {
      missing.add(soundId);
      resolve("missing");
    };
    // play() 거부(AbortError·NotAllowedError)는 파일이 없다는 뜻이 아니다. 파일 문제는 onerror가 알린다.
    audio.play().catch(() => resolve("skipped"));
  });
}

/** 낱말을 글자 하나씩 이어서 들려준다(소리가 있는 글자만). 하나라도 냈으면 played. */
export async function playWord(word: string): Promise<PlayResult> {
  let result: PlayResult = "missing";
  for (const u of tokenize(word)) {
    if (u.soundId && canPlay(u.soundId)) {
      const r = await playSound(u.soundId);
      if (r === "skipped") return "skipped";
      if (r === "played") result = "played";
    } else if (u.mark === "sokuon" || u.mark === "chouon") {
      await new Promise((r) => setTimeout(r, 180));
    }
  }
  return result;
}
