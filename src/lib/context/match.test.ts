import { describe, expect, it } from "vitest";
import {
  bestCandidate,
  compatible,
  editDistance,
  matchSegment,
  normalizeJa,
  similarity,
  splitSentences,
  thresholdFor,
} from "./match";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

const cand = (...forms: string[]) => ({ forms: forms.map(normalizeJa) });

describe("비교용 글로 맞추기", () => {
  it("문장부호·공백을 빼고 가타카나는 히라가나로, 전각 숫자는 반각으로", () => {
    expect(normalizeJa("テスト、ですか？ １０じ。")).toBe("てすとですか10じ");
  });

  it("장음 ー는 글자로 남긴다", () => {
    expect(normalizeJa("ケーキ。")).toBe("けーき");
  });
});

describe("문장 끝마다 나누기", () => {
  it("。과 ?에서 나누고 빈 조각은 버린다", () => {
    expect(splitSentences("やまですか?はい、やまです。")).toEqual([
      "やまですか?",
      "はい、やまです。",
    ]);
  });

  it("문장부호만 남은 조각은 버린다", () => {
    expect(splitSentences("やま。……")).toEqual(["やま。"]);
  });
});

describe("닮은 정도", () => {
  it("편집 거리는 바꾸기·넣기·빼기 수다", () => {
    expect(editDistance("やまだ", "やまだよ")).toBe(1);
    expect(editDistance("", "やま")).toBe(2);
  });

  it("같으면 1, 한 글자 다르면 그만큼 낮다", () => {
    expect(similarity("やまだ", "やまだ")).toBe(1);
    expect(similarity("やまです", "やまでした")).toBeCloseTo(1 - 2 / 5);
  });

  it("자막이 소책자 문장의 맞장구를 빠뜨려도 빠진 비율만큼만 낮다", () => {
    expect(
      similarity("きょうはやまにいく", "うんきょうはやまにいく"),
    ).toBeCloseTo(9 / 11);
  });

  it("짧은 글일수록 기준이 엄격하다", () => {
    expect(thresholdFor(2)).toBe(1);
    expect(thresholdFor(6)).toBe(0.78);
    expect(thresholdFor(20)).toBe(0.7);
  });
});

describe("뜻이 다른 짝 거르기", () => {
  it("긍정과 부정이 뒤집히면 맞추지 않는다", () => {
    expect(compatible("やまにいった", "やまにいかなかった")).toBe(false);
    expect(compatible("やまにいきます", "やまにいきません")).toBe(false);
  });

  it("둘 다 한자가 있는데 같은 한자가 없으면 맞추지 않는다", () => {
    expect(compatible("今日は山です", "今日は川です")).toBe(true);
    expect(compatible("あしたは山", "あしたは川")).toBe(false);
  });

  it("한쪽만 한자면(가나로 받아 적은 자막) 따지지 않는다", () => {
    expect(compatible("あしたはやま", "あしたは山")).toBe(true);
  });
});

describe("조각마다 후보 고르기", () => {
  const candidates = [
    cand("今日は山へ行きます。"),
    cand("今日は川へ行きます。"),
    cand("はい。"),
  ];

  it("가장 닮은 후보를 고른다", () => {
    expect(
      bestCandidate([normalizeJa("今日は山へいきます")], candidates),
    ).toMatchObject({ index: 0 });
  });

  it("기준보다 덜 닮으면 -1", () => {
    expect(
      bestCandidate([normalizeJa("まったくちがうぶんしょう")], candidates)
        .index,
    ).toBe(-1);
  });

  it("두 글자 이하 조각은 똑같을 때만 맞춘다", () => {
    expect(bestCandidate([normalizeJa("はい")], candidates).index).toBe(2);
    expect(bestCandidate([normalizeJa("はあ")], candidates).index).toBe(-1);
  });

  it("두 문장이 붙은 자막 구간은 조각마다 맞춘다", () => {
    const pieces = matchSegment("はい。今日は川へ行きます。", candidates);
    expect(pieces.map((p) => p.index)).toEqual([2, 1]);
  });

  it("가나로 받아 적은 자막도 읽는 법으로 풀어 맞춘다", () => {
    const toKana = (t: string) => t.replace("山", "やま");
    const kanaCandidates = [
      cand("今日は山へ行きます。", "きょうはやまへいきます"),
    ];
    expect(
      matchSegment("きょうはやまへいきます", kanaCandidates, toKana)[0].index,
    ).toBe(0);
  });

  it("후보가 없으면 조각도 없다", () => {
    expect(matchSegment("はい。", [])).toEqual([]);
  });
});
