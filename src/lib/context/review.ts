import { z } from "zod";
import type { CueCard } from "./card-schema";
import { normalizeJa } from "./match";

// Claude가 고친 자막 줄(교정 파일, content/transcripts-review/<book>/<item>.json)을 자막에 반영한다.
// 꼴과 판정 규칙은 docs/transcript-review.md에 있다. 파일을 읽지 않는 순수 함수다.
// ① prepareReview: 지문(시각·원래 글)이 맞는 줄만 골라, 한국어를 가나로 적은 줄은 한국어 줄로 돌리거나 숨기고,
//    헛것은 빼고, 일본어 부분 시각이 있으면 둘로 나눈다. 일본어 줄은 올릴 후보로 남긴다.
// ② promotable: 후보 가운데 믿을 만한 줄만 정상 카드로 올린다(나머지는 흐린 받아쓰기 그대로).
// ③ promoteSegments: 올린 줄의 글·카드를 자막에 넣는다(거르기 단계에서 빠졌으면 다시 넣는다).

const confidenceSchema = z.enum(["high", "mid", "low"]);
const kindSchema = z.enum(["japanese", "korean-noise", "name", "other"]);

/** whisper로 소리를 다시 들은 결과. 쓰는 닮음 점수만 확인한다(나머지 필드는 받아 두기만) */
const reviewAudioSchema = z.object({
  /** prompt 없이 다시 받아 적은 글이 corrected와 닮은 정도(0~1) */
  simPlain: z.number().nullish(),
  /** 원래 받아 적은 글이 corrected와 닮은 정도(0~1) */
  simOriginal: z.number().nullish(),
  /** 소리는 같고 표기만 고쳤는지(한자로 적은 것을 교재처럼 가타카나로 바꾸는 등) */
  spellingOnly: z.boolean().nullish(),
});

/** 교정한 줄 하나. 모르는 필드(why·listenNote·index 등)는 허용하되 검증하지 않는다 */
export const reviewLineSchema = z.object({
  /** 지문: 원래 자막 구간의 시각과 글. 셋이 다 맞을 때만 쓴다 */
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  original: z.string(),
  /** 고친 글. korean-noise면 한국어 글(비면 숨긴다) */
  corrected: z.string().nullish(),
  /** corrected의 읽는 법(히라가나). 한자 위 읽는 법을 단다 */
  reading: z.string().nullish(),
  /** corrected의 뜻 */
  ko: z.string().nullish(),
  confidence: confidenceSchema,
  kind: kindSchema,
  /** whisper로 소리를 다시 들어 corrected가 맞다고 확인했는지 */
  audioVerified: z.boolean().nullish(),
  audio: reviewAudioSchema.nullish(),
  /**
   * 일본어 + 한국어 뒷말이 섞인 줄: 일본어 부분이 끝나는 시각(초, 파일 처음부터). start < splitAt < end.
   * corrected는 일본어 부분만 적는다
   */
  splitAt: z.number().nullish(),
  /** splitAt 뒤 한국어 부분의 한국어 글. 없으면 그 부분은 내주지 않는다 */
  tailKo: z.string().nullish(),
  /**
   * 한국어 앞말 + 일본어가 섞인 줄: 일본어 부분이 시작하는 시각(초, 파일 처음부터). start < japaneseStartAt < end.
   * corrected는 일본어 부분만 적는다. splitAt과 함께 쓰면 일본어 부분은 japaneseStartAt~splitAt
   */
  japaneseStartAt: z.number().nullish(),
  /** japaneseStartAt 앞 한국어 부분의 한국어 글. 없으면 그 부분은 내주지 않는다 */
  headKo: z.string().nullish(),
});
export type ReviewLine = z.infer<typeof reviewLineSchema>;

export const transcriptReviewSchema = z.object({
  book: z.string(),
  item: z.string(),
  method: z.string().optional(),
  /** 소리 확인의 닮음 기준(0~1). 표기만 고친 줄을 올릴 때 쓴다 */
  threshold: z.number().optional(),
  lines: z.array(reviewLineSchema),
});
export type TranscriptReview = z.infer<typeof transcriptReviewSchema>;

/** threshold가 없을 때의 소리 확인 기준 */
const DEFAULT_THRESHOLD = 0.85;
/** 시각이 같다고 볼 차이(초). 자막 파일은 소수 둘째 자리까지 적는다 */
const SAME_TIME = 0.005;

type Segment = { start: number; end: number; text: string; lang: "ko" | "ja" };

/** 일본어 줄 후보: 교정한 줄과, 자막에 내줄 그 줄의 시각(나눴으면 일본어 부분) */
export interface ReviewCandidate {
  start: number;
  end: number;
  line: ReviewLine;
}

export interface PreparedReview<T extends Segment> {
  segments: T[];
  candidates: ReviewCandidate[];
  /** 한국어 줄로 돌린 줄(숨긴 줄 포함) */
  korean: number;
  /** 헛것이라 뺀 줄(kind other) */
  dropped: number;
  /** 둘로 나눈 줄 */
  split: number;
  /** 지문이 자막과 맞지 않아 쓰지 않은 줄 */
  mismatched: number;
}

const sameTime = (a: number, b: number) => Math.abs(a - b) < SAME_TIME;
const HANGUL = /[가-힣]/u;
const JAPANESE = /[ぁ-ゖァ-ヺ㐀-鿿豈-﫿々]/u;

/**
 * 지문이 맞나: 시각은 정확히, 글은 부호·빈칸을 빼고 견준다(옮겨 적다 끝의 「。」를 빠뜨린 줄이 실제로 있었다).
 * 시각이 소수 둘째 자리까지 같고 글자도 같으면 같은 구간이다
 */
function fits(seg: Segment, line: ReviewLine): boolean {
  return (
    sameTime(seg.start, line.start) &&
    sameTime(seg.end, line.end) &&
    plainForm(seg.text) === plainForm(line.original)
  );
}

/**
 * ① 자막 구간에 교정 줄을 맞춰 반영한다. review가 없으면 그대로.
 * 지문(시각·원래 글)이 맞지 않는 줄은 쓰지 않는다(자막을 다시 받아 적었으면 옛 교정은 무시된다).
 */
export function prepareReview<T extends Segment>(
  segments: T[],
  review: TranscriptReview | null,
): PreparedReview<T> {
  const out: PreparedReview<T> = {
    segments,
    candidates: [],
    korean: 0,
    dropped: 0,
    split: 0,
    mismatched: 0,
  };
  if (!review || review.lines.length === 0) return out;
  const used = new Set<ReviewLine>();
  const next: T[] = [];
  for (const seg of segments) {
    const line = review.lines.find((l) => !used.has(l) && fits(seg, l));
    if (!line) {
      next.push(seg);
      continue;
    }
    used.add(line);
    const corrected = line.corrected?.trim() ?? "";
    if (line.kind === "korean-noise") {
      out.korean++;
      if (HANGUL.test(corrected))
        next.push({ ...seg, text: corrected, lang: "ko" });
      continue;
    }
    if (line.kind === "other") {
      out.dropped++;
      continue;
    }
    // 섞인 줄: 한국어가 앞이면 japaneseStartAt, 한국어 뒷말이 붙었으면 splitAt으로 일본어 부분을 가른다
    const inside = (t: number | null | undefined): t is number =>
      typeof t === "number" && t > seg.start && t < seg.end;
    const jaStart = inside(line.japaneseStartAt) ? line.japaneseStartAt : null;
    const jaEnd = inside(line.splitAt) ? line.splitAt : null;
    if (
      (jaStart !== null || jaEnd !== null) &&
      (jaStart ?? seg.start) < (jaEnd ?? seg.end)
    ) {
      out.split++;
      const head = line.headKo?.trim() ?? "";
      if (jaStart !== null && head)
        next.push({ ...seg, end: jaStart, text: head, lang: "ko" });
      const start = jaStart ?? seg.start;
      const end = jaEnd ?? seg.end;
      next.push({
        ...seg,
        start,
        end,
        text: corrected || seg.text,
        lang: "ja",
      });
      const tail = line.tailKo?.trim() ?? "";
      if (jaEnd !== null && tail)
        next.push({ ...seg, start: jaEnd, text: tail, lang: "ko" });
      out.candidates.push({ start, end, line });
      continue;
    }
    next.push(seg);
    out.candidates.push({ start: seg.start, end: seg.end, line });
  }
  out.mismatched = review.lines.length - used.size;
  out.segments = next;
  return out;
}

/** 표기 비교용: 반각·전각을 맞추고 부호·공백만 뺀다(가나 종류는 그대로) */
export function plainForm(text: string): string {
  return text.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "");
}

/** 소리만으로는 갈리지 않는 대답 낱말(うん·ううん은 소리 확인도 틀린다) */
const ANSWER_WORDS = new Set([
  "はい",
  "いいえ",
  "いえ",
  "うん",
  "ううん",
  "ええ",
  "いや",
  "うーん",
]);
/** 이만큼 이하 가나로 된 짧은 줄은 소리 확인이 믿기 어렵다 */
const SHORT_KANA = 3;

/**
 * ② 정상 카드로 올릴 줄인가. 확신(high)이고 소리 확인(audioVerified)을 통과했으며, 짧은 줄·대답 낱말이 아니고,
 * (a) 고친 글이 교재 낱말·등장인물 이름과 정확히 같거나(known, plainForm으로 만든 표기)
 * (b) prompt 없는 whisper도 원래 글보다 고친 글에 가까워졌을 때(표기만 고친 줄은 그 결과가 기준 이상이면).
 */
export function promotable(
  line: ReviewLine,
  known: Set<string>,
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  if (line.kind !== "japanese" && line.kind !== "name") return false;
  if (line.confidence !== "high" || line.audioVerified !== true) return false;
  const corrected = line.corrected?.trim() ?? "";
  if (!JAPANESE.test(corrected) || HANGUL.test(corrected)) return false;
  const kana = normalizeJa(line.reading?.trim() || corrected);
  if ([...kana].length <= SHORT_KANA) return false;
  if (ANSWER_WORDS.has(normalizeJa(corrected))) return false;
  if (known.has(plainForm(corrected))) return true;
  const plain = line.audio?.simPlain;
  const original = line.audio?.simOriginal;
  if (typeof plain !== "number") return false;
  if (typeof original === "number" && plain > original) return true;
  return line.audio?.spellingOnly === true && plain >= threshold;
}

/** 올릴 줄 하나: 자막에 넣을 시각·글과 카드 */
export interface Promotion {
  start: number;
  end: number;
  text: string;
  card: CueCard;
}

/** 소책자 문장과 구간 전체를 맞춘 카드(교재 원문이 더 낫다) */
function bookletWhole(card: CueCard | undefined): boolean {
  return (
    !!card?.whole && card.sentences.length > 0 && card.origin !== "transcript"
  );
}

/**
 * ③ 올린 줄의 글과 카드를 자막에 넣는다. 같은 시각 구간이 있으면 바꾸고(이미 소책자 문장과 맞았으면 둔다),
 * 거르기 단계에서 빠졌으면 시각 차례 자리에 다시 넣는다. 카드 열쇠(구간 차례)는 새 차례로 다시 매긴다.
 */
export function promoteSegments<T extends Segment>(
  segments: T[],
  cards: Record<string, CueCard>,
  promotions: Promotion[],
): { segments: T[]; cards: Record<string, CueCard> } {
  if (promotions.length === 0) return { segments, cards };
  const rows: { seg: T; card?: CueCard }[] = segments.map((seg, i) => ({
    seg,
    card: cards[String(i)],
  }));
  let inserted = false;
  for (const p of promotions) {
    const row = rows.find(
      (r) => sameTime(r.seg.start, p.start) && sameTime(r.seg.end, p.end),
    );
    if (row) {
      if (bookletWhole(row.card)) continue;
      row.seg = { ...row.seg, text: p.text, lang: "ja" };
      row.card = p.card;
      continue;
    }
    // 거른 줄을 다시 넣는다(자막 구간 꼴의 나머지 필드는 없다)
    rows.push({
      seg: { start: p.start, end: p.end, text: p.text, lang: "ja" } as T,
      card: p.card,
    });
    inserted = true;
  }
  if (inserted) rows.sort((a, b) => a.seg.start - b.seg.start);
  const nextCards: Record<string, CueCard> = {};
  rows.forEach((r, i) => {
    if (r.card) nextCards[String(i)] = r.card;
  });
  return { segments: rows.map((r) => r.seg), cards: nextCards };
}
