import { describe, expect, it } from "vitest";
import { contextTranscript } from "./build";
import type { Transcript } from "./card-schema";
import type { ReviewLine, TranscriptReview } from "./review";

// 교정 파일을 자막에 반영하는 흐름 전체(가짜 문장, 교재 글이 아니다).
// 일문따 강의에 일무따 교재 없이(드릴 낱말만) 카드를 붙인다.

const transcript: Transcript = {
  book: "ilmunta",
  item: "L02-01",
  kind: "lecture",
  durationSec: 30,
  segments: [
    { start: 0, end: 4, text: "시험 설명입니다", lang: "ko" },
    { start: 5, end: 7, text: "朝ご飯を食べるう", lang: "ja" },
    { start: 8, end: 10, text: "다음 설명입니다", lang: "ko" },
    { start: 11, end: 12, text: "名は無二だ", lang: "ja" },
    { start: 13, end: 15, text: "上手な分析だ", lang: "ja" },
    { start: 15, end: 15.2, text: "上手な分析だ", lang: "ja" },
  ],
};

const fixed: ReviewLine = {
  start: 5,
  end: 7,
  original: "朝ご飯を食べるう",
  corrected: "朝ご飯を食べる。",
  reading: "あさごはんをたべる",
  ko: "아침밥을 먹는다",
  confidence: "high",
  kind: "japanese",
  audioVerified: true,
  audio: { simPlain: 0.95, simOriginal: 0.6, spellingOnly: false },
};
const noise: ReviewLine = {
  start: 11,
  end: 12,
  original: "名は無二だ",
  corrected: "",
  confidence: "high",
  kind: "korean-noise",
};
const review: TranscriptReview = {
  book: "ilmunta",
  item: "L02-01",
  lines: [fixed, noise],
};

const build = (r: TranscriptReview | null) =>
  contextTranscript("ilmunta", "L02-01", transcript, null, [], null, r);

describe("교정 파일을 반영한 자막", () => {
  it("올린 줄은 고친 글·읽는 법·뜻을 단 정상 카드가 되고 교정 표시가 붙는다", () => {
    const out = build(review);
    const i = out.segments.findIndex((s) => s.start === 5);
    expect(out.segments[i].text).toBe("朝ご飯を食べる。");
    const card = out.cards?.[String(i)];
    expect(card?.reviewed).toBe(true);
    expect(card?.whole).toBe(true);
    expect(card?.sentences[0].ko).toBe("아침밥을 먹는다");
    expect(card?.sentences[0].ruby[0]).toEqual({ text: "朝", reading: "あさ" });
    expect(card?.words.map((w) => w.ja)).toContain("食べる");
  });

  it("한국어를 가나로 적은 줄은 일본어 줄로 내주지 않는다", () => {
    expect(build(review).segments.map((s) => s.start)).not.toContain(11);
    // 교정 파일이 없으면 그 줄은 남아 있었다
    expect(build(null).segments.map((s) => s.start)).toContain(11);
  });

  it("교정 파일이 없으면 고친 글도 교정 표시도 없다", () => {
    const out = build(null);
    const i = out.segments.findIndex((s) => s.start === 5);
    expect(out.segments[i].text).toBe("朝ご飯を食べるう");
    expect(out.cards?.[String(i)]?.reviewed).toBeUndefined();
  });

  it("앞 줄 꼬리 조각은 교정 파일이 없어도 뺀다", () => {
    expect(build(null).segments.map((s) => s.start)).not.toContain(15);
  });
});

describe("카드 뜻과 바로 옆 강사 줄이 낱말 하나만 다를 때", () => {
  // 예문 mp3에서 받아 적은 뜻(카드)과 강사 줄이 같은 뜻을 따로 받아 적었다
  const lecture = (ko: string): Transcript => ({
    book: "ilmunta",
    item: "L09-02",
    kind: "lecture",
    durationSec: 30,
    segments: [
      { start: 1, end: 3, text: "この駅で降りる。", lang: "ja" },
      { start: 4, end: 6, text: ko, lang: "ko" },
      { start: 7, end: 9, text: "この駅で降りる。", lang: "ja" },
    ],
  });
  const pair = (ko: string) => [
    { ja: "この駅で降りる。", ko, start: 0, end: 5, score: 1 },
  ];

  it("일본어에 없는 숫자로 받아 적은 카드 뜻은 강사 줄의 말로 바로잡는다", () => {
    const out = contextTranscript(
      "ilmunta",
      "L09-02",
      lecture("이번 역에서 내린다."),
      null,
      pair("2번 역에서 내린다."),
    );
    expect(out.cards?.["0"]?.sentences[0].ko).toBe("이번 역에서 내린다.");
    expect(out.cards?.["2"]?.sentences[0].ko).toBe("이번 역에서 내린다.");
  });

  it("카드 뜻이 맞으면 강사 줄을 카드의 말로 바로잡는다", () => {
    const out = contextTranscript(
      "ilmunta",
      "L09-02",
      lecture("2번 역에서 내린다."),
      null,
      pair("이번 역에서 내린다."),
    );
    expect(out.cards?.["0"]?.sentences[0].ko).toBe("이번 역에서 내린다.");
    expect(out.cards?.["1"]?.text).toBe("이번 역에서 내린다.");
  });
});
