import type { ShownToken } from "@/lib/songs/analysis";
import { PUNCT, splitTail } from "./text";

// 어순 맞추기 조각 나누기. 낱말 분석 조각을 낱말 + 뒤에 붙는 조사·조동사·접미사로 묶는다
// (僕 / は / 学生 처럼 너무 잘게 나누면 조사 자리 맞히기가 되고, 문장 통째면 어순을 묻지 못한다).

/** 앞 낱말에 붙여 한 조각으로 두는 품사 */
const ATTACH = new Set(["助詞", "助動詞", "接尾辞"]);
/** 뒤 낱말에 붙이는 품사 */
const PREFIX = new Set(["接頭辞"]);
/** 술어를 시작하는 품사(이 조각부터 끝까지는 자리가 정해져 있다) */
const PREDICATE = new Set(["動詞", "形容詞"]);
/**
 * 이 조사로 끝나는 조각(+ 앞에서 꾸미는 조각)은 술어 앞에서 서로 자리를 바꿔도 말이 된다
 * (学校まで自転車で行く = 自転車で学校まで行く). の는 뒤를 꾸미므로 넣지 않는다
 */
const MOVABLE = new Set([
  "は",
  "が",
  "を",
  "に",
  "で",
  "へ",
  "と",
  "から",
  "まで",
  "も",
]);

const onlyPunct = (s: string) => s.replace(PUNCT, "") === "";

/** 조각 수가 이 범위일 때만 어순 문제로 낸다 */
export const ORDER_MIN = 3;
export const ORDER_MAX = 6;

export interface Chunk {
  text: string;
  /** 후리가나를 달 낱말 조각 */
  tokens: { surface: string; reading?: string }[];
  /** 첫 낱말의 품사 */
  headPos?: string;
  /** 마지막 조사(조사로 끝나면) */
  particle?: string;
}

/**
 * 문장 분석 조각을 어순 조각으로 묶는다. 문장 끝 문장부호는 tail로 뗀다.
 * 다시 이어 붙여 원래 문장이 되지 않으면 null
 */
export function orderChunks(
  ja: string,
  tokens: readonly ShownToken[],
): { chunks: Chunk[]; tail: string } | null {
  const { body, tail } = splitTail(ja);
  const chunks: Chunk[] = [];
  let cur: Chunk | null = null;
  let prefix: Chunk["tokens"] = [];
  let consumed = 0;
  for (const t of tokens) {
    let s = t.surface;
    if (consumed + s.length > body.length)
      s = s.slice(0, body.length - consumed);
    consumed += t.surface.length;
    if (!s) break;
    const tok = { surface: s, reading: t.reading };
    if (onlyPunct(s)) {
      if (cur) {
        cur.text += s;
        cur.tokens.push(tok);
      }
      continue;
    }
    if (t.pos && ATTACH.has(t.pos) && cur) {
      cur.text += s;
      cur.tokens.push(tok);
      cur.particle = t.pos === "助詞" ? s : undefined;
      continue;
    }
    if (t.pos && PREFIX.has(t.pos)) {
      prefix.push(tok);
      continue;
    }
    if (cur) chunks.push(cur);
    cur = {
      text: prefix.map((p) => p.surface).join("") + s,
      tokens: [...prefix, tok],
      headPos: t.pos,
    };
    prefix = [];
  }
  if (cur) chunks.push(cur);
  if (chunks.map((c) => c.text).join("") !== body) return null;
  return { chunks, tail };
}

/** 어순 문제로 낼 만한지: 조각 수가 알맞고 같은 조각이 둘 없다 */
export function orderable(chunks: readonly { text: string }[]): boolean {
  return (
    chunks.length >= ORDER_MIN &&
    chunks.length <= ORDER_MAX &&
    new Set(chunks.map((c) => c.text)).size === chunks.length
  );
}

/**
 * 맞는 차례로 받아 줄 꼴: 술어 앞 마디(꾸미는 조각 + 조사로 끝나는 조각)들은 차례를 바꿔도 되고,
 * 술어(동사·형용사 조각부터 끝, 없으면 마지막 마디 뒤)는 끝에 그대로 둔다.
 */
export function orderShape(chunks: readonly Chunk[]): {
  phrases: string[][];
  fixed: string[];
} {
  const verbAt = chunks.findIndex((c) => c.headPos && PREDICATE.has(c.headPos));
  let end = verbAt >= 0 ? verbAt : chunks.length;
  // 술어가 없으면(명사 술어) 마지막 마디 뒤를 술어로 본다
  if (verbAt < 0) {
    let last = -1;
    chunks.forEach((c, i) => {
      if (c.particle && MOVABLE.has(c.particle)) last = i;
    });
    end = last + 1;
  }
  const phrases: string[][] = [];
  let cur: string[] = [];
  chunks.slice(0, end).forEach((c) => {
    cur.push(c.text);
    if (c.particle && MOVABLE.has(c.particle)) {
      phrases.push(cur);
      cur = [];
    }
  });
  const fixed = [...cur, ...chunks.slice(end).map((c) => c.text)];
  return { phrases, fixed };
}

/** 놓은 차례가 받아 줄 꼴인지(술어 앞 마디는 어느 차례든, 술어는 끝에 그대로) */
export function orderAccepted(
  placed: readonly string[],
  shape: { phrases: readonly (readonly string[])[]; fixed: readonly string[] },
): boolean {
  const n = placed.length - shape.fixed.length;
  if (n < 0) return false;
  if (shape.fixed.some((f, i) => placed[n + i] !== f)) return false;
  const head = placed.slice(0, n);
  const used = new Set<number>();
  const match = (at: number): boolean => {
    if (at === head.length) return used.size === shape.phrases.length;
    return shape.phrases.some((p, i) => {
      if (used.has(i) || p.some((x, k) => head[at + k] !== x)) return false;
      used.add(i);
      if (match(at + p.length)) return true;
      used.delete(i);
      return false;
    });
  };
  return match(0);
}
