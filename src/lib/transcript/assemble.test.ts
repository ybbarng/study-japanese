import { describe, expect, it } from "vitest";
import {
  assembleSegments,
  buildTranscript,
  type RawTranscription,
  roundSec,
} from "./assemble";
import type { ChunkResult } from "./whisper-json";

function result(
  lang: string,
  segments: [number, number, string][],
): ChunkResult {
  return {
    lang,
    segments: segments.map(([start, end, text]) => ({ start, end, text })),
    meanLogProb: -0.1,
  };
}

describe("초 반올림", () => {
  it("소수 둘째 자리로 반올림한다", () => {
    expect(roundSec(1.23456)).toBe(1.23);
    expect(roundSec(1.235001)).toBe(1.24);
  });
});

describe("조각 결과를 파일 시각 구간으로 모으기", () => {
  it("조각 안 시각에 조각 시작을 더하고, 마지막 구간은 조각 끝까지 늘린다", () => {
    const segs = assembleSegments([
      {
        span: { start: 10, end: 14 },
        picked: {
          lang: "ja",
          result: result("ja", [
            [0, 1.5, "ねこだ。"],
            [1.5, 2.5, "いぬだ。"],
          ]),
        },
      },
    ]);
    expect(segs).toEqual([
      { start: 10, end: 11.5, text: "ねこだ。", lang: "ja" },
      { start: 11.5, end: 14, text: "いぬだ。", lang: "ja" },
    ]);
  });

  it("조각 범위를 넘는 시각은 조각 끝으로 자른다", () => {
    const segs = assembleSegments([
      {
        span: { start: 0, end: 1 },
        picked: { lang: "ko", result: result("ko", [[0, 3, "고양이"]]) },
      },
    ]);
    expect(segs).toEqual([{ start: 0, end: 1, text: "고양이", lang: "ko" }]);
  });

  it("고른 결과가 없는 조각과 환각·빈 구간은 버린다", () => {
    const segs = assembleSegments([
      { span: { start: 0, end: 1 }, picked: undefined },
      {
        span: { start: 2, end: 4 },
        picked: {
          lang: "ko",
          result: result("ko", [
            [0, 0.5, "[音楽]"],
            [0.5, 1, "고양이"],
          ]),
        },
      },
    ]);
    expect(segs).toEqual([{ start: 2.5, end: 4, text: "고양이", lang: "ko" }]);
  });

  it("조각 차례가 뒤섞여 와도 시작 시각 차례로 놓고, 앞 구간 끝이 뒤 구간 시작을 넘지 않게 한다", () => {
    const segs = assembleSegments([
      {
        span: { start: 5, end: 6 },
        picked: { lang: "ja", result: result("ja", [[0, 1, "いぬ"]]) },
      },
      {
        span: { start: 3, end: 5.5 },
        picked: { lang: "ko", result: result("ko", [[0, 2.5, "개"]]) },
      },
    ]);
    expect(segs).toEqual([
      { start: 3, end: 5, text: "개", lang: "ko" },
      { start: 5, end: 6, text: "いぬ", lang: "ja" },
    ]);
  });
});

describe("원 결과에서 자막 만들기", () => {
  it("조각마다 언어를 골라 책·항목 정보와 함께 자막을 만든다", () => {
    const raw: RawTranscription = {
      durationSec: 8.004,
      spans: [
        { start: 0, end: 2 },
        { start: 3, end: 5 },
      ],
      auto: [result("ko", [[0, 1, "고양이"]]), result("en", [[0, 1, "Neko"]])],
      ko: { 1: result("ko", [[0, 1, "네코"]]) },
      ja: { 1: result("ja", [[0, 1, "ねこ"]]) },
    };
    expect(
      buildTranscript({ book: "ilmuta", item: "L99", kind: "lecture" }, raw),
    ).toEqual({
      book: "ilmuta",
      item: "L99",
      kind: "lecture",
      durationSec: 8,
      segments: [
        { start: 0, end: 2, text: "고양이", lang: "ko" },
        { start: 3, end: 5, text: "ねこ", lang: "ja" },
      ],
    });
  });
});
