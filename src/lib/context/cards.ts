import { z } from "zod";
import {
  type Glossary,
  hasKanji,
  type RubySegment,
  rubySegments,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";
import type { Sentence } from "@/lib/textbook/schema";
import { emojiOf } from "./emoji";
import {
  type MatchCandidate,
  matchSegment,
  normalizeJa,
  splitSentences,
} from "./match";

// 자막의 일본어 구간마다 붙일 "맥락 카드": 맞춘 소책자 문장(정확한 글·읽는 법·뜻)과 구간 속 낱말.
// 서버가 자막을 내줄 때 만들어 붙인다(화면은 소책자 전체를 받지 않아도 된다).

const rubySegmentSchema = z.object({
  text: z.string(),
  reading: z.string().optional(),
});

export const cueSentenceSchema = z.object({
  ja: z.string(),
  ko: z.string(),
  /** 한자 위에 달 읽는 법까지 나눈 글 */
  ruby: z.array(rubySegmentSchema),
});
export type CueSentence = z.infer<typeof cueSentenceSchema>;

export const cueWordSchema = z.object({
  ja: z.string(),
  reading: z.string().optional(),
  ko: z.string(),
  /** 구체적인 낱말이면 그림 문자 하나(emoji.ts) */
  emoji: z.string().optional(),
});
export type CueWord = z.infer<typeof cueWordSchema>;

/** 카드 문장이 어디서 왔나: 소책자의 정확한 글(booklet), 자막에서 받아 적은 글(transcript) */
export const cueOriginSchema = z.enum(["booklet", "transcript"]);
export type CueOrigin = z.infer<typeof cueOriginSchema>;

export const cueCardSchema = z.object({
  /** 문장 출처. 없으면 소책자(booklet) */
  origin: cueOriginSchema.optional(),
  /** 맞춘 소책자 문장(조각 차례대로) */
  sentences: z.array(cueSentenceSchema),
  /** 구간의 모든 조각을 맞췄으면 true. 이때 화면은 자막 글 대신 소책자 글을 보인다 */
  whole: z.boolean(),
  /** 구간 속에서 찾은 아는 낱말(읽는 법·뜻) */
  words: z.array(cueWordSchema),
});
export type CueCard = z.infer<typeof cueCardSchema>;

/** 카드를 만들 재료 */
export interface CardSource {
  /** 맞출 문장(소책자 문장, 또는 자막에서 받아 적은 짝) */
  sentences: Sentence[];
  /** 문장 출처. 없으면 소책자 */
  origin?: CueOrigin;
  /** 한자 낱말 → 읽는 법(문장에 후리가나를 단다) */
  glossary: Glossary;
  /** 낱말 카드로 띄울 낱말 */
  words: CueWord[];
}

/** 한 구간에 보일 낱말은 이만큼까지 */
const MAX_WORDS = 6;

function rubyOf(s: Sentence, glossary: Glossary): RubySegment[] {
  if (s.reading && s.reading !== s.ja && hasKanji(s.ja))
    return splitOkurigana(s.ja, s.reading);
  return rubySegments(s.ja, glossary);
}

/** 한자 낱말을 읽는 법으로 푼 글(비교용) */
export function kanaOf(text: string, glossary: Glossary): string {
  return rubySegments(text, glossary)
    .map((s) => s.reading ?? s.text)
    .join("");
}

/** 같은 글의 문장은 하나만 남긴다(회화 Basic·Advanced에 같은 문장이 두 번 나온다) */
function uniqueSentences(sentences: Sentence[]): Sentence[] {
  const seen = new Set<string>();
  return sentences.filter((s) => {
    const key = normalizeJa(s.ja);
    if (key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 소책자 항목 안 문장 조각을 따로 비교할 때 조각의 최소 길이(짧은 맞장구는 여러 항목에 걸린다) */
const MIN_PART_LENGTH = 6;

/**
 * 소책자 항목 하나의 비교용 글들: 통째(한자 표기·가나 표기), 그리고 한 항목에 문장이 여럿이면
 * 충분히 긴 문장 조각마다. 강의는 항목 속 한 문장만 읽기도 한다.
 */
export function candidateForms(
  s: Sentence,
  toKana: (text: string) => string,
): string[] {
  const forms = [normalizeJa(s.ja), normalizeJa(s.reading ?? toKana(s.ja))];
  const parts = splitSentences(s.ja);
  if (parts.length > 1)
    for (const p of parts) {
      const plain = normalizeJa(p);
      if ([...plain].length < MIN_PART_LENGTH) continue;
      forms.push(plain, normalizeJa(toKana(p)));
    }
  return [...new Set(forms.filter((f) => f !== ""))];
}

/** 낱말 카드에 띄울 만한 낱말: 한자가 있거나 가나 세 글자 이상(짧은 가나는 문장 속에서 잘못 걸린다) */
function wordWorthShowing(w: CueWord): boolean {
  return hasKanji(w.ja) || [...w.ja].length >= 3;
}

/** 글 속에서 앞에서부터 가장 긴 낱말을 찾는다(겹치는 짧은 낱말은 건너뛴다) */
export function findWords(text: string, words: CueWord[]): CueWord[] {
  const byFirst = new Map<string, CueWord[]>();
  for (const w of words) {
    if (!wordWorthShowing(w)) continue;
    const list = byFirst.get(w.ja[0]) ?? [];
    list.push(w);
    byFirst.set(w.ja[0], list);
  }
  for (const list of byFirst.values())
    list.sort((a, b) => b.ja.length - a.ja.length);
  const out: CueWord[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < text.length && out.length < MAX_WORDS) {
    const hit = byFirst.get(text[i])?.find((w) => text.startsWith(w.ja, i));
    if (hit) {
      if (!seen.has(hit.ja)) out.push(hit);
      seen.add(hit.ja);
      i += hit.ja.length;
    } else i++;
  }
  return out;
}

/** 그림 문자가 있는 낱말이면 붙인다 */
function withEmoji(w: CueWord): CueWord {
  const emoji = emojiOf(w.ja);
  return emoji ? { ...w, emoji } : w;
}

/**
 * 자막 구간마다 카드를 만든다. 열쇠는 원래 segments의 차례(문자열).
 * 일본어 구간만 보고, 맞춘 문장도 낱말도 없으면 카드를 두지 않는다(화면은 자막만 보인다).
 */
export function buildCards(
  segments: { text: string; lang: "ko" | "ja" }[],
  source: CardSource,
): Record<string, CueCard> {
  const sentences = uniqueSentences(source.sentences);
  const toKana = (t: string) => kanaOf(t, source.glossary);
  const candidates: MatchCandidate[] = sentences.map((s) => ({
    forms: candidateForms(s, toKana),
  }));
  const out: Record<string, CueCard> = {};
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja" || seg.text.trim() === "") return;
    const pieces = matchSegment(seg.text, candidates, toKana);
    const matched: Sentence[] = [];
    for (const p of pieces) {
      const s = p.index >= 0 ? sentences[p.index] : null;
      if (s && !matched.includes(s)) matched.push(s);
    }
    const whole = pieces.length > 0 && pieces.every((p) => p.index >= 0);
    // 낱말은 정확한 소책자 글에서 찾는다(맞추지 못한 조각은 자막 글에서)
    const wordText = [
      ...matched.map((s) => s.ja),
      ...pieces.filter((p) => p.index < 0).map((p) => p.piece),
      ...(pieces.length === 0 ? [seg.text] : []),
    ].join("　");
    // 문장이 곧 그 낱말이면(단어 코너) 낱말 칸에 다시 두지 않는다
    const own = new Set(matched.map((s) => s.ja));
    const words = findWords(wordText, source.words)
      .filter((w) => !own.has(w.ja))
      .map(withEmoji);
    if (matched.length === 0 && words.length === 0) return;
    out[String(i)] = {
      // 받아 적은 글로 만든 문장이면 화면이 "교재와 다를 수 있음"을 보이도록 표시한다
      ...(source.origin === "transcript" && matched.length > 0
        ? { origin: "transcript" as const }
        : {}),
      sentences: matched.map((s) => ({
        ja: s.ja,
        ko: s.ko,
        ruby: rubyOf(s, source.glossary),
      })),
      whole,
      words,
    };
  });
  return out;
}
