"use client";

import { create } from "zustand";

// 사이트 재생기(GlobalPlayer)의 손잡이를 화면 안 재생기(강 화면 위에 붙은 재생기)에 빌려준다.
// <audio>는 GlobalPlayer 하나가 쥐고, 화면 안 재생기는 이 손잡이만 부른다.

export interface PlayerHandles {
  toggle: () => void;
  prev: () => void;
  next: () => void;
  seek: (sec: number) => void;
  seekBy: (delta: number) => void;
  /** 지금 듣는 자막 문장 반복 켜고 끄기(L 키와 같다) */
  loop: () => void;
  /** A–B 구간: 시작 찍기 → 끝 찍기 → 풀기 */
  markAb: () => void;
}

interface PlayerControls {
  handles: PlayerHandles | null;
  /** 실제 <audio>가 멈춰 있는지 */
  paused: boolean;
  /** 따라 말하기 간격 중이면 그 길이(초) */
  gap: number | null;
  /** 지금 화면에 붙어 있는 화면 안 재생기 수. 하나라도 있으면 아래 막대를 감춘다 */
  hosts: number;
}

export const usePlayerControls = create<PlayerControls>()(() => ({
  handles: null,
  paused: true,
  gap: null,
  hosts: 0,
}));
