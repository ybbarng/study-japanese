import { describe, expect, it } from "vitest";
import { autoVerdict, packsToFetch, upcomingLessons } from "./auto";

describe("자동 받기를 지금 할지", () => {
  it("설정을 켜고 와이파이면 받는다", () => {
    expect(autoVerdict(true, { type: "wifi" })).toBe("go");
  });

  it("모바일 데이터면 받지 않는다", () => {
    expect(autoVerdict(true, { type: "cellular" })).toBe("notWifi");
  });

  it("와이파이여도 데이터 절약 모드면 받지 않는다", () => {
    expect(autoVerdict(true, { type: "wifi", saveData: true })).toBe("notWifi");
  });

  it("브라우저가 연결 종류를 알려 주지 않으면(데스크톱 Chrome) 받지 않는다", () => {
    expect(autoVerdict(true, {})).toBe("unknown");
    expect(autoVerdict(true, undefined)).toBe("unknown");
  });

  it("설정을 꺼 두면 연결과 상관없이 받지 않는다", () => {
    expect(autoVerdict(false, { type: "wifi" })).toBe("off");
  });
});

describe("이어서 할 강 고르기", () => {
  const nos = [0, 1, 2, 3, 4, 5];

  it("이어서 할 강부터 끝내지 않은 강 2개를 고른다", () => {
    const done = new Set([0, 1, 3]);
    expect(upcomingLessons(nos, (n) => done.has(n), 2)).toEqual([2, 4]);
  });

  it("시작점이 없으면 처음부터 찾는다", () => {
    expect(upcomingLessons(nos, () => false, null)).toEqual([0, 1]);
  });

  it("남은 강이 하나면 하나만 고른다", () => {
    expect(upcomingLessons(nos, (n) => n < 5, 5)).toEqual([5]);
  });

  it("이미 받아 둔 묶음은 빼고 받는다", () => {
    const packs = [{ id: "ilmuta-2" }, { id: "ilmuta-3" }];
    expect(packsToFetch(packs, new Set(["ilmuta-2"]))).toEqual([
      { id: "ilmuta-3" },
    ]);
  });
});
