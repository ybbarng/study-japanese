import { z } from "zod";

/**
 * 교재 오디오의 시각 붙은 자막(content/transcripts/<book>/<item>.json).
 * 시각은 파일 처음부터 센 초이고 소수 둘째 자리까지 적는다.
 * 교재에서 나온 글이라 git에 넣지 않는다.
 */

export const transcriptLangSchema = z.enum(["ko", "ja"]);
export type TranscriptLang = z.infer<typeof transcriptLangSchema>;

export const transcriptSegmentSchema = z
  .object({
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    text: z.string().min(1),
    lang: transcriptLangSchema,
  })
  .refine((s) => s.end >= s.start, { message: "end가 start보다 앞이다" });
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

export const transcriptSchema = z.object({
  book: z.enum(["ilmuta", "ilmunta"]),
  /** 오디오 파일 이름에서 확장자를 뺀 것(`L01`, `01-1`, `L01-01`) */
  item: z.string().min(1),
  kind: z.enum(["lecture", "example"]),
  durationSec: z.number().nonnegative(),
  segments: z.array(transcriptSegmentSchema),
});
export type Transcript = z.infer<typeof transcriptSchema>;
export type TranscriptBook = Transcript["book"];
export type TranscriptKind = Transcript["kind"];
