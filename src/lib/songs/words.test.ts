import { describe, expect, it } from "vitest";
import type { SongToken } from "./schema";
import {
  groupTokens,
  isPressable,
  naverDictUrl,
  posLabel,
  tokenRuby,
  wordReading,
} from "./words";

// 분석기(kuromoji IPA 사전)가 실제로 내는 모양을 따른 가짜 줄 "雨が降っていた。"
const furu: SongToken[] = [
  { surface: "雨", reading: "あめ", pos: "名詞", posDetail: "一般" },
  { surface: "が", pos: "助詞", posDetail: "格助詞" },
  {
    surface: "降っ",
    reading: "ふっ",
    base: "降る",
    pos: "動詞",
    posDetail: "自立",
  },
  { surface: "て", pos: "助詞", posDetail: "接続助詞" },
  { surface: "い", base: "いる", pos: "動詞", posDetail: "非自立" },
  { surface: "た", pos: "助動詞" },
  { surface: "。", pos: "記号", posDetail: "句点" },
];

describe("groupTokens", () => {
  it("동사 뒤의 て·보조 동사·조동사를 한 낱말로 묶고 기본형은 첫 조각에서 가져온다", () => {
    const words = groupTokens(furu);
    expect(words.map((w) => w.surface)).toEqual([
      "雨",
      "が",
      "降っていた",
      "。",
    ]);
    expect(words[2].base).toBe("降る");
    expect(words[2].pos).toBe("動詞");
  });

  it("명사 뒤 조동사(だ)는 묶지 않는다", () => {
    const words = groupTokens([
      { surface: "夢", reading: "ゆめ", pos: "名詞", posDetail: "一般" },
      { surface: "だ", pos: "助動詞" },
    ]);
    expect(words.map((w) => w.surface)).toEqual(["夢", "だ"]);
  });

  it("명사 뒤 접미어(さん)는 명사에 붙인다", () => {
    const words = groupTokens([
      {
        surface: "田中",
        reading: "たなか",
        pos: "名詞",
        posDetail: "固有名詞",
      },
      { surface: "さん", pos: "名詞", posDetail: "接尾" },
    ]);
    expect(words.map((w) => w.surface)).toEqual(["田中さん"]);
  });

  it("형용사 뒤 조동사도 묶는다", () => {
    const words = groupTokens([
      {
        surface: "寒く",
        reading: "さむく",
        base: "寒い",
        pos: "形容詞",
        posDetail: "自立",
      },
      { surface: "ない", pos: "助動詞" },
    ]);
    expect(words.map((w) => [w.surface, w.base])).toEqual([
      ["寒くない", "寒い"],
    ]);
  });

  it("들어온 조각 배열을 바꾸지 않는다", () => {
    const copy = structuredClone(furu);
    groupTokens(furu);
    expect(furu).toEqual(copy);
  });
});

describe("tokenRuby·wordReading", () => {
  it("한자 조각은 보내는 가나를 루비 밖으로 뺀다", () => {
    expect(tokenRuby(furu[2])).toEqual([
      { text: "降", reading: "ふ" },
      { text: "っ" },
    ]);
  });

  it("가나 조각은 글 그대로", () => {
    expect(tokenRuby(furu[1])).toEqual([{ text: "が" }]);
  });

  it("낱말 읽는 법은 조각 읽는 법(없으면 글)을 잇는다", () => {
    expect(wordReading(groupTokens(furu)[2])).toBe("ふっていた");
  });
});

describe("isPressable", () => {
  it("문장 부호와 공백은 누르지 않는다", () => {
    const [ame, , , maru] = groupTokens(furu);
    expect(isPressable(ame)).toBe(true);
    expect(isPressable(maru)).toBe(false);
    expect(
      isPressable({ surface: " ", base: " ", pos: "名詞", tokens: [] }),
    ).toBe(false);
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
