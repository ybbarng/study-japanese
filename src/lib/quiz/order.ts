import type { ShownToken } from "@/lib/songs/analysis";
import { PUNCT, splitTail } from "./text";

// 어순 맞추기 조각 나누기. 낱말 분석 조각을 낱말 + 뒤에 붙는 조사·조동사·접미사로 묶는다
// (僕 / は / 学生 처럼 너무 잘게 나누면 조사 자리 맞히기가 되고, 문장 통째면 어순을 묻지 못한다).

/** 앞 낱말에 붙여 한 조각으로 두는 품사 */
const ATTACH = new Set(["助詞", "助動詞", "接尾辞"]);
/** 뒤 낱말에 붙이는 품사 */
const PREFIX = new Set(["接頭辞"]);

const onlyPunct = (s: string) => s.replace(PUNCT, "") === "";

/** 조각 수가 이 범위일 때만 어순 문제로 낸다 */
export const ORDER_MIN = 3;
export const ORDER_MAX = 6;

/**
 * 문장 분석 조각을 어순 조각으로 묶는다. 문장 끝 문장부호는 tail로 뗀다.
 * 다시 이어 붙여 원래 문장이 되지 않으면 null
 */
export function orderChunks(
  ja: string,
  tokens: readonly ShownToken[],
): { chunks: string[]; tail: string } | null {
  const { body, tail } = splitTail(ja);
  const chunks: string[] = [];
  let cur = "";
  let prefix = "";
  let consumed = "";
  for (const t of tokens) {
    const s = t.surface;
    consumed += s;
    if (consumed.length > body.length) {
      // 끝 문장부호까지 덮은 조각: 몸통 부분만 쓴다
      const over = consumed.length - body.length;
      const keep = s.slice(0, s.length - over);
      if (keep) cur += keep;
      break;
    }
    if (onlyPunct(s)) {
      if (cur) cur += s;
      continue;
    }
    if (t.pos && ATTACH.has(t.pos) && cur) {
      cur += s;
      continue;
    }
    if (t.pos && PREFIX.has(t.pos)) {
      prefix += s;
      continue;
    }
    if (cur) chunks.push(cur);
    cur = prefix + s;
    prefix = "";
  }
  if (cur) chunks.push(cur);
  if (chunks.join("") !== body) return null;
  return { chunks, tail };
}

/** 어순 문제로 낼 만한지: 조각 수가 알맞고 같은 조각이 둘 없다 */
export function orderable(chunks: readonly string[]): boolean {
  return (
    chunks.length >= ORDER_MIN &&
    chunks.length <= ORDER_MAX &&
    new Set(chunks).size === chunks.length
  );
}
