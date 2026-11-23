import { describe, expect, it } from "vitest";
import {
  listenDays,
  listenedSecToday,
  minutesLabel,
  studyStreak,
} from "./listening";

const kst = (iso: string) => Date.parse(`${iso}+09:00`);

describe("listenedSecToday", () => {
  it("한국 날짜로 오늘 들은 초만 더한다(어제 밤 11시는 빼고 오늘 0시 10분은 넣는다)", () => {
    const events = [
      { startedAt: kst("2027-01-04T23:00"), listenedSec: 600 },
      { startedAt: kst("2027-01-05T00:10"), listenedSec: 300 },
      { startedAt: kst("2027-01-05T08:00"), listenedSec: 120.4 },
    ];
    expect(listenedSecToday(events, kst("2027-01-05T09:00"))).toBe(420);
  });
});

describe("listenDays", () => {
  it("들은 날을 한국 날짜로 겹치지 않게 차례대로 낸다", () => {
    expect(
      listenDays([
        { startedAt: kst("2027-01-05T08:00"), listenedSec: 1 },
        { startedAt: kst("2027-01-04T23:30"), listenedSec: 1 },
        { startedAt: kst("2027-01-05T20:00"), listenedSec: 1 },
      ]),
    ).toEqual(["2027-01-04", "2027-01-05"]);
  });
});

describe("studyStreak", () => {
  const days = new Set(["2027-01-01", "2027-01-02", "2027-01-03"]);

  it("오늘까지 이어서 한 날을 센다", () => {
    expect(studyStreak(days, kst("2027-01-03T20:00"))).toBe(3);
  });

  it("오늘 아직 안 했으면 어제까지를 센다", () => {
    expect(studyStreak(days, kst("2027-01-04T07:00"))).toBe(3);
  });

  it("어제도 안 했으면 0이다", () => {
    expect(studyStreak(days, kst("2027-01-05T07:00"))).toBe(0);
  });

  it("해가 바뀌는 날도 이어서 센다", () => {
    expect(
      studyStreak(
        new Set(["2026-12-31", "2027-01-01"]),
        kst("2027-01-01T09:00"),
      ),
    ).toBe(2);
  });
});

describe("minutesLabel", () => {
  it("0초면 아무것도 보이지 않게 null, 1분 미만은 따로, 그 위는 분으로 내림", () => {
    expect(minutesLabel(0)).toBeNull();
    expect(minutesLabel(45)).toBe("1분 미만");
    expect(minutesLabel(359)).toBe("5분");
  });
});
