import { describe, expect, it } from "vitest";
import { listenText, roughDuration } from "./format";

describe("오디오 길이", () => {
  it("1분 안쪽은 초로", () => {
    expect(roughDuration(37.6)).toBe("38초");
  });

  it("1분 넘으면 반올림한 분으로", () => {
    expect(roughDuration(591.7)).toBe("10분");
  });
});

describe("들은 횟수 글", () => {
  it("기록이 없으면 아직 안 들음", () => {
    expect(listenText(undefined)).toBe("아직 안 들음");
  });

  it("끝까지 들은 횟수가 있으면 함께 쓴다", () => {
    expect(listenText({ plays: 3, completedPlays: 1 })).toBe(
      "3번 들음 · 끝까지 1번",
    );
  });

  it("끝까지 듣지 않았으면 재생 횟수만", () => {
    expect(listenText({ plays: 2, completedPlays: 0 })).toBe("2번 들음");
  });
});
