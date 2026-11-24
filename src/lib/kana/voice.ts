/**
 * 낱말 소리를 낼 일본어 음성 고르기. 브라우저에 든 음성 합성(Web Speech API)을 쓴다:
 * 안드로이드 Chrome은 Google 일본어, 맥은 Kyoko 등이 들어 있다. 받는 것은 없다.
 * 음성 합성은 낱말 단위로 읽어 높낮이·길이가 붙는다. 글자 파일을 잇는 것보다 실제 발음에 가깝다.
 */

export interface VoiceLike {
  lang: string;
  name: string;
  localService: boolean;
}

/** 표준 발음으로 읽는 음성(맥 Kyoko·Otoya·O-Ren, 안드로이드·Chrome Google) */
const STANDARD = /kyoko|otoya|o-ren|google|日本語/i;
/** 맥의 장난·노인 목소리 음성. 표준 발음을 듣는 데 맞지 않는다 */
const NOVELTY = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

/**
 * 일본어 음성 가운데 하나. 표준 발음 음성을 먼저, 장난 음성은 맨 뒤로,
 * 같은 급이면 기기 안 음성(오프라인에서도 됨)을 먼저 고른다.
 */
export function pickJapaneseVoice<V extends VoiceLike>(
  voices: readonly V[],
): V | null {
  const ja = voices.filter((v) => /^ja([-_]|$)/i.test(v.lang));
  if (ja.length === 0) return null;
  const score = (v: V) =>
    (STANDARD.test(v.name) ? 4 : 0) +
    (NOVELTY.test(v.name) ? -4 : 0) +
    (v.localService ? 1 : 0);
  return [...ja].sort((a, b) => score(b) - score(a))[0];
}

/** 낱말 소리를 어떻게 냈는지. 화면이 학습자에게 알린다 */
export type WordVoice = "tts" | "joined";

export const WORD_VOICE_NOTE: Record<WordVoice, string> = {
  tts: "기계 음성으로 읽은 소리예요",
  joined: "글자 소리를 이은 것 — 실제 발음과 높낮이가 달라요",
};
