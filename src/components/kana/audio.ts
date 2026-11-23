"use client";

import { audioUrl, hasAudio } from "@/lib/kana/data";
import { tokenize } from "@/lib/kana/text";

/** 한 번 못 받은 소리는 다시 시도하지 않는다(파일이 없으면 화면은 소리 없이 돈다). */
const missing = new Set<string>();
let current: HTMLAudioElement | null = null;

export function canPlay(soundId: string): boolean {
  return hasAudio(soundId) && !missing.has(soundId);
}

/** 글자 소리 하나를 낸다. 소리를 냈으면 true. */
export function playSound(soundId: string): Promise<boolean> {
  if (!canPlay(soundId) || typeof Audio === "undefined")
    return Promise.resolve(false);
  current?.pause();
  const audio = new Audio(audioUrl(soundId));
  current = audio;
  return new Promise((resolve) => {
    audio.onended = () => resolve(true);
    audio.onerror = () => {
      missing.add(soundId);
      resolve(false);
    };
    audio.play().catch((e: unknown) => {
      // 사용자가 누르기 전 자동 재생이 막힌 것은 파일이 없는 것과 다르다
      if (!(e instanceof DOMException && e.name === "NotAllowedError"))
        missing.add(soundId);
      resolve(false);
    });
  });
}

/** 낱말을 글자 하나씩 이어서 들려준다(소리가 있는 글자만). */
export async function playWord(word: string): Promise<boolean> {
  let any = false;
  for (const u of tokenize(word)) {
    if (u.soundId && canPlay(u.soundId)) {
      const ok = await playSound(u.soundId);
      any ||= ok;
    } else if (u.mark === "sokuon" || u.mark === "chouon") {
      await new Promise((r) => setTimeout(r, 180));
    }
  }
  return any;
}
