import {
  loadIlmuta,
  loadTranscript,
  loadTranscriptReview,
} from "@/lib/textbook/load";
import { withoutNoise } from "@/lib/transcript/hallucination";
import { ilmuntaGlossary } from "./card-sources";
import { kanaOf } from "./cards";
import type { Transcript } from "./cues";
import { reviewedForPairs, type TranscriptReview } from "./review";
import {
  findRepeatPairs,
  PAIR_MIN_SIMILARITY,
  type TranscriptPair,
} from "./transcript-pairs";

// 일문따 과 하나의 문장 짝: 그 과 문법 예문(`05-1`) 자막에서 일본어·뜻 되풀이를 찾는다.
// 짝 파일을 따로 만들지 않고 요청 때 자막으로 만든다(자막이 그대로면 같은 결과를 다시 쓴다).
// 둘째 예문(`-2`)은 되풀이해 읽지 않아 짝이 나오지 않으므로 보지 않는다.
// 한 번은 한자로, 한 번은 가나로 받아 적은 되풀이도 짝으로 찾도록 낱말 읽는 법으로 풀어 견준다
// (일무따 단어 읽는 법은 비교에만 쓰고 화면에 보이지 않는다).

/** 과 번호 → 문법 예문 항목 이름 */
export function grammarExampleItem(no: number): string {
  return `${String(no).padStart(2, "0")}-1`;
}

const NONE: TranscriptPair[] = [];
const cache = new WeakMap<
  Transcript,
  { review: TranscriptReview | null; pairs: TranscriptPair[] }
>();

/**
 * 과의 예문 mp3(문법 예문 `-1`·읽기 글 `-2`) 자막의 일본어 줄. 강의에서 한 번만 들린 줄을
 * 따로 받아 적은 같은 문장과 견줄 때 쓴다(fixed-cards의 ④). exceptItem 자막의 줄은 뺀다(자기와 견주지 않게).
 */
export function ilmuntaLessonLines(
  no: number,
  exceptItem: string,
  dir?: string,
): string[] {
  const nn = String(no).padStart(2, "0");
  return [`${nn}-1`, `${nn}-2`]
    .filter((item) => item !== exceptItem)
    .flatMap((item) =>
      withoutNoise(loadTranscript("ilmunta", item, dir)?.segments ?? [])
        .filter((s) => s.lang === "ja")
        .map((s) => s.text),
    );
}

/**
 * 과의 짝. 자막이 없으면 빈 열(자막·교정 파일이 그대로면 같은 객체라 호출하는 쪽이 캐시 열쇠로 쓸 수 있다).
 * 그 예문 자막의 교정 파일이 있으면 먼저 반영한다: 뜻 줄의 받아쓰기 오타를 고친 줄(korean)과
 * 믿을 만한 일본어 고침(japanese·name, 같은 소리의 다른 한자 등). 되풀이 둘 중 고친 쪽 글을 짝에 쓴다
 * (review.ts reviewedForPairs)
 */
export function ilmuntaLessonPairs(no: number, dir?: string): TranscriptPair[] {
  const item = grammarExampleItem(no);
  const t = loadTranscript("ilmunta", item, dir);
  if (!t) return NONE;
  const review = loadTranscriptReview("ilmunta", item, dir);
  const hit = cache.get(t);
  if (hit && hit.review === review) return hit.pairs;
  const glossary = ilmuntaGlossary(loadIlmuta(dir)?.lessons ?? null);
  // 꼬리 조각(앞 줄과 같은 글의 짧은 구간)은 교정 전 글로 먼저 거른다. 앞 줄만 고치면 글이 달라져
  // 조각이 남고, 되풀이 일본어에 붙어 짝이 깨진다
  const segments = reviewedForPairs(withoutNoise(t.segments), review);
  const pairs = findRepeatPairs(withoutNoise(segments), {
    minSimilarity: PAIR_MIN_SIMILARITY,
    toKana: (text) => kanaOf(text, glossary),
  });
  cache.set(t, { review, pairs });
  return pairs;
}
