import { describe, expect, it } from "vitest";
import { rubyFromReading } from "./reading-ruby";

// 가짜 문장(교재 글이 아니다)

describe("문장 읽는 법을 한자 덩어리마다 나눠 달기", () => {
  it("가나 부분을 닻으로 한자 덩어리의 읽기를 가른다", () => {
    expect(rubyFromReading("山のカメラ。", "やまのかめら", {})).toEqual([
      { text: "山", reading: "やま" },
      { text: "のカメラ。" },
    ]);
  });

  it("한자 덩어리가 여럿이어도 사이에 가나가 있으면 가른다", () => {
    expect(rubyFromReading("山へ川を見た", "やまへかわをみた", {})).toEqual([
      { text: "山", reading: "やま" },
      { text: "へ" },
      { text: "川", reading: "かわ" },
      { text: "を" },
      { text: "見", reading: "み" },
      { text: "た" },
    ]);
  });

  it("가나 없이 붙은 한자 덩어리 둘은 낱말 표에 읽기가 있을 때만 가른다", () => {
    expect(rubyFromReading("山、川だ", "やまかわだ", { 山: "やま" })).toEqual([
      { text: "山", reading: "やま" },
      { text: "、" },
      { text: "川", reading: "かわ" },
      { text: "だ" },
    ]);
    // 낱말 표에 없으면 어디서 끊을지 몰라 읽는 법을 달지 않는다
    expect(rubyFromReading("山、川だ", "やまかわだ", {})).toEqual([
      { text: "山、川だ" },
    ]);
  });

  it("읽는 법이 가나 부분과 어긋나면 달지 않는다", () => {
    expect(rubyFromReading("山のカメラ", "やまがかめら", {})).toEqual([
      { text: "山のカメラ" },
    ]);
  });

  it("읽는 법이 없으면 자리가 확인된 낱말의 읽기만 단다", () => {
    expect(rubyFromReading("山のカメラ", null, { 山: "やま" })).toEqual([
      { text: "山", reading: "やま" },
      { text: "のカメラ" },
    ]);
  });
});
