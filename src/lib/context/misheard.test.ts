import { describe, expect, it } from "vitest";
import {
  coveredByWords,
  fillJamo,
  kanaHints,
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

describe("한국어 줄에 남은 한글 낱자", () => {
  it("강 부제의 가나 가운데 소리 갈래가 맞는 것을 차례대로 채운다", () => {
    expect(fillJamo("ㄱ, ㄱ로 끝나는 동사", ["く", "ぐ", "う"])).toBe(
      "く, ぐ로 끝나는 동사",
    );
  });

  it("맞는 가나가 없으면 …로 가린다", () => {
    expect(fillJamo("조사는 ㄱ라고 합니다", [])).toBe("조사는 …라고 합니다");
    expect(fillJamo("ㄴ로 끝나는", ["く"])).toBe("…로 끝나는");
  });

  it("끝소리를 말하는 줄이 아니면 가나로 채우지 않고 가린다(한국어 어미일 수 있다)", () => {
    expect(fillJamo("부정은 ㄴ다라고 해요", ["ぬ"])).toBe(
      "부정은 …다라고 해요",
    );
  });

  it("한글 자모를 설명하는 곳과 낱자가 없는 줄은 그대로 둔다", () => {
    expect(fillJamo("ㅈ의 발음은 어렵습니다", [])).toBeNull();
    expect(fillJamo("끝나는 동사", ["く"])).toBeNull();
  });

  it("강 부제에서 가나 하나짜리 낱말만 뽑는다", () => {
    expect(kanaHints("끝소리가 く, ぐ와 う인 동사")).toEqual([
      "く",
      "ぐ",
      "う",
    ]);
    expect(kanaHints("ます형 만들기")).toEqual([]);
    expect(kanaHints(undefined)).toEqual([]);
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
