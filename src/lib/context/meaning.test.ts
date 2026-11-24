import { describe, expect, it } from "vitest";
import type { CueWord } from "./cards";
import { jamoDistance, repairMeaning } from "./meaning";

// 교재 문장이 아니라 모양만 같은 가짜 뜻을 쓴다(저장소 규칙)

const word = (ja: string, ko: string): CueWord => ({ ja, ko });

describe("자모 차이", () => {
  it("모음 하나, 받침 하나 다른 말은 1", () => {
    expect(jamoDistance("선물", "산물")).toBe(1);
    expect(jamoDistance("사과", "사관")).toBe(1);
  });

  it("길이가 다르면 비교하지 않는다(무한)", () => {
    expect(jamoDistance("사과", "사과나무")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("받아 적은 뜻의 오타 바로잡기", () => {
  it("문장에 든 낱말 뜻과 자모 하나 다른 말을 낱말 뜻으로 바꾼다", () => {
    expect(
      repairMeaning("어제 산물을 받았다.", [word("プレゼント", "선물")]),
    ).toBe("어제 선물을 받았다.");
  });

  it("바꾼 말의 받침에 맞게 뒤 조사를 고친다", () => {
    expect(repairMeaning("그 사관은 빨갛다.", [word("りんご", "사과")])).toBe(
      "그 사과는 빨갛다.",
    );
  });

  it("낱말 뜻이 이미 있으면 그대로 둔다", () => {
    expect(repairMeaning("선물을 받았다.", [word("プレゼント", "선물")])).toBe(
      "선물을 받았다.",
    );
  });

  it("조사가 줄어 붙은 대명사(누가)·합성어(아드+님)는 오타로 보지 않는다", () => {
    expect(repairMeaning("누가 왔어?", [word("誰", "누구")])).toBe(
      "누가 왔어?",
    );
    expect(repairMeaning("아드님은 학생이다.", [word("息子", "아들")])).toBe(
      "아드님은 학생이다.",
    );
  });

  it("동사·명사형 서술어 뜻(~다·~임)은 활용해서 모양이 바뀌므로 쓰지 않는다", () => {
    expect(repairMeaning("날씨가 맑으면 간다.", [word("晴れ", "맑음")])).toBe(
      "날씨가 맑으면 간다.",
    );
    expect(repairMeaning("물을 마셔요.", [word("飲む", "마시다")])).toBe(
      "물을 마셔요.",
    );
  });
});
