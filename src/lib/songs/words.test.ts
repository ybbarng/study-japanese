import { describe, expect, it } from "vitest";
import {
  isPressable,
  naverDictUrl,
  posLabel,
  toWords,
  wordReading,
  wordRuby,
} from "./words";

// 지어낸 줄 "雨が降っていた。"를 분석 위치대로 자른 화면 조각
const [ame, ga, futteita, maru] = toWords([
  { surface: "雨", reading: "あめ", pos: "名詞", gloss: "비" },
  { surface: "が", pos: "助詞" },
  { surface: "降っていた", reading: "ふっていた", base: "降る", pos: "動詞" },
  { surface: "。" },
]);

describe("toWords", () => {
  it("기본형이 없으면 겉모양을 사전에서 찾을 꼴로 쓴다", () => {
    expect(ame.base).toBe("雨");
    expect(futteita.base).toBe("降る");
  });
});

describe("wordRuby·wordReading", () => {
  it("한자 낱말은 앞뒤 가나를 루비 밖으로 뺀다", () => {
    expect(wordRuby(futteita)).toEqual([
      { text: "降", reading: "ふ" },
      { text: "っていた" },
    ]);
  });

  it("가나 낱말은 글 그대로", () => {
    expect(wordRuby(ga)).toEqual([{ text: "が" }]);
  });

  it("읽는 법이 없으면 글 그대로 읽는다", () => {
    expect(wordReading(futteita)).toBe("ふっていた");
    expect(wordReading(ga)).toBe("が");
  });
});

describe("isPressable", () => {
  it("문장 부호·공백은 품사가 없어도 누르지 않는다", () => {
    expect(isPressable(ame)).toBe(true);
    expect(isPressable(maru)).toBe(false);
    expect(isPressable({ surface: "　" })).toBe(false);
    expect(isPressable({ surface: "…!" })).toBe(false);
  });

  it("분석이 없는 글(plain)은 누르지 않는다", () => {
    expect(isPressable({ surface: "が", plain: true })).toBe(false);
  });

  it("품사가 記号면 누르지 않는다", () => {
    expect(isPressable({ surface: "ア", pos: "記号" })).toBe(false);
  });
});

describe("posLabel·naverDictUrl", () => {
  it("품사를 한국어로 쓰고 모르는 품사는 그대로", () => {
    expect(posLabel("動詞")).toBe("동사");
    expect(posLabel("その他")).toBe("その他");
    expect(posLabel(undefined)).toBe("");
  });

  it("네이버 일본어사전 검색 주소에 낱말을 주소 인코딩해 넣는다", () => {
    expect(naverDictUrl("降る")).toBe(
      "https://ja.dict.naver.com/#/search?query=%E9%99%8D%E3%82%8B",
    );
  });
});
