import { loadIlmuta, loadTranscript } from "@/lib/textbook/load";
import { withoutNoise } from "@/lib/transcript/hallucination";
import { ilmuntaGlossary } from "./card-sources";
import { kanaOf } from "./cards";
import type { Transcript } from "./cues";
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
const cache = new WeakMap<Transcript, TranscriptPair[]>();

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

/** 과의 짝. 자막이 없으면 빈 열(늘 같은 객체라 호출하는 쪽이 캐시 열쇠로 쓸 수 있다) */
export function ilmuntaLessonPairs(no: number, dir?: string): TranscriptPair[] {
  const t = loadTranscript("ilmunta", grammarExampleItem(no), dir);
  if (!t) return NONE;
  const hit = cache.get(t);
  if (hit) return hit;
  const glossary = ilmuntaGlossary(loadIlmuta(dir)?.lessons ?? null);
  const pairs = findRepeatPairs(withoutNoise(t.segments), {
    minSimilarity: PAIR_MIN_SIMILARITY,
    toKana: (text) => kanaOf(text, glossary),
  });
  cache.set(t, pairs);
  return pairs;
}
