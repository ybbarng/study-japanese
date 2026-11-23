import { describe, expect, it } from "vitest";
import { learnedThrough } from "@/lib/kana/lessons";
import { sentencePieces } from "./pieces";
import { isReadable, moraCount } from "./readable";

const throughH1 = learnedThrough("h1"); // あ행·か행
const throughH5 = learnedThrough("h5"); // 히라가나 기본 46자

describe("isReadable", () => {
  it("배운 글자만 있으면 읽을 수 있다", () => {
    expect(isReadable(sentencePieces("あかい。", {}), throughH1)).toBe(true);
  });

  it("아직 안 배운 글자가 하나라도 있으면 읽을 수 없다", () => {
    expect(isReadable(sentencePieces("あさ", {}), throughH1)).toBe(false);
  });

  it("탁음은 기본 46자만 배웠을 때 읽을 수 없다", () => {
    expect(isReadable(sentencePieces("はなし", {}), throughH5)).toBe(true);
    expect(isReadable(sentencePieces("かぎ", {}), throughH5)).toBe(false);
  });

  it("한자는 읽는 법을 배운 글자로 읽을 수 있을 때만 통과한다", () => {
    expect(isReadable(sentencePieces("山", { 山: "やま" }), throughH5)).toBe(
      true,
    );
    expect(isReadable(sentencePieces("山", {}), throughH5)).toBe(false);
    expect(isReadable(sentencePieces("鍵", { 鍵: "かぎ" }), throughH5)).toBe(
      false,
    );
  });

  it("같은 소리라도 가타카나를 안 배웠으면 가타카나 글자는 읽을 수 없다", () => {
    expect(isReadable(sentencePieces("アイ", {}), throughH5)).toBe(false);
    expect(isReadable(sentencePieces("アイ", {}), learnedThrough("k1"))).toBe(
      true,
    );
  });

  it("부호만 있는 줄은 읽을 문장으로 치지 않는다", () => {
    expect(isReadable(sentencePieces("……", {}), throughH5)).toBe(false);
  });
});

describe("moraCount", () => {
  it("요음은 한 박, 한자는 읽는 법의 박 수로 센다", () => {
    expect(moraCount(sentencePieces("きょう", {}))).toBe(2);
    expect(moraCount(sentencePieces("山の", { 山: "やま" }))).toBe(3);
  });
});
