import { describe, expect, it } from "vitest";
import { parseRuby, rubyPlain, rubyReading } from "./ruby-text";

describe("ruby-text: [한자|읽기] 표기", () => {
  it("대괄호 안은 읽기를 단 조각, 밖은 그냥 글 조각으로 나눈다", () => {
    expect(parseRuby("[昨日|きのう]、テレビを")).toEqual([
      { text: "昨日", ruby: "きのう" },
      { text: "、テレビを" },
    ]);
  });

  it("표기가 없으면 글 한 조각", () => {
    expect(parseRuby("ねえ、")).toEqual([{ text: "ねえ、" }]);
  });

  it("보이는 글과 읽기 글을 따로 만든다", () => {
    expect(rubyPlain("[毎日|まいにち]、[本|ほん]を")).toBe("毎日、本を");
    expect(rubyReading("[毎日|まいにち]、[本|ほん]を")).toBe(
      "まいにち、ほんを",
    );
  });
});
