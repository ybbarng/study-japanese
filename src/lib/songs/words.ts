import { hasKanji, type RubySegment, splitOkurigana } from "@/lib/ilmuta/ruby";
import type { SongToken } from "./schema";

// 분석기가 잘게 나눈 조각을 사람이 "낱말 하나"로 누를 단위로 묶고, 낱말 설명에 쓸 것을 만든다.
// 예: 降っ·て·い·た → 降っていた 한 덩어리(기본형 降る, 동사).

export interface SongWord {
  /** 화면에 보이는 글(조각을 이은 것) */
  surface: string;
  /** 사전에서 찾을 꼴: 첫 조각의 기본형 */
  base: string;
  /** 첫 조각의 품사(분석기 표기) */
  pos?: string;
  tokens: SongToken[];
}

/** 동사·형용사 뒤에 붙어 한 덩어리로 읽는 조각인지 */
function attachesToPredicate(t: SongToken): boolean {
  if (t.pos === "助動詞") return true;
  if (t.pos === "助詞" && t.posDetail === "接続助詞")
    return ["て", "で", "ちゃ", "じゃ"].includes(t.surface);
  if (t.pos === "動詞")
    return t.posDetail === "非自立" || t.posDetail === "接尾";
  if (t.pos === "形容詞")
    return t.posDetail === "非自立" || t.posDetail === "接尾";
  return false;
}

/** 명사 뒤에 붙는 접미어(〜さん, 〜たち) */
function attachesToNoun(t: SongToken): boolean {
  return t.pos === "名詞" && t.posDetail === "接尾";
}

const PREDICATE = new Set(["動詞", "形容詞", "助動詞"]);

/** 조각들을 누를 낱말로 묶는다 */
export function groupTokens(tokens: readonly SongToken[]): SongWord[] {
  const words: SongWord[] = [];
  for (const t of tokens) {
    const last = words[words.length - 1];
    // 낱말의 첫 조각(머리) 품사로 본다: 降っ·て 뒤의 い도 동사 덩어리에 붙도록
    const joins =
      last !== undefined &&
      ((PREDICATE.has(last.pos ?? "") && attachesToPredicate(t)) ||
        (last.pos === "名詞" && attachesToNoun(t)));
    if (joins) {
      last.surface += t.surface;
      last.tokens.push(t);
    } else {
      words.push({
        surface: t.surface,
        base: t.base ?? t.surface,
        pos: t.pos,
        tokens: [t],
      });
    }
  }
  return words;
}

/** 조각 하나의 후리가나 조각들(한자가 없거나 읽는 법을 모르면 글 그대로) */
export function tokenRuby(t: SongToken): RubySegment[] {
  if (t.reading && hasKanji(t.surface))
    return splitOkurigana(t.surface, t.reading);
  return [{ text: t.surface }];
}

/** 낱말 전체의 읽는 법(히라가나). 조각에 읽는 법이 없으면 글 그대로 */
export function wordReading(w: SongWord): string {
  return w.tokens.map((t) => t.reading ?? t.surface).join("");
}

/** 누를 만한 낱말인지(문장 부호·공백은 누르지 않는다) */
export function isPressable(w: SongWord): boolean {
  return w.pos !== "記号" && w.surface.trim() !== "";
}

const POS_KO: Record<string, string> = {
  名詞: "명사",
  動詞: "동사",
  形容詞: "형용사",
  副詞: "부사",
  助詞: "조사",
  助動詞: "조동사",
  連体詞: "연체사",
  接続詞: "접속사",
  感動詞: "감탄사",
  接頭詞: "접두사",
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
