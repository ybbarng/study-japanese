import { describe, expect, it } from "vitest";
import {
  coveredByWords,
  misheardKoreanIndexes,
  placeholderText,
} from "./misheard";

// 강사의 한국어 말을 가타카나로 받아 적은 모양의 가짜 줄을 쓴다(교재 글이 아니다)

const known = new Set(["かーてん", "てれび", "ぴあの", "ふらんす", "いたりあ"]);
const ja = (text: string) => ({ text, lang: "ja" as const });
const ko = (text: string) => ({ text, lang: "ko" as const });
const hidden = (segments: { text: string; lang: "ja" | "ko" }[]) => [
  ...misheardKoreanIndexes(segments, known),
];

describe("한국어 말을 가타카나로 받아 적은 줄", () => {
  it("교재 단계 이름표(워밍업·회화)를 가타카나로 적은 줄을 찾는다", () => {
    expect(hidden([ja("ワーミングアップ")])).toEqual([0]);
    expect(hidden([ja("フェイファー?")])).toEqual([0]);
  });

  it("교재 낱말로 덮이지 않는 긴 가타카나 줄을 찾는다", () => {
    expect(hidden([ja("ハッキョカンダ、ゴヨムシッタ。")])).toEqual([0]);
  });

  it("앞뒤가 한국어 줄인 가나 4자 이상 가타카나 줄을 찾는다", () => {
    expect(
      hidden([ko("그래서"), ja("モクサンコ"), ko("해석하지 않고")]),
    ).toEqual([1]);
  });

  it("옆 한국어 줄의 한 토막과 소리가 닮은 가타카나 줄을 찾는다", () => {
    expect(hidden([ja("ナミダヨ"), ko("그건 나미다요 라고 해요")])).toEqual([
      0,
    ]);
  });

  it("교재 낱말인 외래어는 남긴다", () => {
    expect(hidden([ko("커튼"), ja("カーテン"), ko("이에요")])).toEqual([]);
    expect(hidden([ja("フランスイタリア")])).toEqual([]);
  });

  it("일본어 줄 사이의 짧은 가타카나 줄(잘못 들은 일본어일 수 있다)은 남긴다", () => {
    expect(hidden([ja("山へ行く"), ja("ヤマメ"), ja("山へ行く")])).toEqual([]);
  });

  it("히라가나·한자가 섞인 줄은 일본어로 보고 남긴다", () => {
    expect(hidden([ko("예를 들면"), ja("ピアノが好き"), ko("이렇게")])).toEqual(
      [],
    );
  });

  it("한국어 줄은 건드리지 않는다", () => {
    expect(hidden([ko("ワーミングアップ")])).toEqual([]);
  });
});

describe("아는 낱말로 빈틈없이 덮기", () => {
  it("낱말 둘을 이어 붙인 글은 덮인다", () => {
    expect(coveredByWords("ふらんすいたりあ", known)).toBe(true);
  });

  it("모르는 조각이 남으면 덮이지 않는다", () => {
    expect(coveredByWords("ふらんすこりあ", known)).toBe(false);
  });
});

describe("문형 설명의 한국어 자리 말", () => {
  it("ぬぐぬぐ·もも를 누구누구·뭐뭐로 돌린다", () => {
    expect(placeholderText("ぬぐぬぐのもも")).toBe("누구누구の뭐뭐");
  });

  it("ぬぐ가 없는 줄은 일본어일 수 있어 그대로 둔다", () => {
    expect(placeholderText("ももが好き")).toBeNull();
  });
});
