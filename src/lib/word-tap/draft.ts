import { z } from "zod";
import type { AnalysisToken, GrammarNote } from "@/lib/songs/analysis";

// 분석 초안 → 분석 파일. 초안은 낱말을 겉모양(surface)으로 적는다(세션이 손으로 쓰거나, 형태소 분석기가 낸 것).
// 겉모양을 문장 앞에서부터 차례로 찾아 글자 위치(코드포인트)로 바꾸고, 겉모양은 버린다.
// 초안에는 교재 글이 들어 있으므로 git 밖(임시 폴더)에만 둔다.

/** [겉모양, 품사, 뜻, 읽는 법?, 기본형?] */
const draftTokenSchema = z.union([
  z.tuple([z.string().min(1), z.string(), z.string()]),
  z.tuple([z.string().min(1), z.string(), z.string(), z.string()]),
  z.tuple([z.string().min(1), z.string(), z.string(), z.string(), z.string()]),
]);

/** [문형, 설명, 배우는 일무따 강?] */
const draftGrammarSchema = z.union([
  z.tuple([z.string(), z.string()]),
  z.tuple([z.string(), z.string(), z.number().int()]),
]);

/** 문장 글 → 낱말·문법 초안 */
export const draftSchema = z.record(
  z.string(),
  z.strictObject({
    t: z.array(draftTokenSchema),
    g: z.array(draftGrammarSchema).optional(),
  }),
);
export type Draft = z.infer<typeof draftSchema>;
type DraftToken = z.infer<typeof draftTokenSchema>;

/**
 * 낱말 겉모양을 문장에서 차례로 찾아 위치를 붙인다. 못 찾은 겉모양이 있으면 그것을 돌려준다.
 * 빈 칸(読み·기본형)은 적지 않는다.
 */
export function placeTokens(
  ja: string,
  tokens: readonly DraftToken[],
): { tokens: AnalysisToken[] } | { notFound: string } {
  const chars = Array.from(ja);
  const out: AnalysisToken[] = [];
  let pos = 0;
  for (const [surface, pos_, gloss, reading, base] of tokens) {
    const want = Array.from(surface);
    let at = -1;
    for (let i = pos; i + want.length <= chars.length; i++)
      if (want.every((c, k) => chars[i + k] === c)) {
        at = i;
        break;
      }
    if (at < 0) return { notFound: surface };
    const token: AnalysisToken = { start: at, length: want.length };
    if (reading) token.reading = reading;
    if (base && base !== surface) token.base = base;
    if (pos_) token.pos = pos_;
    if (gloss) token.gloss = gloss;
    out.push(token);
    pos = at + want.length;
  }
  return { tokens: out };
}

export function draftGrammar(
  g: readonly z.infer<typeof draftGrammarSchema>[] | undefined,
): GrammarNote[] | undefined {
  if (!g || g.length === 0) return undefined;
  return g.map(([pattern, explain, lesson]) =>
    lesson === undefined
      ? { pattern, explain }
      : { pattern, explain, ref: { book: "ilmuta", lesson } },
  );
}
