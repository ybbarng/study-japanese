import type { CueCard, CueWord } from "./card-schema";
import type { KoreanVocab } from "./korean-vocab";
import { similarity } from "./match";
import { reconcileMeaning } from "./meaning";

// 강의에서 카드 뜻과 바로 옆 강사 한국어 줄이 같은 뜻을 따로 받아 적은 글일 때, 낱말 하나만 다르면 맞춘다.
// 한 화면에서 카드는 「닫게」, 강사 줄은 「닦게」처럼 서로 다른 말을 보이지 않게 한다(meaning.ts reconcileMeaning).
// 화면을 모르는 순수 함수다.

type Segment = { start: number; end: number; text: string; lang: "ko" | "ja" };

/** 같은 뜻을 받아 적은 두 글로 볼 닮은 정도(한글만 견준다) */
const SAME_MEANING = 0.6;
/** 카드 앞뒤로 볼 한국어 줄 수 */
const BEFORE = 2;
const AFTER = 3;

const hangulOf = (t: string) =>
  t.replace(/\([^)]*\)/gu, "").replace(/[^가-힣0-9]/gu, "");

/** i번 일본어 줄 앞뒤로 이어진 한국어 줄 차례(일본어 줄을 만나면 멈춘다) */
function neighborLines(segments: Segment[], i: number): number[] {
  const out: number[] = [];
  for (let j = i + 1; j <= i + AFTER && segments[j]?.lang === "ko"; j++)
    out.push(j);
  for (let j = i - 1; j >= i - BEFORE && segments[j]?.lang === "ko"; j--)
    out.push(j);
  return out;
}

/**
 * 카드 뜻과 옆 강사 줄을 맞춘 카드들. 소책자 글·교정 파일 카드는 뜻을 믿고 강사 줄만 맞춘다.
 * wordsOf는 일본어 글 속 낱말(뜻을 증거로 쓴다). 바꾼 강사 줄은 한국어 줄 카드의 text로 보인다.
 */
export function harmonizeMeanings(
  segments: Segment[],
  cards: Record<string, CueCard>,
  wordsOf: (ja: string) => CueWord[],
  vocab?: KoreanVocab,
): Record<string, CueCard> {
  const out = { ...cards };
  segments.forEach((seg, i) => {
    const card = out[String(i)];
    if (seg.lang !== "ja" || !card?.sentences.some((s) => s.ko)) return;
    const trusted = card.origin !== "transcript" || card.reviewed === true;
    let changed = false;
    const sentences = card.sentences.map((s) => {
      if (!s.ko) return s;
      let ko = s.ko;
      for (const j of neighborLines(segments, i)) {
        const lineCard = out[String(j)];
        const line = lineCard?.text ?? segments[j].text;
        const a = hangulOf(ko);
        const b = hangulOf(line);
        if (a === b || similarity(a, b) < SAME_MEANING) continue;
        const fixed = reconcileMeaning(
          ko,
          line,
          { ja: s.ja, words: wordsOf(s.ja), vocab },
          trusted,
        );
        if (fixed.line !== line)
          out[String(j)] = lineCard
            ? { ...lineCard, text: fixed.line }
            : { sentences: [], whole: false, words: [], text: fixed.line };
        if (fixed.card !== ko) {
          ko = fixed.card;
          changed = true;
        }
      }
      return ko === s.ko ? s : { ...s, ko };
    });
    if (changed) out[String(i)] = { ...card, sentences };
  });
  return out;
}
