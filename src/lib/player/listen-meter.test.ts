import { describe, expect, it } from "vitest";
import { isCompleted, newMeter, resetPosition, tick } from "./listen-meter";

function play(positions: number[]) {
  return positions.reduce(tick, newMeter());
}

describe("들은 시간 재기", () => {
  it("0.25초씩 나아가는 재생은 나아간 만큼 더한다", () => {
    expect(play([0, 0.25, 0.5, 0.75, 1]).listenedSec).toBeCloseTo(1);
  });

  it("앞으로 감기로 크게 뛴 구간은 더하지 않는다", () => {
    expect(play([0, 0.5, 30, 30.5]).listenedSec).toBeCloseTo(1);
  });

  it("뒤로 감기는 더하지 않고, 그 뒤 다시 들은 만큼은 더한다", () => {
    expect(play([10, 10.5, 5, 5.5]).listenedSec).toBeCloseTo(1);
  });

  it("멈췄다 다시 재생하면 그 지점부터 다시 잰다", () => {
    const paused = resetPosition(play([0, 1, 2]));
    expect([2, 2.5].reduce(tick, paused).listenedSec).toBeCloseTo(2.5);
  });
});

describe("끝까지 들었는지", () => {
  it("길이의 90% 이상 들었으면 끝까지 들은 것으로 본다", () => {
    expect(isCompleted(32, 35)).toBe(true);
    expect(isCompleted(31, 35)).toBe(false);
  });

  it("길이를 모르면(메타데이터 전) 끝까지 들은 것으로 보지 않는다", () => {
    expect(isCompleted(100, Number.NaN)).toBe(false);
  });
});
