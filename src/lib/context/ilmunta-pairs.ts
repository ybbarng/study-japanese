import { loadTranscript } from "@/lib/textbook/load";
import { withoutNoise } from "@/lib/transcript/hallucination";
import type { Transcript } from "./cues";
import { findRepeatPairs, type TranscriptPair } from "./transcript-pairs";

// 일문따 과 하나의 문장 짝: 그 과 문법 예문(`05-1`) 자막에서 일본어·뜻 되풀이를 찾는다.
// 짝 파일을 따로 만들지 않고 요청 때 자막으로 만든다(자막이 그대로면 같은 결과를 다시 쓴다).
// 둘째 예문(`-2`)은 되풀이해 읽지 않아 짝이 나오지 않으므로 보지 않는다.

/** 과 번호 → 문법 예문 항목 이름 */
export function grammarExampleItem(no: number): string {
  return `${String(no).padStart(2, "0")}-1`;
}

const NONE: TranscriptPair[] = [];
const cache = new WeakMap<Transcript, TranscriptPair[]>();

/** 과의 짝. 자막이 없으면 빈 열(늘 같은 객체라 호출하는 쪽이 캐시 열쇠로 쓸 수 있다) */
export function ilmuntaLessonPairs(no: number, dir?: string): TranscriptPair[] {
  const t = loadTranscript("ilmunta", grammarExampleItem(no), dir);
  if (!t) return NONE;
  const hit = cache.get(t);
  if (hit) return hit;
  const pairs = findRepeatPairs(withoutNoise(t.segments));
  cache.set(t, pairs);
  return pairs;
}
