import { z } from "zod";

/**
 * 교재 데이터(content/textbook/*.json)의 모양.
 * 파일 경로(`file`)는 교재 자료 폴더 기준 상대 경로다.
 * 서버에서는 `media/ilmuta/<file>`, `media/ilmunta/<file>`로 붙인다.
 */

export const pageRangeSchema = z.object({
  from: z.number().int().positive(),
  to: z.number().int().positive(),
});
export type PageRange = z.infer<typeof pageRangeSchema>;

export const audioSchema = z.object({
  file: z.string().min(1),
  durationSec: z.number().nonnegative(),
});
export type Audio = z.infer<typeof audioSchema>;

/** 일본어 한 문장(또는 단어)과 한국어 뜻 */
export const sentenceSchema = z.object({
  ja: z.string().min(1),
  ko: z.string(),
  /** 단어의 읽는 법(소책자의 `彼氏[かれし]`에서 `かれし`) */
  reading: z.string().optional(),
  /** 회화에서 말하는 사람(일본어 표기) */
  speaker: z.string().optional(),
  /** 문형 예문이면 그 문형 번호(`patterns[].no`) */
  pattern: z.number().int().positive().optional(),
});
export type Sentence = z.infer<typeof sentenceSchema>;

/** 문형 머리(예: `～は～。` / `~는 ~야.`). 소리로는 읽지 않는다. */
export const patternSchema = z.object({
  no: z.number().int().positive(),
  ja: z.string(),
  ko: z.string(),
});
export type Pattern = z.infer<typeof patternSchema>;

/**
 * 예문 mp3 하나. 소책자에서 짝을 찾지 못했으면 `sentences`는 빈 배열이다.
 */
export const exampleSchema = z.object({
  /** 파일 이름에서 확장자를 뺀 것(예: `01-1`, `01-4-2`) */
  id: z.string().min(1),
  file: z.string().min(1),
  durationSec: z.number().nonnegative(),
  kind: z
    .enum([
      "dialogue", // 일무따 -1: 기본 회화 듣기
      "words", // 일무따 -2: 기본 단어 익히기
      "patterns", // 일무따 -3: 기본 문형 익히기
      "conversationBasic", // 일무따 -4-1: 회화로 다지기 Basic
      "conversationAdvanced", // 일무따 -4-2: 회화로 다지기 Advanced
      "exercise", // 일무따 -5: 연습 문제
      "longReading", // 일무따 -6: 장문 도전하기
      "grammarExamples", // 일문따 -1: 문법 예문
      "reading", // 일문따 -2: 읽기 글
      "unknown",
    ])
    .default("unknown"),
  sentences: z.array(sentenceSchema),
  patterns: z.array(patternSchema).optional(),
});
export type Example = z.infer<typeof exampleSchema>;

export const registerSchema = z.enum(["casual", "polite"]);

export const ilmutaLessonSchema = z.object({
  no: z.number().int().nonnegative(),
  /** 강 제목(소책자 강 머리의 일본어 문장). 못 뽑으면 빈 문자열 */
  title: z.string(),
  /** 강 제목의 한국어 뜻 */
  titleKo: z.string().optional(),
  /** 제목 위에 붙은 부제(예: 동사 활용 갈래) */
  subtitle: z.string().optional(),
  /** 반말(casual)·존댓말(polite) */
  register: registerSchema.optional(),
  pages: pageRangeSchema.optional(),
  lecture: audioSchema,
  examples: z.array(exampleSchema),
  /** 회화 코너의 단어(소리로는 읽지 않는다) */
  conversationWords: z.array(sentenceSchema).optional(),
});
export type IlmutaLesson = z.infer<typeof ilmutaLessonSchema>;

export const extraSchema = z.object({
  file: z.string().min(1),
  title: z.string(),
  durationSec: z.number().nonnegative(),
});
export type Extra = z.infer<typeof extraSchema>;

export const ilmutaSchema = z.object({
  book: z.literal("ilmuta"),
  lessons: z.array(ilmutaLessonSchema),
  extras: z.array(extraSchema),
});
export type Ilmuta = z.infer<typeof ilmutaSchema>;

export const ilmuntaLessonSchema = z.object({
  no: z.number().int().positive(),
  title: z.string(),
  pages: pageRangeSchema.optional(),
  /** 핵심정리 소책자 PDF에서 이 과가 시작하는 쪽(1부터, `#page=`로 연다) */
  bookletPage: z.number().int().positive().optional(),
  /** 60일 학습 스케줄에서 이 과를 공부하는 날(한 과가 여러 날에 걸치기도 한다) */
  scheduleDays: z.array(z.number().int().positive()).optional(),
  lectures: z.array(audioSchema),
  examples: z.array(exampleSchema),
});
export type IlmuntaLesson = z.infer<typeof ilmuntaLessonSchema>;

export const ilmuntaSchema = z.object({
  book: z.literal("ilmunta"),
  /** 준비마당(일본어 글자들). 오디오는 없다 */
  preparation: z
    .object({ title: z.string(), pages: pageRangeSchema.optional() })
    .optional(),
  lessons: z.array(ilmuntaLessonSchema),
});
export type Ilmunta = z.infer<typeof ilmuntaSchema>;
