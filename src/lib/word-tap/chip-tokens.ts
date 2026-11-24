import type { CueWord } from "@/lib/context/cards";
import type { TapToken } from "./tokens";

// 자막 카드의 낱말 칩을 낱말 정보 창이 받는 조각으로 바꾼다. 분석 파일이 없는 줄(받아 적은 글)도
// 칩을 누르면 정보 창이 열리고 ←·→로 칩 사이를 옮겨 다닌다. 화면을 모르는 순수 함수다.

/** 칩 하나 = 기본형 낱말 하나(활용한 꼴로 찾았어도 칩은 사전형이다) */
export function chipTokens(words: readonly CueWord[]): TapToken[] {
  return words.map((w) => ({
    surface: w.ja,
    ...(w.reading && w.reading !== w.ja ? { reading: w.reading } : {}),
    gloss: w.ko,
  }));
}

/** 정보 창 열쇠: 같은 칩 묶음이면 같은 값(분석 문장 열쇠와 겹치지 않게 머리를 붙인다) */
export function chipKey(words: readonly CueWord[]): string {
  return `chips:${words.map((w) => w.ja).join("|")}`;
}
