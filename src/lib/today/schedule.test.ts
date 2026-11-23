import { describe, expect, it } from "vitest";
import { daysUntilStart, focusBook, monthGoal, monthQuota } from "./schedule";

/** 서울 시각 → ms */
const kst = (iso: string) => Date.parse(`${iso}+09:00`);

describe("daysUntilStart", () => {
  it("12월 31일 밤 11시 59분에는 하루 남았다", () => {
    expect(daysUntilStart(kst("2026-12-31T23:59"))).toBe(1);
  });

  it("1월 1일 0시부터는 0이다", () => {
    expect(daysUntilStart(kst("2027-01-01T00:00"))).toBe(0);
  });

  it("서버가 UTC로 돌아 UTC 날짜가 12월 31일이어도 한국 1월 1일 아침이면 0이다", () => {
    expect(daysUntilStart(Date.UTC(2026, 11, 31, 23, 0))).toBe(0);
  });

  it("11월 23일에는 39일 남았다", () => {
    expect(daysUntilStart(kst("2026-11-23T12:00"))).toBe(39);
  });
});

describe("monthGoal", () => {
  it("1분기는 일무따, 2분기는 일문따를 달마다 나눠 끝낸다", () => {
    expect(monthGoal(2027, 1)).toEqual({ book: "ilmuta", from: 0, to: 18 });
    expect(monthGoal(2027, 2)).toEqual({ book: "ilmuta", from: 19, to: 38 });
    expect(monthGoal(2027, 3)).toEqual({ book: "ilmuta", from: 39, to: 60 });
    expect(monthGoal(2027, 4)).toEqual({ book: "ilmunta", from: 1, to: 24 });
    expect(monthGoal(2027, 5)).toEqual({ book: "ilmunta", from: 25, to: 41 });
    expect(monthGoal(2027, 6)).toEqual({ book: "ilmunta", from: 42, to: 56 });
  });

  it("7월부터와 시작 전 해에는 목표가 없다", () => {
    expect(monthGoal(2027, 7)).toBeNull();
    expect(monthGoal(2026, 12)).toBeNull();
  });
});

describe("focusBook", () => {
  it("3월 31일까지는 일무따, 4월 1일부터 일문따", () => {
    expect(focusBook(kst("2027-03-31T23:00"))).toBe("ilmuta");
    expect(focusBook(kst("2027-04-01T07:00"))).toBe("ilmunta");
  });
});

describe("monthQuota", () => {
  const jan = { book: "ilmuta" as const, from: 0, to: 18 };

  it("1월 1일에 하나도 안 했으면 19강을 31일에 나눠 하루 1강", () => {
    expect(monthQuota(jan, new Set(), kst("2027-01-01T08:00"))).toEqual({
      goal: jan,
      done: 0,
      total: 19,
      remaining: 19,
      daysLeft: 31,
      perDay: 1,
    });
  });

  it("범위 밖에서 끝낸 강은 세지 않는다", () => {
    const q = monthQuota(jan, new Set([0, 1, 25]), kst("2027-01-10T08:00"));
    expect(q.done).toBe(2);
  });

  it("말일에는 남은 날이 오늘 하루라 남은 것을 모두 하루 몫으로 본다", () => {
    const q = monthQuota(jan, new Set([0, 1, 2]), kst("2027-01-31T21:00"));
    expect(q).toMatchObject({ daysLeft: 1, remaining: 16, perDay: 16 });
  });

  it("2월은 28일까지라 2월 15일에는 14일 남았다", () => {
    const feb = { book: "ilmuta" as const, from: 19, to: 38 };
    expect(monthQuota(feb, new Set(), kst("2027-02-15T08:00")).daysLeft).toBe(
      14,
    );
  });

  it("다 끝냈으면 하루 몫은 0이다", () => {
    const all = new Set(Array.from({ length: 19 }, (_, i) => i));
    expect(monthQuota(jan, all, kst("2027-01-20T08:00")).perDay).toBe(0);
  });
});
