import { describe, expect, it } from "vitest";
import {
  type LockoutPolicy,
  lockedUntil,
  newLockout,
  recordFailure,
} from "./lockout";

const POLICY: LockoutPolicy = {
  windowMs: 60_000,
  maxFailures: 3,
  lockMs: 600_000,
};
const T = Date.UTC(2027, 0, 1);

function failAt(times: number[]) {
  return times.reduce((s, t) => recordFailure(s, t, POLICY), newLockout());
}

describe("로그인 잠금", () => {
  it("1분 안 실패가 상한 이하면 잠그지 않는다", () => {
    const s = failAt([T, T + 1000, T + 2000]);
    expect(lockedUntil(s, T + 2000)).toBeNull();
  });

  it("1분 안 실패가 상한을 넘으면 그때부터 10분 잠근다", () => {
    const s = failAt([T, T + 1000, T + 2000, T + 3000]);
    expect(lockedUntil(s, T + 3000)).toBe(T + 3000 + 600_000);
  });

  it("잠금 시간이 지나면 풀린다", () => {
    const s = failAt([T, T + 1, T + 2, T + 3]);
    expect(lockedUntil(s, T + 3 + 600_000)).toBeNull();
  });

  it("1분보다 띄엄띄엄 틀린 것은 쌓이지 않는다", () => {
    const s = failAt([T, T + 61_000, T + 122_000, T + 183_000]);
    expect(lockedUntil(s, T + 183_000)).toBeNull();
  });
});
