import { describe, expect, it } from "vitest";
import { pickWordClip, type SoundCandidate } from "./word-sound";

const ex = (
  id: string,
  wordCard: boolean,
  length: number,
  cue: SoundCandidate["cue"],
) => ({ id, wordCard, length, cue });

describe("pickWordClip", () => {
  it("구간을 찾은 단어 카드가 있으면 더 짧은 문장보다 먼저 고른다", () => {
    const got = pickWordClip([
      ex("문장", false, 4, { start: 1, end: 2 }),
      ex("카드", true, 6, { start: 5, end: 6 }),
    ]);
    expect(got?.id).toBe("카드");
  });

  it("단어 카드 구간이 없으면 낱말이 든 문장 가운데 가장 짧은 것을 고른다", () => {
    const got = pickWordClip([
      ex("카드-구간없음", true, 2, null),
      ex("긴 문장", false, 20, { start: 1, end: 4 }),
      ex("짧은 문장", false, 8, { start: 9, end: 11 }),
    ]);
    expect(got?.id).toBe("짧은 문장");
  });

  it("구간을 찾은 예문이 하나도 없으면 null이라 기계 음성으로 읽는다", () => {
    expect(pickWordClip([ex("카드", true, 2, null)])).toBeNull();
    expect(pickWordClip([])).toBeNull();
  });
});
