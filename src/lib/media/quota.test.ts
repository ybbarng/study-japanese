import { describe, expect, it } from "vitest";
import { kstDay, secondsUntilKstMidnight, sessionKey } from "./quota";

describe("한국 날짜", () => {
  it("UTC 15시는 한국 다음 날 0시다", () => {
    expect(kstDay(Date.UTC(2026, 11, 31, 14, 59))).toBe("2026-12-31");
    expect(kstDay(Date.UTC(2026, 11, 31, 15, 0))).toBe("2027-01-01");
  });

  it("한국 23시 30분이면 자정까지 30분", () => {
    expect(secondsUntilKstMidnight(Date.UTC(2027, 0, 1, 14, 30))).toBe(1800);
  });
});

describe("sessionKey", () => {
  it("쿠키 값을 그대로 두지 않고 짧은 해시로 바꾼다", () => {
    const key = sessionKey("1798761600000.abcdef");
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(key).not.toContain("abcdef");
  });

  it("쿠키가 없으면 하나의 익명 세션으로 센다", () => {
    expect(sessionKey(undefined)).toBe("anonymous");
  });
});
