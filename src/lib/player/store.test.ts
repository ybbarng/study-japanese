import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayer } from "./store";

describe("seekTo", () => {
  beforeEach(() => {
    usePlayer.setState({ seekRequest: null, wantPlaying: false });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-05T08:00:00+09:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("누를 때마다 새 요청으로 쌓여 같은 위치를 두 번 눌러도 다시 옮긴다", () => {
    usePlayer.getState().seekTo(12.5);
    usePlayer.getState().seekTo(12.5);
    expect(usePlayer.getState().seekRequest).toEqual({
      sec: 12.5,
      token: 2,
      at: Date.parse("2027-01-05T08:00:00+09:00"),
    });
  });

  it("A–B 반복을 걸면 한 문장 반복이 풀리고, 한 문장 반복을 걸면 A–B가 풀린다", () => {
    const cue = { book: "ilmuta", item: "L03", start: 10, end: 14 };
    const ab = { book: "ilmuta", item: "L03", a: 20, b: 25 };
    usePlayer.getState().setCueLoop(cue);
    usePlayer.getState().setAbLoop(ab);
    expect(usePlayer.getState().cueLoop).toBeNull();
    expect(usePlayer.getState().abLoop).toEqual(ab);
    usePlayer.getState().setCueLoop(cue);
    expect(usePlayer.getState().abLoop).toBeNull();
    expect(usePlayer.getState().cueLoop).toEqual(cue);
  });

  it("멈춰 있었으면 그 위치부터 재생하도록 바꾼다", () => {
    usePlayer.getState().seekTo(3);
    expect(usePlayer.getState().wantPlaying).toBe(true);
  });
});
