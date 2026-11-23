import { describe, expect, it } from "vitest";
import { toSongToken } from "./tokens";

// kuromoji(IPA 사전)가 실제로 내는 조각 모양
function raw(over: Partial<Parameters<typeof toSongToken>[0]>) {
  return {
    surface_form: "降っ",
    pos: "動詞",
    pos_detail_1: "自立",
    basic_form: "降る",
    reading: "フッ",
    ...over,
  };
}

describe("toSongToken", () => {
  it("한자 조각은 가타카나 읽는 법을 히라가나로 바꾸고 기본형·품사를 남긴다", () => {
    expect(toSongToken(raw({}))).toEqual({
      surface: "降っ",
      reading: "ふっ",
      base: "降る",
      pos: "動詞",
      posDetail: "自立",
    });
  });

  it("가나 조각에는 읽는 법을 두지 않고, 기본형이 겉모양과 같으면 빼다", () => {
    expect(
      toSongToken(
        raw({
          surface_form: "が",
          pos: "助詞",
          pos_detail_1: "格助詞",
          basic_form: "が",
          reading: "ガ",
        }),
      ),
    ).toEqual({ surface: "が", pos: "助詞", posDetail: "格助詞" });
  });

  it("사전에 없는 낱말(읽는 법 없음, 값 *)은 겉모양과 품사만", () => {
    expect(
      toSongToken({
        surface_form: "ＸＹＺ",
        pos: "名詞",
        pos_detail_1: "*",
        basic_form: "*",
      }),
    ).toEqual({ surface: "ＸＹＺ", pos: "名詞" });
  });

  it("가타카나 낱말은 읽는 법을 두지 않는다", () => {
    expect(
      toSongToken(
        raw({
          surface_form: "テスト",
          basic_form: "テスト",
          reading: "テスト",
          pos: "名詞",
        }),
      ),
    ).toEqual({ surface: "テスト", pos: "名詞", posDetail: "自立" });
  });
});
