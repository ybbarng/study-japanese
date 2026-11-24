import type { ShownToken } from "@/lib/songs/analysis";
import { isPressable } from "@/lib/songs/words";
import { charInfos, isTappableChar } from "./kana-info";
import type { WordTapSentence } from "./types";

// 문장을 누를 조각으로 나눈다. 낱말 분석이 있으면 낱말로, 없으면(글자 도움을 펼친 초반 강에서만) 글자 하나씩.

export interface TapToken extends ShownToken {
  /** 낱말 분석 없이 글자 하나로 나눈 조각(뜻·품사가 없다) */
  charOnly?: true;
}

/**
 * @param charTap 분석이 없을 때 글자 하나씩 누르게 할지(초반 강)
 * @returns 누를 조각이 없으면 null(화면은 원래 글을 그대로 보인다)
 */
export function tapTokens(
  ja: string,
  analysis: WordTapSentence | undefined,
  charTap: boolean,
): TapToken[] | null {
  if (analysis?.tokens.some(isTapToken)) return analysis.tokens;
  if (!charTap) return null;
  const chars = charInfos(ja);
  if (!chars.some(isTappableChar)) return null;
  return chars.map((c) =>
    isTappableChar(c)
      ? { surface: c.text, charOnly: true }
      : { surface: c.text, plain: true },
  );
}

/** 눌러 볼 조각인지(분석이 없는 글·문장 부호는 누르지 않는다) */
export function isTapToken(t: TapToken): boolean {
  return isPressable({ ...t, plain: t.plain });
}

/** 소리를 글자 하나씩 볼 가나 꼴: 한자 낱말은 읽는 법, 아니면 겉모양 */
export function kanaForm(t: Pick<TapToken, "surface" | "reading">): string {
  return t.reading ?? t.surface;
}

/** i번째 조각에서 dir 쪽으로 가장 가까운 누를 조각. 없으면 null */
export function neighborToken(
  tokens: readonly TapToken[],
  i: number,
  dir: -1 | 1,
): number | null {
  for (let k = i + dir; k >= 0 && k < tokens.length; k += dir)
    if (isTapToken(tokens[k])) return k;
  return null;
}
