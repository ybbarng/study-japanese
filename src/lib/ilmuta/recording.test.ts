import { describe, expect, it } from "vitest";
import {
  classifyMicError,
  pickMimeType,
  type TakeMeta,
  takesToPrune,
} from "./recording";

describe("녹음 형식 고르기", () => {
  it("webm/opus가 되면 그것을 고른다", () => {
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("webm이 안 되는 브라우저(사파리)는 mp4", () => {
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("아무것도 안 되면 undefined(브라우저 기본값에 맡긴다)", () => {
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});

describe("오래된 녹음 지우기", () => {
  const take = (
    id: string,
    exampleId: string,
    createdAt: number,
  ): TakeMeta => ({
    id,
    lesson: 1,
    exampleId,
    createdAt,
    durationSec: 3,
  });

  it("예문마다 최근 것만 남기고 나머지 id를 돌려준다", () => {
    const takes = [
      take("a1", "01-3", 1),
      take("a2", "01-3", 3),
      take("a3", "01-3", 2),
      take("b1", "01-4-2", 1),
    ];
    expect(takesToPrune(takes, 2)).toEqual(["a1"]);
  });
});

describe("마이크 오류 안내", () => {
  it("권한을 막으면 denied", () => {
    expect(classifyMicError(new DOMException("x", "NotAllowedError"))).toBe(
      "denied",
    );
  });

  it("마이크가 없으면 no-device", () => {
    expect(classifyMicError(new DOMException("x", "NotFoundError"))).toBe(
      "no-device",
    );
  });

  it("모르는 오류는 other", () => {
    expect(classifyMicError("문자열")).toBe("other");
  });
});
