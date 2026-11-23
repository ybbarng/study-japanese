import { isSuspectText } from "./hallucination";
import type { TranscriptLang } from "./schema";
import { hangulShare, japaneseShare } from "./script";
import { type ChunkResult, chunkText } from "./whisper-json";

/**
 * 한국어와 일본어가 섞인 오디오에서 조각마다 언어를 고른다.
 *
 * 1차로 조각마다 whisper 언어 감지(`-l auto`)로 전사한다. 대부분은 그것으로 끝난다.
 * 감지 언어와 글자 종류가 엇갈리거나 ko·ja 밖으로 감지된 조각만
 * `-l ko`·`-l ja`로 다시 전사해 아래 규칙으로 고른다(`planRerun` → `pickChunk`).
 */

/** 다시 전사할 언어 */
export type Rerun = { ko: boolean; ja: boolean };

/** 이 몫을 넘으면 그 언어 글로 본다 */
const SCRIPT_MAJORITY = 0.6;
/** ko·ja 밖으로 감지된 조각은 일본어 쪽을 조금 더 믿는다(짧은 일본어 낱말이 en·zh로 감지되곤 한다) */
const JA_BIAS = 0.15;

export function planRerun(auto: ChunkResult): Rerun {
  const text = chunkText(auto);
  if (text.length === 0) return { ko: false, ja: false };
  if (auto.lang === "ko" && !isSuspectText(text)) {
    return { ko: false, ja: japaneseShare(text) >= SCRIPT_MAJORITY };
  }
  if (auto.lang === "ja" && !isSuspectText(text)) {
    return { ko: hangulShare(text) >= SCRIPT_MAJORITY, ja: false };
  }
  return { ko: true, ja: true };
}

export type Picked = { lang: TranscriptLang; result: ChunkResult };

function usable(r: ChunkResult | undefined): r is ChunkResult {
  if (!r) return false;
  const text = chunkText(r);
  return text.length > 0 && !isSuspectText(text);
}

/** 고른 글의 글자 종류가 뚜렷하면 그것을 언어로, 아니면 `fallback`을 쓴다. */
function labelOf(r: ChunkResult, fallback: TranscriptLang): TranscriptLang {
  const text = chunkText(r);
  if (hangulShare(text) >= SCRIPT_MAJORITY) return "ko";
  if (japaneseShare(text) >= SCRIPT_MAJORITY) return "ja";
  return fallback;
}

/**
 * 조각 하나의 결과를 고른다. 쓸 만한 글이 없으면 undefined.
 * `ko`·`ja`는 `planRerun`이 요청한 다시 전사 결과다.
 */
export function pickChunk(
  auto: ChunkResult,
  rerun: { ko?: ChunkResult; ja?: ChunkResult },
): Picked | undefined {
  const { ko, ja } = rerun;
  const autoOk = usable(auto);

  // 감지가 ko·ja이고 글자도 맞으면 그대로 쓴다
  if (autoOk && auto.lang === "ko" && !ja)
    return { lang: labelOf(auto, "ko"), result: auto };
  if (autoOk && auto.lang === "ja" && !ko)
    return { lang: labelOf(auto, "ja"), result: auto };

  // ko로 감지됐지만 일본어 글이 나온 조각 → 일본어로 다시 들은 것을 쓴다
  if (auto.lang === "ko" && ja) {
    if (usable(ja)) return { lang: labelOf(ja, "ja"), result: ja };
    return autoOk ? { lang: labelOf(auto, "ja"), result: auto } : undefined;
  }
  // ja로 감지됐지만 한글이 나온 조각 → 한국어로 다시 들은 것을 쓴다
  if (auto.lang === "ja" && ko) {
    if (usable(ko)) return { lang: labelOf(ko, "ko"), result: ko };
    return autoOk ? { lang: labelOf(auto, "ko"), result: auto } : undefined;
  }

  // 그 밖(ko·ja 밖으로 감지됐거나 1차 글이 지어낸 것으로 보임): 두 결과를 견준다
  const koOk = usable(ko);
  const jaOk = usable(ja);
  if (koOk && !jaOk) return { lang: labelOf(ko, "ko"), result: ko };
  if (jaOk && !koOk) return { lang: labelOf(ja, "ja"), result: ja };
  if (!koOk || !jaOk) return undefined;
  // 한국어로 들었는데도 일본어 글이 나오면 일본어, 일본어로 들었는데도 한글이 나오면 한국어
  if (japaneseShare(chunkText(ko)) >= SCRIPT_MAJORITY)
    return { lang: "ja", result: ja };
  if (hangulShare(chunkText(ja)) >= SCRIPT_MAJORITY)
    return { lang: "ko", result: ko };
  return ja.meanLogProb >= ko.meanLogProb - JA_BIAS
    ? { lang: labelOf(ja, "ja"), result: ja }
    : { lang: labelOf(ko, "ko"), result: ko };
}
