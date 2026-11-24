import { z } from "zod";

// 맥락 카드의 꼴. 카드를 만드는 일(cards.ts)은 그림 표·맞추기 코드를 끌고 오므로 꼴만 따로 둔다.
// 재생 화면(클라이언트)은 꼴의 타입만 쓰고, 서버가 자막을 읽을 때 이 스키마로 확인한다.

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
  /** 구체적인 낱말이면 그림 문자 하나(emoji.ts). 그린 그림(picture)이 있으면 두지 않는다 */
  emoji: z.string().optional(),
  /** 그린 낱말 그림 id(public/pictures/words/<id>.svg, lib/pictures) */
  picture: z.string().optional(),
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
  /** 받아 적은 글 대신 보일 글(한글로 적힌 일본어에 표기를 덧붙인 글, 되풀이 중 나은 받아쓰기) */
  text: z.string().optional(),
  /** 바로 맞추지 못하고 앞뒤 맥락·소리로 찾은 카드(repair.ts) */
  inferred: z.boolean().optional(),
  /**
   * 소책자에 원문이 없는 오디오(일문따 읽기 글, 일무따 연습 문제·장문)에서 받아 적은 일본어 줄.
   * 맞춘 문장은 없지만 일본어로 볼 만하다(자리가 확인된 낱말이 있거나 문장 꼴이다). 화면은 잡음 같은
   * 흐린 받아쓰기보다 조금 진하게 "받아 적은 글 · 뜻 없음"으로 보인다
   */
  noBookText: z.boolean().optional(),
  /**
   * 교재와 맞추지 못한 줄을 Claude가 문맥으로 고치고 소리로 확인한 글(교정 파일, review.ts).
   * origin은 transcript이고, 화면은 "고쳐 받아 적은 글"이라고 작게 알린다
   */
  reviewed: z.boolean().optional(),
});
export type CueCard = z.infer<typeof cueCardSchema>;

/** 자막(content/transcripts/<book>/<item>.json)에 서버가 카드를 붙인 꼴 */
export const transcriptSchema = z.object({
  book: z.string(),
  item: z.string(),
  kind: z.string(),
  durationSec: z.number().nonnegative(),
  segments: z.array(
    z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
      text: z.string(),
      lang: z.enum(["ko", "ja"]),
    }),
  ),
  /** segments 차례(문자열) → 그 구간의 맥락 카드. 서버가 붙인다 */
  cards: z.record(z.string(), cueCardSchema).optional(),
});
export type Transcript = z.infer<typeof transcriptSchema>;
