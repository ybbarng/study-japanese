import type { Sentence } from "@/lib/textbook/schema";
import { plainForm } from "./review";

// 교정 파일로 고친 글(review.ts)이 그 강 소책자 문장과 글자가 같은지 본다. 화면을 모르는 순수 함수다.
// 고친 글을 소책자 문장(한 사람의 말 한 항목)들로 앞에서부터 덮을 수 있으면 그 갈래를 돌려준다.
// - 항목 통째(whole)이거나, 항목 안 부호 사이 조각을 이어 붙인 것(한 사람 말의 앞·뒤 반)만 본다.
// - 부호·빈칸은 빼고 견준다(plainForm, 가나 종류는 같아야 한다).
// - 여러 갈래로 덮이면 묶음 수가 적은 것, 같으면 통째 항목이 많은 것을 고른다.
// 두 사람의 말을 한 구간에 받아 적은 줄은 항목 경계에서 묶음이 나뉘어, 카드가 사람마다 줄을 바꿔 보인다.

/** 고친 글의 한 묶음: 글 속 자리와, 같은 글자를 가진 소책자 항목 */
export interface BookGroup {
  /** 고친 글 속 자리(문자열 차례, end는 포함하지 않음). 부호는 앞 묶음 끝에 붙는다 */
  start: number;
  end: number;
  sentence: Sentence;
  /** 항목 통째와 같다(아니면 항목 속 조각) */
  whole: boolean;
}

/** 소책자 항목을 부호 사이 조각으로 나눈 비교용 글 */
function chunksOf(ja: string): string[] {
  return ja
    .split(/[\s\p{P}\p{S}]+/u)
    .map(plainForm)
    .filter((c) => c !== "");
}

/** 글의 비교용 글자와, 그 글자마다 원래 글 속 자리 */
function plainWithIndex(text: string): { plain: string; at: number[] } {
  let plain = "";
  const at: number[] = [];
  let i = 0;
  for (const ch of text) {
    const p = plainForm(ch);
    for (let k = 0; k < p.length; k++) at.push(i);
    plain += p;
    i += ch.length;
  }
  return { plain, at };
}

type Step = { len: number; sentence: Sentence; whole: boolean };
type Best = { groups: number; partial: number; steps: Step[] } | null;

/**
 * 고친 글을 소책자 항목(통째·조각)들로 덮는 갈래. 덮지 못하면 null.
 * sentences는 그 강의 소책자 문장(같은 글은 미리 하나로 줄여 둔다)
 */
export function bookGroups(
  text: string,
  sentences: readonly Sentence[],
): BookGroup[] | null {
  const { plain, at } = plainWithIndex(text);
  if (plain === "") return null;
  const items = sentences
    .map((sentence) => ({ sentence, chunks: chunksOf(sentence.ja) }))
    .filter((x) => x.chunks.length > 0);
  const memo = new Map<number, Best>();
  const walk = (pos: number): Best => {
    if (pos === plain.length) return { groups: 0, partial: 0, steps: [] };
    const hit = memo.get(pos);
    if (hit !== undefined) return hit;
    let best: Best = null;
    for (const { sentence, chunks } of items)
      for (let a = 0; a < chunks.length; a++) {
        let joined = "";
        for (let b = a; b < chunks.length; b++) {
          joined += chunks[b];
          if (!plain.startsWith(joined, pos)) break;
          const rest = walk(pos + joined.length);
          if (!rest) continue;
          const whole = a === 0 && b === chunks.length - 1;
          const groups = rest.groups + 1;
          const partial = rest.partial + (whole ? 0 : 1);
          if (
            !best ||
            groups < best.groups ||
            (groups === best.groups && partial < best.partial)
          )
            best = {
              groups,
              partial,
              steps: [{ len: joined.length, sentence, whole }, ...rest.steps],
            };
        }
      }
    memo.set(pos, best);
    return best;
  };
  const found = walk(0);
  if (!found) return null;
  const out: BookGroup[] = [];
  let pos = 0;
  found.steps.forEach((s, i) => {
    const start = i === 0 ? 0 : at[pos];
    pos += s.len;
    const end = pos < plain.length ? at[pos] : text.length;
    out.push({ start, end, sentence: s.sentence, whole: s.whole });
  });
  return out;
}
