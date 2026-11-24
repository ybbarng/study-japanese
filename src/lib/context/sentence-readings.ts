import { z } from "zod";
import { plainForm } from "./review";

// 받아 적은 문장의 읽는 법을 Claude가 문장마다 적은 파일(문장 읽기 파일). 파일을 읽지 않는 순수 함수다.
// 자리: content/transcripts-review/<book>/readings/<NN>.json (git 밖). 꼴과 만드는 법은 docs/transcript-review.md.
// 낱말 표만으로는 받아 적은 글의 한자 대부분에 읽기를 달 수 없다(사전에 없는 낱말, 활용한 꼴, 이름).
// 읽기는 카드에서 가나 부분을 닻으로 한자 덩어리마다 나눠 달고(reading-ruby.ts), 가나가 글과 맞지 않으면 쓰지 않는다.

export const sentenceReadingsSchema = z.object({
  book: z.string(),
  /** 강·과 번호 */
  lesson: z.number().int().positive(),
  method: z.string().optional(),
  sentences: z.array(
    z.object({
      /** 자막에서 받아 적은 그대로의 일본어 문장(부호·빈칸은 견줄 때 뺀다) */
      ja: z.string(),
      /** 그 문장 전체의 읽는 법(히라가나). 가나 부분은 글과 같아야 한다 */
      reading: z.string(),
    }),
  ),
});
export type SentenceReadings = z.infer<typeof sentenceReadingsSchema>;

/** 문장 읽기 파일들 → plainForm(ja) → 읽기. 같은 문장이 둘이면 앞의 것 */
export function sentenceReadingMap(
  files: readonly (SentenceReadings | null)[],
): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of files)
    for (const s of f?.sentences ?? []) {
      const key = plainForm(s.ja);
      if (key !== "" && s.reading.trim() !== "" && !out.has(key))
        out.set(key, s.reading.trim());
    }
  return out;
}
