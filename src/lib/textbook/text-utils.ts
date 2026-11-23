/** pdftotext 결과를 다루는 작은 도구들 */

const HANGUL = /[ㄱ-ㆎ가-힣]/;

/**
 * pdftotext 결과를 줄로 나눈다. 쪽이 바뀔 때 붙는 \f는 지우고,
 * 글 사이에 섞인 다른 제어 문자(BEL 등)는 공백으로 바꾼다.
 */
export function pdfLines(text: string): string[] {
  return (
    text
      .replace(/\f/g, "")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: pdftotext 결과에 섞인 제어 문자를 지우려는 것
      .replace(/[\u0000-\u0008\u000B\u000E-\u001F\u007F]/g, " ")
      .split(/\r?\n/)
  );
}

export function hasHangul(text: string): boolean {
  return HANGUL.test(text);
}

/** 쪽 번호만 있는 조각(`003`) */
export function isPageNumber(text: string): boolean {
  return /^\d{3}$/.test(text.trim());
}

export type Segment = { text: string; start: number };

/**
 * 한 줄을 공백이 `minGap`칸 이상 이어진 곳에서 나눈다.
 * `-layout`으로 뽑은 글은 칸(일본어·한국어, 왼쪽·오른쪽 단)이 긴 공백으로 갈린다.
 */
export function splitSegments(line: string, minGap = 2): Segment[] {
  const normalized = line.replace(/\t/g, " ");
  const re = new RegExp(`\\S+(?:\\s{1,${minGap - 1}}\\S+)*`, "g");
  const out: Segment[] = [];
  for (const m of normalized.matchAll(re)) {
    out.push({ text: m[0], start: m.index ?? 0 });
  }
  return out;
}

/** 일본어 글 사이에 낀 한국어 지문(`(저기 걸어가는 사람을 가리키며)`)을 뺀다 */
export function stripKoreanDirections(text: string): string {
  return text.replace(/[(（][^()（）]*[)）]/g, (m) => (hasHangul(m) ? " " : m));
}

/** 일본어 글의 공백을 정리한다: 여러 칸은 한 칸으로, 문장 부호 앞 공백은 지운다 */
export function tidyJa(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+(?=[。、？！?!…」』）)])/g, "")
    .replace(/([「『（(])\s+/g, "$1")
    .trim();
}

export function tidyKo(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
