import { describe, expect, it } from "vitest";
import { drillSpeech } from "./speech";

describe("drillSpeech", () => {
  it("문장 빈칸 문제는 정답을 채운 문장을, 음성용은 한자 글로·잇기용은 읽기로 준다", () => {
    expect(
      drillSpeech({
        answer: { kanji: "飲んだ", reading: "のんだ" },
        sentence: {
          frameId: "f1",
          before: "[昨日|きのう]、お[茶|ちゃ]を",
          after: "。",
          ko: "어제 차를 마셨다.",
        },
      }),
    ).toEqual({
      text: "昨日、お茶を飲んだ。",
      kana: "きのう、おちゃをのんだ。",
    });
  });

  it("활용표 문제는 정답 꼴만 읽는다", () => {
    expect(
      drillSpeech({ answer: { kanji: "食べない", reading: "たべない" } }),
    ).toEqual({ text: "食べない", kana: "たべない" });
  });
});
