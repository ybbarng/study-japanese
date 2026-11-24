import { describe, expect, it } from "vitest";
import type { ContextCue } from "@/lib/context/cues";
import {
  followIndexAt,
  needsScroll,
  sentenceTimeline,
  stageView,
} from "./follow";

// 교재 글이 아니라 모양만 같은 가짜 문장
const SENTENCES = [
  { ja: "やまはやまだ。" },
  { ja: "かわはかわだ。" },
  { ja: "うみはうみだ。" },
];

function cue(
  start: number,
  end: number,
  text: string,
  lang: "ko" | "ja",
  matched?: string,
): ContextCue {
  return {
    kind: "subtitle",
    start,
    end,
    text,
    lang,
    ...(matched
      ? {
          card: {
            sentences: [{ ja: matched, ko: "뜻", ruby: [{ text: matched }] }],
            whole: true,
            words: [],
          },
        }
      : {}),
  };
}

// 예문 mp3처럼: 한국어 안내 → 일본어 → 뜻 → 같은 일본어를 되풀이
const EXAMPLE_CUES = [
  cue(0, 2, "첫 번째 문형입니다.", "ko"),
  cue(3, 4, "やまはやまだ", "ja", "やまはやまだ。"),
  cue(4.5, 5.5, "산은 산이다.", "ko"),
  cue(6, 7, "やまはやまだ", "ja", "やまはやまだ。"),
  cue(9, 10, "かわはかわだ", "ja", "かわはかわだ。"),
  cue(11, 12, "알아듣기 어려운 줄", "ja"),
  cue(13, 14, "うみはうみだ", "ja", "うみはうみだ"),
];

describe("예문 문장 시각표", () => {
  it("소책자 문장과 맞춘 줄마다 화면 문장의 차례를 단다(문장부호가 달라도)", () => {
    expect(sentenceTimeline(EXAMPLE_CUES, SENTENCES)).toEqual([
      { start: 3, end: 4, index: 0 },
      { start: 6, end: 7, index: 0 },
      { start: 9, end: 10, index: 1 },
      { start: 13, end: 14, index: 2 },
    ]);
  });

  it("화면에 없는 문장과 맞춘 줄은 건너뛴다", () => {
    const other = [cue(1, 2, "そらはそらだ", "ja", "そらはそらだ。")];
    expect(sentenceTimeline(other, SENTENCES)).toEqual([]);
  });
});

describe("지금 강조할 문장", () => {
  const timeline = sentenceTimeline(EXAMPLE_CUES, SENTENCES);

  it("첫 문장이 나오기 전에는 없다", () => {
    expect(followIndexAt(timeline, 1)).toBe(-1);
  });

  it("한국어 풀이 중에도 방금 나온 문장을 붙든다", () => {
    expect(followIndexAt(timeline, 5)).toBe(0);
  });

  it("다음 문장이 나오면 옮겨 간다(짝 없는 줄에서는 앞 문장을 그대로)", () => {
    expect(followIndexAt(timeline, 9.2)).toBe(1);
    expect(followIndexAt(timeline, 11.5)).toBe(1);
    expect(followIndexAt(timeline, 13.5)).toBe(2);
  });
});

describe("지금 하는 말 칸", () => {
  it("일본어 줄이 나오면 그 줄을 크게 붙든다", () => {
    expect(stageView(EXAMPLE_CUES, 3.5)).toEqual({
      at: 1,
      prev: 0,
      next: 2,
      held: 1,
    });
  });

  it("한국어 설명 중에는 방금 나온 일본어 줄을 남겨 둔다", () => {
    expect(stageView(EXAMPLE_CUES, 5).held).toBe(1);
    expect(stageView(EXAMPLE_CUES, 5).at).toBe(2);
  });

  it("다음 일본어 줄이 나오면 바꾼다", () => {
    expect(stageView(EXAMPLE_CUES, 6.5).held).toBe(3);
  });

  it("말 없는 긴 틈에서도 앞뒤 줄과 붙든 일본어 줄은 남는다", () => {
    const lecture = [
      cue(0, 2, "설명", "ko"),
      cue(3, 4, "やまはやまだ", "ja"),
      cue(30, 32, "다음 설명", "ko"),
    ];
    expect(stageView(lecture, 20)).toEqual({
      at: -1,
      prev: 1,
      next: 2,
      held: 1,
    });
  });

  it("아직 일본어가 없었으면 붙들 줄도 없다", () => {
    expect(stageView(EXAMPLE_CUES, 1).held).toBe(-1);
  });
});

describe("화면을 굴려야 하는지", () => {
  const phone = { height: 900, coveredBottom: 160 };

  it("보기 좋은 띠 안에 있으면 굴리지 않는다", () => {
    expect(needsScroll({ top: 300, bottom: 400 }, phone)).toBe(false);
  });

  it("아래 단추·재생 막대에 가리거나 위로 벗어나면 굴린다", () => {
    expect(needsScroll({ top: 700, bottom: 800 }, phone)).toBe(true);
    expect(needsScroll({ top: 50, bottom: 150 }, phone)).toBe(true);
  });

  it("띠보다 큰 문장은 머리가 위쪽 선에 오도록만 굴린다", () => {
    expect(needsScroll({ top: 100, bottom: 900 }, phone)).toBe(false);
    expect(needsScroll({ top: 400, bottom: 1300 }, phone)).toBe(true);
  });
});
