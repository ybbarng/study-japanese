import { describe, expect, it } from "vitest";
import {
  applyTaps,
  estimatePosition,
  moveCursor,
  nudge,
  startTaps,
  tap,
  undoTap,
} from "./tap-sync";

const lines = [
  { ja: "いち" },
  { ja: "に", start: 7 },
  { ja: "さん", start: 12, end: 15 },
];

describe("박자 맞추기 누르기", () => {
  it("저장된 시각에서 시작하고 커서는 첫 줄", () => {
    expect(startTaps(lines)).toEqual({ times: [undefined, 7, 12], cursor: 0 });
  });

  it("누르면 지금 줄에 시각(10ms 단위)을 적고 다음 줄로 넘어간다", () => {
    const s = tap(startTaps(lines), 1.234);
    expect(s).toEqual({ times: [1.23, 7, 12], cursor: 1 });
  });

  it("마지막 줄 뒤에서 누르면 아무것도 바뀌지 않는다", () => {
    const end = { times: [1, 2, 3], cursor: 3 };
    expect(tap(end, 9)).toBe(end);
  });

  it("되돌리면 커서만 앞 줄로 가고, 다시 누르면 그 줄 시각이 바뀐다", () => {
    const s = undoTap(tap(startTaps(lines), 1));
    expect(s).toEqual({ times: [1, 7, 12], cursor: 0 });
    expect(tap(s, 1.5).times[0]).toBe(1.5);
  });

  it("첫 줄에서 되돌려도 커서가 0 아래로 가지 않는다", () => {
    expect(undoTap(startTaps(lines)).cursor).toBe(0);
  });

  it("미세 조정은 시각을 앞뒤로 옮기되 0 아래로는 가지 않는다", () => {
    const s = startTaps(lines);
    expect(nudge(s, 1, 0.1).times[1]).toBe(7.1);
    expect(nudge(s, 1, -9).times[1]).toBe(0);
  });

  it("시각이 없는 줄은 미세 조정해도 그대로", () => {
    const s = startTaps(lines);
    expect(nudge(s, 0, 0.1)).toBe(s);
  });

  it("커서를 줄 범위 안으로만 옮긴다", () => {
    expect(moveCursor(startTaps(lines), 2).cursor).toBe(2);
    expect(moveCursor(startTaps(lines), 99).cursor).toBe(3);
  });
});

describe("applyTaps", () => {
  it("적은 시각을 줄에 넣고 메모 같은 다른 필드는 그대로 둔다", () => {
    const withNote = [{ ja: "いち", note: "메모" }, ...lines.slice(1)];
    expect(applyTaps(withNote, { times: [1, 7, 12], cursor: 3 })).toEqual([
      { ja: "いち", note: "메모", start: 1 },
      { ja: "に", start: 7 },
      { ja: "さん", start: 12, end: 15 },
    ]);
  });

  it("새 시작이 끝 시각보다 늦어지면 끝 시각을 뺀다", () => {
    expect(applyTaps(lines, { times: [1, 7, 16], cursor: 3 })[2]).toEqual({
      ja: "さん",
      start: 16,
    });
  });
});

describe("estimatePosition", () => {
  const sample = { pos: 10, at: 1000 };

  it("재생 중이면 마지막 알림 뒤 흐른 시간만큼 더한다(빠르기 반영)", () => {
    expect(estimatePosition(sample, 1200, 1, true)).toBeCloseTo(10.2);
    expect(estimatePosition(sample, 1200, 0.5, true)).toBeCloseTo(10.1);
  });

  it("알림이 오래 끊겨도 0.5초 넘게 더하지 않는다", () => {
    expect(estimatePosition(sample, 5000, 1, true)).toBeCloseTo(10.5);
  });

  it("멈춰 있으면 마지막 위치 그대로", () => {
    expect(estimatePosition(sample, 5000, 1, false)).toBe(10);
  });
});
