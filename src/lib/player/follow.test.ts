import { describe, expect, it } from "vitest";
import type { ContextCue } from "@/lib/context/cues";
import { resolveLoopCue } from "./cue-loop";
import {
  followIndexAt,
  needsScroll,
  sentenceTimeline,
  stageLoops,
  stageScrollBy,
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
      cue(3, 4, "やまはやまだ", "ja", "やまはやまだ。"),
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

/** 화면처럼: 지금 말 반복이 잡을 줄을 L 키 규칙으로 고른 뒤 단추를 정한다 */
const loopsAt = (cues: ContextCue[], pos: number) =>
  stageLoops(stageView(cues, pos), resolveLoopCue(cues, pos));

describe("지금 칸의 반복 단추", () => {
  it("일본어 줄을 듣는 중이면 그 줄을 잡는 단추 하나다", () => {
    expect(stageLoops(stageView(EXAMPLE_CUES, 3.5))).toEqual({
      held: false,
      hereLabel: "이 문장 반복",
    });
  });

  it("붙든 일본어와 지금 한국어 설명이 함께 보이면 둘을 나눠 무엇을 반복하는지 적는다", () => {
    expect(loopsAt(EXAMPLE_CUES, 5.4)).toEqual({
      held: true,
      hereLabel: "지금 말 반복",
    });
  });

  it("한국어 설명이 막 시작해 지금 말 반복도 그 일본어 줄을 잡을 때는 단추 하나다", () => {
    // 4.5초에 시작한 설명을 0.8초 안에 누르면 화면에 보이던 앞 일본어 줄을 잡는다
    expect(loopsAt(EXAMPLE_CUES, 4.7)).toEqual({
      held: false,
      hereLabel: "이 문장 반복",
    });
  });

  it("일본어 줄 뒤 말 없는 틈에서는 지금 말 반복이 그 줄을 잡으므로 단추 하나다", () => {
    const lecture = [
      cue(0, 2, "설명", "ko"),
      cue(3, 4, "やまはやまだ", "ja", "やまはやまだ。"),
      cue(30, 32, "다음 설명", "ko"),
    ];
    expect(loopsAt(lecture, 10)).toEqual({
      held: false,
      hereLabel: "이 문장 반복",
    });
  });

  it("흐린 받아쓰기 줄은 4초가 지나 놓이면 일본어 반복 단추도 사라진다", () => {
    // 0강처럼: 흐린 줄 뒤 한국어 설명이 길게 이어진다
    const lecture = [
      cue(400, 401, "あいまいなおと", "ja"),
      cue(401.5, 404, "설명 하나", "ko"),
      cue(406, 409, "설명 둘", "ko"),
    ];
    expect(loopsAt(lecture, 403).held).toBe(true);
    expect(loopsAt(lecture, 407)).toEqual({
      held: false,
      hereLabel: "이 문장 반복",
    });
  });
});

describe("강의를 틀 때 PC 무대로 굴리기", () => {
  it("무대가 한 화면에 들어가면 굴리지 않는다", () => {
    expect(stageScrollBy(80, 200, 900, 560)).toBe(0);
  });

  it("무대 아래가 화면 밖이면 재생 카드가 맨 위에 오도록 올린다", () => {
    // 1440×900: 재생 카드 308px, 무대 430px에서 시작
    expect(stageScrollBy(308, 430, 900, 560)).toBe(284);
  });

  it("카드까지 함께 올려도 무대가 넘치면 무대를 맨 위로", () => {
    expect(stageScrollBy(308, 430, 700, 560)).toBe(406);
  });
});

describe("붙든 일본어 줄을 놓을 때", () => {
  /** 일본어 줄 하나 뒤로 3.5초짜리 한국어 설명이 count개 이어지는 강의 */
  function longTalk(matched: boolean, count: number): ContextCue[] {
    const out = [
      cue(10, 12, "やまはやまだ", "ja", matched ? "やまはやまだ。" : undefined),
    ];
    for (let i = 0; i < count; i++)
      out.push(cue(12.5 + i * 4, 16 + i * 4, `설명 ${i}`, "ko"));
    return out;
  }

  it("교재와 맞춘 줄은 한국어 설명 몇 줄 동안 남는다", () => {
    expect(stageView(longTalk(true, 40), 20).held).toBe(0);
  });

  it("한국어 설명이 여섯 줄 넘게 이어지면 놓는다", () => {
    // 여섯째 설명 줄(32.5초 시작)이 나오면 끝난 지 25초가 안 되었어도 놓는다
    expect(stageView(longTalk(true, 40), 32).held).toBe(0);
    expect(stageView(longTalk(true, 40), 33).held).toBe(-1);
  });

  it("말 없는 틈이라도 끝난 지 25초가 지나면 놓는다", () => {
    const lecture = [
      cue(3, 4, "やまはやまだ", "ja", "やまはやまだ。"),
      cue(40, 42, "다음 설명", "ko"),
    ];
    expect(stageView(lecture, 29).held).toBe(0);
    expect(stageView(lecture, 30).held).toBe(-1);
  });

  it("흐린 받아쓰기 줄은 끝난 뒤 몇 초만 남긴다", () => {
    expect(stageView(longTalk(false, 40), 15).held).toBe(0);
    expect(stageView(longTalk(false, 40), 17).held).toBe(-1);
  });

  it("몇 분 동안 한국어 설명만 이어지면 지금 칸에 일본어 줄이 없다", () => {
    const view = stageView(longTalk(false, 40), 140);
    expect(view.held).toBe(-1);
    expect(view.at).toBe(32);
  });

  it("지금 소리 나는 일본어 줄은 흐려도 붙든다", () => {
    expect(stageView(longTalk(false, 40), 11).held).toBe(0);
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

  it("위에 붙은 재생기 뒤에 숨은 문장도 굴린다", () => {
    const covered = { height: 900, coveredTop: 300, coveredBottom: 0 };
    expect(needsScroll({ top: 200, bottom: 280 }, covered)).toBe(true);
    expect(needsScroll({ top: 400, bottom: 480 }, covered)).toBe(false);
  });

  it("띠보다 큰 문장은 머리가 위쪽 선에 오도록만 굴린다", () => {
    expect(needsScroll({ top: 100, bottom: 900 }, phone)).toBe(false);
    expect(needsScroll({ top: 400, bottom: 1300 }, phone)).toBe(true);
  });
});
