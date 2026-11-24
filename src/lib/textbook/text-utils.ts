/** pdftotext 결과를 다루는 작은 도구들 */
import { hangulizeKanaNames } from "./kana-hangul";

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

/**
 * 공백 없이(또는 한 칸만 두고) 붙어 나온 일본어 문장과 한국어 해석을 가른다.
 * `…。해석.`, `～(な 삭제)です。 ~합니다.`처럼 일본어 문장 부호 바로 뒤에 한국어가 오는 곳에서 나눈다.
 * 앞쪽은 문형 표시(`(な 삭제)`, `う단`)처럼 한글이 섞여 있어도 일본어 칸이다. 나눌 곳이 없으면 null.
 */
export function splitJaKoRun(text: string): { ja: string; ko: string } | null {
  const m = text.match(/^(.+?[。？！])\s*([~～(（]?[가-힣].*)$/);
  if (!m || !/[ぁ-ゖァ-ヺ一-龯]/.test(m[1])) return null;
  return { ja: m[1], ko: m[2] };
}

/**
 * 칸이 한국어 해석인지. 일본어 문형 속 한글 표시(`(な 삭제)`, `(이)`, `う단`, `た형`)는 빼고 본다.
 * 그 표시 말고도 한글이 있어야 한국어 칸이다.
 */
export function isKoreanCell(text: string): boolean {
  const withoutMarks = text
    .replace(/[(（][^()（）]*[)）]/g, "")
    .replace(/[ぁ-ん](단|형)/g, "");
  if (hasHangul(withoutMarks)) return true;
  // 한글이 표시 안에만 있고 가나·한자가 없으면(`(가나다)`) 한국어로 둔다
  return hasHangul(text) && !/[ぁ-ゖァ-ヺ一-龯～]/.test(text);
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

/** 한국어 글의 공백을 정리하고, 해석 속 가나 이름·지명을 한글로 적는다(kana-hangul.ts) */
export function tidyKo(text: string): string {
  return hangulizeKanaNames(text.replace(/\s+/g, " ").trim());
}
