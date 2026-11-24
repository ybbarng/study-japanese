import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LONG_LECTURE, LONG_LECTURE_BOOKLET } from "./textbook";

// E2E용 가짜 예문 낱말 분석(docs/textbook-analysis.md). 가짜 교재 3강의 문형 예문과
// 강의 자막에 짝지어지는 소책자 문장에 낱말 분석을 붙인다. 1·2강은 분석이 없다(글자 하나씩 누르기).

const hash = (ja: string) =>
  createHash("sha256").update(ja, "utf8").digest("hex").slice(0, 8);

/** 3강 문형 예문(가짜 교재 fixtures/textbook.ts와 같은 글) */
export const TAP_PATTERN = "山は山だ。";
export const TAP_WORD = {
  surface: "山",
  reading: "やま",
  gloss: "산(시험 뜻)",
};

export function writeFakeWordTap(contentDir: string) {
  const n = String(LONG_LECTURE.no).padStart(2, "0");
  const analysis = {
    book: "ilmuta",
    lesson: LONG_LECTURE.no,
    analyzedAt: "2026-11-24",
    by: "claude",
    sentences: [
      {
        example: `${n}-3`,
        index: 0,
        hash: hash(TAP_PATTERN),
        tokens: [
          {
            start: 0,
            length: 1,
            reading: TAP_WORD.reading,
            pos: "名詞",
            gloss: TAP_WORD.gloss,
          },
          { start: 1, length: 1, pos: "助詞", gloss: "~은/는" },
          { start: 2, length: 1, reading: "やま", pos: "名詞", gloss: "산" },
          { start: 3, length: 1, pos: "助動詞", gloss: "~이다" },
        ],
        grammar: [{ pattern: "〜は〜だ", explain: "시험 문법 메모." }],
      },
      {
        example: `${n}-1`,
        index: 2,
        hash: hash(LONG_LECTURE_BOOKLET.ja),
        tokens: [
          { start: 0, length: 3, pos: "名詞", gloss: "시험" },
          { start: 3, length: 1, pos: "助詞", gloss: "~의" },
          { start: 4, length: 2, pos: "名詞", gloss: "문장" },
          { start: 6, length: 2, pos: "助動詞", gloss: "~입니다" },
        ],
      },
    ],
  };
  const dir = path.join(contentDir, "textbook-analysis", "ilmuta");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${LONG_LECTURE.no}.json`),
    JSON.stringify(analysis),
  );
}
