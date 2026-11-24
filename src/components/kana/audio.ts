"use client";

import { audioUrl, hasAudio } from "@/lib/kana/data";
import { tokenize } from "@/lib/kana/text";
import { pickJapaneseVoice, type WordVoice } from "@/lib/kana/voice";

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
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
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

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  return pickJapaneseVoice(speechSynthesis.getVoices());
}

/** 낱말 소리를 지금 기기에서 어떻게 낼지(음성 목록은 늦게 차므로 누를 때마다 다시 본다) */
export function wordVoice(): WordVoice {
  return japaneseVoice() ? "tts" : "joined";
}

function speak(word: string, voice: SpeechSynthesisVoice): Promise<PlayResult> {
  current?.pause();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  return new Promise((resolve) => {
    u.onend = () => resolve("played");
    u.onerror = () => resolve("skipped");
    speechSynthesis.speak(u);
  });
}

/**
 * 낱말 소리. 일본어 음성 합성이 있으면 그것으로 낱말째 읽고(높낮이·길이가 붙는다),
 * 없으면 글자 소리를 하나씩 잇는다(소리가 있는 글자만, 하나라도 냈으면 played).
 */
export async function playWord(word: string): Promise<PlayResult> {
  const voice = japaneseVoice();
  if (voice) return speak(word, voice);
  return playJoined(word);
}

async function playJoined(word: string): Promise<PlayResult> {
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
