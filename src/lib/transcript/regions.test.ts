import { describe, expect, it } from "vitest";
import { parseSilences, speechRegions, splitLongRegions } from "./regions";

describe("silencedetect 로그 읽기", () => {
  it("시작·끝 짝을 무음 구간으로 만든다", () => {
    const log = [
      "[silencedetect @ 0x1] silence_start: 0",
      "[silencedetect @ 0x1] silence_end: 0.85 | silence_duration: 0.85",
      "[silencedetect @ 0x1] silence_start: 5.07",
      "[silencedetect @ 0x1] silence_end: 6.22 | silence_duration: 1.15",
    ].join("\n");
    expect(parseSilences(log, 10)).toEqual([
      { start: 0, end: 0.85 },
      { start: 5.07, end: 6.22 },
    ]);
  });

  it("끝이 없는 마지막 무음은 파일 길이에서 닫는다", () => {
    expect(parseSilences("silence_start: 8.5", 10)).toEqual([
      { start: 8.5, end: 10 },
    ]);
  });

  it("음수 시작은 0으로 맞춘다", () => {
    expect(parseSilences("silence_start: -0.01\nsilence_end: 0.4", 5)).toEqual([
      { start: 0, end: 0.4 },
    ]);
  });
});

describe("말소리 구간", () => {
  const opts = { pad: 0.1, minLength: 0.2 };

  it("무음 사이를 말소리로 보고 앞뒤로 여유를 붙인다", () => {
    const regions = speechRegions(
      [
        { start: 0, end: 1 },
        { start: 3, end: 4 },
      ],
      6,
      opts,
    );
    expect(regions).toEqual([
      { start: 0.9, end: 3.1 },
      { start: 3.9, end: 6 },
    ]);
  });

  it("여유는 무음의 절반을 넘지 않는다", () => {
    const regions = speechRegions([{ start: 2, end: 2.1 }], 4, opts);
    expect(regions).toEqual([
      { start: 0, end: 2.05 },
      { start: 2.05, end: 4 },
    ]);
  });

  it("minLength보다 짧은 말소리는 버린다", () => {
    const regions = speechRegions(
      [
        { start: 0, end: 1 },
        { start: 1.1, end: 3 },
      ],
      3,
      opts,
    );
    expect(regions).toEqual([]);
  });
});

describe("긴 구간 자르기", () => {
  it("가운데에 가장 가까운 짧은 무음에서 자른다", () => {
    const out = splitLongRegions(
      [{ start: 0, end: 20 }],
      [
        { start: 4, end: 4.2 },
        { start: 11, end: 11.2 },
      ],
      14,
    );
    expect(out).toEqual([
      { start: 0, end: 11.1 },
      { start: 11.1, end: 20 },
    ]);
  });

  it("짧은 무음이 없으면 가운데를 자르고, 조각이 모두 maxLength 안에 들 때까지 되풀이한다", () => {
    const out = splitLongRegions([{ start: 0, end: 40 }], [], 14);
    expect(out).toEqual([
      { start: 0, end: 10 },
      { start: 10, end: 20 },
      { start: 20, end: 30 },
      { start: 30, end: 40 },
    ]);
  });

  it("maxLength 안의 구간은 그대로 둔다", () => {
    expect(splitLongRegions([{ start: 1, end: 5 }], [], 14)).toEqual([
      { start: 1, end: 5 },
    ]);
  });
});
