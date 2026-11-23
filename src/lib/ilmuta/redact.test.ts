import { describe, expect, it } from "vitest";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { redactIlmutaLesson } from "./redact";

const lesson: IlmutaLesson = {
  no: 1,
  title: "テスト。",
  titleKo: "시험이야.",
  pages: { from: 10, to: 15 },
  lecture: { file: "1. 음성 강의/L01.mp3", durationSec: 500 },
  examples: [
    {
      id: "01-2",
      file: "2. 예문 mp3/01-2.mp3",
      durationSec: 30,
      kind: "words",
      sentences: [{ ja: "ねこ", ko: "고양이", reading: "ねこ" }],
    },
    {
      id: "01-3",
      file: "2. 예문 mp3/01-3.mp3",
      durationSec: 30,
      kind: "patterns",
      sentences: [{ ja: "ねこだ。", ko: "고양이야.", pattern: 1 }],
      patterns: [{ no: 1, ja: "～だ。", ko: "~야." }],
    },
  ],
  conversationWords: [{ ja: "やあ", ko: "안녕" }],
};

describe("redactIlmutaLesson", () => {
  it("소책자에서 온 문장·문형·회화 낱말을 뺀다", () => {
    const r = redactIlmutaLesson(lesson);
    expect(r.examples.map((e) => e.sentences)).toEqual([[], []]);
    expect(r.examples[1].patterns).toBeUndefined();
    expect(r.conversationWords).toBeUndefined();
  });

  it("강 번호·쪽수·오디오 목록은 남긴다", () => {
    const r = redactIlmutaLesson(lesson);
    expect(r.no).toBe(1);
    expect(r.pages).toEqual({ from: 10, to: 15 });
    expect(r.lecture.file).toBe("1. 음성 강의/L01.mp3");
    expect(r.examples.map((e) => e.file)).toEqual([
      "2. 예문 mp3/01-2.mp3",
      "2. 예문 mp3/01-3.mp3",
    ]);
  });
});
