import { describe, expect, it } from "vitest";
import {
  cueIndexAt,
  cueIndexBefore,
  cueText,
  cueUnsure,
  type Transcript,
  transcriptCues,
} from "./cues";

const transcript: Transcript = {
  book: "ilmuta",
  item: "L01",
  kind: "lecture",
  durationSec: 30,
  segments: [
    { start: 5, end: 8, text: "둘째 줄", lang: "ko" },
    { start: 0, end: 4, text: " 첫 줄 ", lang: "ko" },
    { start: 9, end: 10, text: "", lang: "ko" },
    { start: 12, end: 14, text: "やあ", lang: "ja" },
  ],
};

describe("자막을 큐로", () => {
  it("빈 구간은 빼고 시작 시각 차례로 놓고 앞뒤 공백을 지운다", () => {
    expect(
      transcriptCues(transcript).map((c) => [c.start, c.text, c.lang]),
    ).toEqual([
      [0, "첫 줄", "ko"],
      [5, "둘째 줄", "ko"],
      [12, "やあ", "ja"],
    ]);
  });
});

describe("맥락 카드 붙이기", () => {
  const card = {
    sentences: [{ ja: "やあ。", ko: "안녕.", ruby: [{ text: "やあ。" }] }],
    whole: true,
    words: [],
  };

  it("카드는 원래 segments 차례로 붙는다(빈 구간을 빼고 정렬해도 어긋나지 않는다)", () => {
    const cues = transcriptCues({ ...transcript, cards: { "3": card } });
    expect(cues.map((c) => c.card ?? null)).toEqual([null, null, card]);
  });

  it("구간 전체를 맞췄으면 소책자 글을, 일부만 맞췄으면 받아 적은 글을 보인다", () => {
    const [cue] = transcriptCues({
      ...transcript,
      segments: [{ start: 0, end: 1, text: "やー", lang: "ja" }],
      cards: { "0": card },
    });
    expect(cueText(cue)).toBe("やあ。");
    expect(cueText({ ...cue, card: { ...card, whole: false } })).toBe("やー");
  });

  it("서버가 고친 글이 있으면 받아 적은 글 대신 그것을 보인다", () => {
    const [cue] = transcriptCues({
      ...transcript,
      segments: [{ start: 0, end: 1, text: "야마는 산", lang: "ko" }],
      cards: {
        "0": { sentences: [], whole: false, words: [], text: "야마(山)는 산" },
      },
    });
    expect(cueText(cue)).toBe("야마(山)는 산");
  });
});

describe("받아쓰기 일본어 줄", () => {
  const card = {
    sentences: [{ ja: "やあ。", ko: "안녕.", ruby: [{ text: "やあ。" }] }],
    whole: true,
    words: [],
  };
  const cue = (lang: "ko" | "ja", c?: typeof card) =>
    transcriptCues({
      ...transcript,
      segments: [{ start: 0, end: 1, text: "やー", lang }],
      ...(c ? { cards: { "0": c } } : {}),
    })[0];

  it("교재 문장과 통째로 맞추지 못한 일본어 줄은 정확하지 않을 수 있는 줄이다", () => {
    expect(cueUnsure(cue("ja"))).toBe(true);
    expect(cueUnsure(cue("ja", { ...card, whole: false }))).toBe(true);
  });

  it("교재 문장과 맞춘 줄과 한국어 줄은 그렇지 않다", () => {
    expect(cueUnsure(cue("ja", card))).toBe(false);
    expect(cueUnsure(cue("ko"))).toBe(false);
  });
});

describe("지금 위치의 큐", () => {
  const cues = transcriptCues(transcript);

  it("구간 안이면 그 큐", () => {
    expect(cueIndexAt(cues, 6)).toBe(1);
    expect(cueIndexAt(cues, 12)).toBe(2);
  });

  it("구간 사이 짧은 빈틈에서는 앞 큐를 잠깐 더 보인다", () => {
    expect(cueIndexAt(cues, 4.5)).toBe(0);
  });

  it("빈틈이 길면 아무것도 보이지 않는다", () => {
    expect(cueIndexAt(cues, 10)).toBe(-1);
  });

  it("첫 큐 전이면 -1", () => {
    expect(
      cueIndexAt(
        transcriptCues({
          ...transcript,
          segments: [{ start: 3, end: 4, text: "a", lang: "ko" }],
        }),
        1,
      ),
    ).toBe(-1);
  });

  it("큐가 없으면 -1", () => {
    expect(cueIndexAt([], 1)).toBe(-1);
  });

  it("문장 반복을 걸 때는 빈틈이 길어도 방금 지난 큐를 고른다", () => {
    expect(cueIndexBefore(cues, 11)).toBe(1);
    expect(cueIndexBefore(cues, -1)).toBe(-1);
  });
});
