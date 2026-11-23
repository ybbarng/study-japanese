import type { RubyPart } from "./furigana";

/**
 * 문장 틀에 읽는 법을 함께 적는 짧은 표기: `[昨日|きのう]、[映画|えいが]を`.
 * 대괄호 밖은 그대로 글이고, 안은 `한자|읽기`다.
 */
const MARK = /\[([^|\]]+)\|([^\]]+)\]/g;

/** 표기를 글 조각으로 나눈다 */
export function parseRuby(src: string): RubyPart[] {
  const out: RubyPart[] = [];
  let at = 0;
  for (const m of src.matchAll(MARK)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ text: src.slice(at, i) });
    out.push({ text: m[1], ruby: m[2] });
    at = i + m[0].length;
  }
  if (at < src.length) out.push({ text: src.slice(at) });
  return out;
}

/** 읽는 법을 뺀 글(화면에 보이는 그대로) */
export function rubyPlain(src: string): string {
  return src.replace(MARK, "$1");
}

/** 한자 자리를 읽기로 바꾼 글 */
export function rubyReading(src: string): string {
  return src.replace(MARK, "$2");
}
