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

describe("playQueue의 처음 자리", () => {
  const track = {
    book: "ilmuta",
    item: "03-3",
    kind: "example",
    title: "시험 예문",
    src: "/media/ilmuta/03-3.mp3",
  } as const;

  beforeEach(() => {
    usePlayer.setState({ loadToken: 0, startAt: null, queue: [], index: 0 });
  });

  it("같은 트랙을 다시 올려도 이번 불러오기의 처음 자리로 새 자리를 남긴다", () => {
    usePlayer.getState().playQueue([track], 0, 3);
    usePlayer.getState().playQueue([track], 0, 9);
    expect(usePlayer.getState().startAt).toEqual({ sec: 9, token: 2 });
    expect(usePlayer.getState().loadToken).toBe(2);
  });

  it("처음 자리 없이 올리면 앞서 남긴 자리를 지워 처음부터 튼다", () => {
    usePlayer.getState().playQueue([track], 0, 9);
    usePlayer.getState().playQueue([track]);
    expect(usePlayer.getState().startAt).toBeNull();
  });
});
