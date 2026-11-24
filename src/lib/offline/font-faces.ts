// 강을 받아 둘 때 함께 담을 글꼴 조각 고르기.
// 한중일 글꼴(next/font/google)은 글자 범위(unicode-range)마다 조각 파일이 100개 넘게 있고, 브라우저는
// 화면에 나온 글자의 조각만 받는다. 그래서 받아 둘 때 그 강 화면과 자막에 쓰인 글자를 덮는 조각만 담는다.
// 통째로 담으면 세 벌에 17MB쯤이라 강 하나(20MB 남짓)만큼 커진다.
// CSS는 조각 주소를 `url(../media/…)`처럼 CSS 파일 기준 상대 주소로 적는다.

/** @font-face 하나: 조각 파일 주소와 그 조각이 맡는 글자 범위들(비었으면 모든 글자) */
export interface FontSlice {
  url: string;
  ranges: [number, number][];
}

const FONT_FACE = /@font-face\s*{([^}]*)}/g;
const SRC_URL = /url\(\s*["']?([^"')]+)["']?\s*\)/;
const UNICODE_RANGE = /unicode-range\s*:\s*([^;}]+)/;

/** CSS 글에서 @font-face마다 조각 주소(사이트 경로)와 글자 범위를 뽑는다 */
export function fontFaces(css: string, cssUrl: string): FontSlice[] {
  const out: FontSlice[] = [];
  for (const [, body] of css.matchAll(FONT_FACE)) {
    const src = SRC_URL.exec(body)?.[1];
    if (!src || src.startsWith("data:")) continue;
    const resolved = new URL(src, new URL(cssUrl, "http://site.invalid"));
    if (resolved.origin !== "http://site.invalid") continue;
    const range = UNICODE_RANGE.exec(body)?.[1];
    out.push({
      url: resolved.pathname,
      ranges: range ? parseUnicodeRange(range) : [],
    });
  }
  return out;
}

/** `U+0-FF, U+131, U+4E??` → [[0,255],[305,305],[0x4e00,0x4eff]] */
export function parseUnicodeRange(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const part of text.split(",")) {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!m) continue;
    const [, first, last] = m;
    if (first.includes("?")) {
      out.push([
        Number.parseInt(first.replace(/\?/g, "0"), 16),
        Number.parseInt(first.replace(/\?/g, "F"), 16),
      ]);
    } else {
      const lo = Number.parseInt(first, 16);
      out.push([lo, last ? Number.parseInt(last, 16) : lo]);
    }
  }
  return out;
}

/** 글에 쓰인 글자(코드 포인트) 집합. 공백·제어 문자는 뺀다 */
export function codePointsOf(texts: readonly string[]): Set<number> {
  const out = new Set<number>();
  for (const text of texts)
    for (const ch of text) {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp > 0x20) out.add(cp);
    }
  return out;
}

/** 쓰인 글자를 하나라도 맡는 조각의 주소. 범위가 없는 조각은 늘 담는다. 같은 주소는 한 번만 */
export function fontsFor(
  faces: readonly FontSlice[],
  used: ReadonlySet<number>,
): string[] {
  const sorted = [...used].sort((a, b) => a - b);
  const out = new Set<string>();
  for (const face of faces) {
    if (out.has(face.url)) continue;
    if (
      face.ranges.length === 0 ||
      face.ranges.some(([lo, hi]) => anyBetween(sorted, lo, hi))
    )
      out.add(face.url);
  }
  return [...out];
}

/** 정렬된 목록에 lo~hi 사이 값이 있는지(이분 탐색) */
function anyBetween(sorted: readonly number[], lo: number, hi: number) {
  let a = 0;
  let b = sorted.length;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (sorted[mid] < lo) a = mid + 1;
    else b = mid;
  }
  return a < sorted.length && sorted[a] <= hi;
}
