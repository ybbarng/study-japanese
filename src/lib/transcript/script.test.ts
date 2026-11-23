import { describe, expect, it } from "vitest";
import { countScripts, hangulShare, japaneseShare } from "./script";

describe("글자 종류 세기", () => {
  it("한글·가나·한자·로마자를 따로 세고 숫자·부호는 세지 않는다", () => {
    expect(countScripts("가나 あア 漢 ab 12!")).toEqual({
      hangul: 2,
      kana: 2,
      kanji: 1,
      latin: 2,
      letters: 7,
    });
  });

  it("일본어 글자 몫은 가나와 한자를 더해 글자 수로 나눈다", () => {
    expect(japaneseShare("ねこ犬가")).toBe(0.75);
  });

  it("한글 몫은 한글을 글자 수로 나눈다", () => {
    expect(hangulShare("가나다a")).toBe(0.75);
  });

  it("글자가 없으면 몫은 0이다", () => {
    expect(japaneseShare("?! 12")).toBe(0);
    expect(hangulShare("")).toBe(0);
  });
});
