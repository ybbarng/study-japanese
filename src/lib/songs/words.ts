import { hasKanji, type RubySegment, splitOkurigana } from "@/lib/ilmuta/ruby";
import type { ShownToken } from "./analysis";

// 화면 조각(분석 파일의 위치대로 가사 줄을 자른 것, src/lib/songs/analysis.ts)을 누를 낱말로 바꾸고,
// 낱말 설명에 쓸 것을 만든다.

export interface SongWord extends ShownToken {
  /** 사전에서 찾을 꼴: 기본형이 없으면 겉모양 */
  base: string;
}

export function toWords(tokens: readonly ShownToken[]): SongWord[] {
  return tokens.map((t) => ({ ...t, base: t.base ?? t.surface }));
}

/** 낱말의 후리가나 조각들(한자가 없거나 읽는 법을 모르면 글 그대로) */
export function wordRuby(w: Pick<SongWord, "surface" | "reading">) {
  if (w.reading && hasKanji(w.surface))
    return splitOkurigana(w.surface, w.reading);
  return [{ text: w.surface }] as RubySegment[];
}

/** 낱말 전체의 읽는 법(히라가나). 읽는 법이 없으면 글 그대로 */
export function wordReading(w: Pick<SongWord, "surface" | "reading">): string {
  return w.reading ?? w.surface;
}

const MARKS_ONLY = /^[\p{P}\p{S}\s]+$/u;

/** 누를 만한 낱말인지(분석이 없는 글, 문장 부호·기호·공백은 누르지 않는다) */
export function isPressable(
  w: Pick<SongWord, "surface" | "pos" | "plain">,
): boolean {
  return !w.plain && w.pos !== "記号" && !MARKS_ONLY.test(w.surface);
}

const POS_KO: Record<string, string> = {
  名詞: "명사",
  動詞: "동사",
  形容詞: "형용사",
  形容動詞: "な형용사",
  副詞: "부사",
  助詞: "조사",
  助動詞: "조동사",
  連体詞: "연체사",
  接続詞: "접속사",
  感動詞: "감탄사",
  接頭詞: "접두사",
  接尾辞: "접미사",
  代名詞: "대명사",
  フィラー: "군말",
  記号: "기호",
};

/** 품사를 한국어로. 모르는 품사는 원래 표기 그대로 */
export function posLabel(pos: string | undefined): string {
  if (!pos) return "";
  return POS_KO[pos] ?? pos;
}

/** 네이버 일본어사전 검색 주소 */
export function naverDictUrl(query: string): string {
  return `https://ja.dict.naver.com/#/search?query=${encodeURIComponent(query)}`;
}
