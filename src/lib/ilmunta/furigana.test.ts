import { describe, expect, it } from "vitest";
import { furigana } from "./furigana";

describe("furigana", () => {
  it("한자 덩어리에만 읽기를 단다", () => {
    expect(furigana("飲んで", "のんで")).toEqual([
      { text: "飲", ruby: "の" },
      { text: "んで" },
    ]);
  });

  it("한자 덩어리가 여럿이어도 나눈다", () => {
    expect(furigana("持って来る", "もってくる")).toEqual([
      { text: "持", ruby: "も" },
      { text: "って" },
      { text: "来", ruby: "く" },
      { text: "る" },
    ]);
  });

  it("가나뿐이면 읽기를 달지 않는다", () => {
    expect(furigana("いる", "いる")).toEqual([{ text: "いる" }]);
  });

  it("맞대지 못하면 통째로 읽기를 단다", () => {
    expect(furigana("今日", "きょう")).toEqual([
      { text: "今日", ruby: "きょう" },
    ]);
    expect(furigana("飲む", "たべる")).toEqual([
      { text: "飲む", ruby: "たべる" },
    ]);
  });
});
