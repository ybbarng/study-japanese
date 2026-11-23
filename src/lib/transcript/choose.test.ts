import { describe, expect, it } from "vitest";
import { pickChunk, planRerun } from "./choose";
import type { ChunkResult } from "./whisper-json";

/** 조각 하나의 whisper 결과(조각 안 시각 0~1초) */
function result(lang: string, text: string, meanLogProb = -0.1): ChunkResult {
  return { lang, segments: [{ start: 0, end: 1, text }], meanLogProb };
}

describe("다시 전사할 조각 고르기", () => {
  it("ko로 감지되고 한글이 나온 조각은 다시 듣지 않는다", () => {
    expect(planRerun(result("ko", "고양이예요"))).toEqual({
      ko: false,
      ja: false,
    });
  });

  it("ko로 감지됐는데 일본어 글이 대부분이면 ja로 다시 듣는다", () => {
    expect(planRerun(result("ko", "ねこじゃない!"))).toEqual({
      ko: false,
      ja: true,
    });
  });

  it("한국어 설명 속에 일본어 낱말이 조금 섞인 것은 그대로 둔다", () => {
    expect(planRerun(result("ko", "이럴 때는 ねこ라고 하면 돼요"))).toEqual({
      ko: false,
      ja: false,
    });
  });

  it("ja로 감지됐는데 한글이 대부분이면 ko로 다시 듣는다", () => {
    expect(planRerun(result("ja", "고양이"))).toEqual({ ko: true, ja: false });
  });

  it("ko·ja 밖으로 감지되면 둘 다 다시 듣는다", () => {
    expect(planRerun(result("en", "Neko"))).toEqual({ ko: true, ja: true });
  });

  it("1차 글이 환각 문구면 언어가 맞아도 둘 다 다시 듣는다", () => {
    expect(planRerun(result("ko", "한글자막 by 아무개"))).toEqual({
      ko: true,
      ja: true,
    });
  });

  it("글이 비면 다시 듣지 않는다", () => {
    expect(planRerun({ lang: "ko", segments: [], meanLogProb: -0.1 })).toEqual({
      ko: false,
      ja: false,
    });
  });
});

describe("조각 언어와 글 고르기", () => {
  it("다시 듣지 않은 ko 조각은 1차 결과를 ko로 쓴다", () => {
    const auto = result("ko", "고양이예요");
    expect(pickChunk(auto, {})).toEqual({ lang: "ko", result: auto });
  });

  it("다시 듣지 않은 ja 조각은 1차 결과를 ja로 쓴다", () => {
    const auto = result("ja", "ねこだ");
    expect(pickChunk(auto, {})).toEqual({ lang: "ja", result: auto });
  });

  it("ko로 감지됐지만 일본어 글이 나온 조각은 ja로 다시 들은 글을 쓴다", () => {
    const ja = result("ja", "ねこじゃない");
    expect(pickChunk(result("ko", "ネコジャナイ!"), { ja })).toEqual({
      lang: "ja",
      result: ja,
    });
  });

  it("ja로 감지됐지만 한글이 나온 조각은 ko로 다시 들은 글을 쓴다", () => {
    const ko = result("ko", "고양이");
    expect(pickChunk(result("ja", "고양이"), { ko })).toEqual({
      lang: "ko",
      result: ko,
    });
  });

  describe("ko·ja 밖으로 감지된 조각", () => {
    const auto = result("en", "Mmm.");

    it("ko로 들었는데도 일본어 글이 나오면 ja 쪽을 쓴다", () => {
      const ja = result("ja", "ねこ", -0.9);
      expect(pickChunk(auto, { ko: result("ko", "ネコ", -0.1), ja })).toEqual({
        lang: "ja",
        result: ja,
      });
    });

    it("ja로 들었는데도 한글이 나오면 ko 쪽을 쓴다", () => {
      const ko = result("ko", "고양이", -0.9);
      expect(pickChunk(auto, { ko, ja: result("ja", "고양이", -0.1) })).toEqual(
        { lang: "ko", result: ko },
      );
    });

    it("둘 다 제 글자로 나오면 ja 확률이 ko보다 0.15 넘게 낮을 때만 ko를 쓴다", () => {
      const ko = result("ko", "응", -0.2);
      const jaClose = result("ja", "うん", -0.3);
      const jaFar = result("ja", "うん", -0.4);
      expect(pickChunk(auto, { ko, ja: jaClose })).toEqual({
        lang: "ja",
        result: jaClose,
      });
      expect(pickChunk(auto, { ko, ja: jaFar })).toEqual({
        lang: "ko",
        result: ko,
      });
    });

    it("한쪽 글이 환각이면 다른 쪽을 쓴다", () => {
      const ko = result("ko", "응");
      expect(
        pickChunk(auto, { ko, ja: result("ja", "次の動画でお会いしましょう") }),
      ).toEqual({
        lang: "ko",
        result: ko,
      });
    });

    it("둘 다 쓸 수 없으면 조각을 버린다", () => {
      expect(
        pickChunk(auto, {
          ko: result("ko", "(음악)"),
          ja: result("ja", "[音楽]"),
        }),
      ).toBeUndefined();
    });
  });

  it("고른 글이 로마자뿐이면 들은 언어를 이름으로 쓴다", () => {
    const auto = result("ko", "Warming up.");
    expect(pickChunk(auto, {})?.lang).toBe("ko");
  });
});
