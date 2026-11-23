import { describe, expect, it } from "vitest";
import { cueIndexAt, type Transcript, transcriptCues } from "./cues";

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
});
