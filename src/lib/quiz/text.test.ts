import { describe, expect, it } from "vitest";
import {
  cleanHead,
  meaningCores,
  meaningsOverlap,
  patternPieces,
  readingSlips,
  sameSentenceKo,
  splitTail,
} from "./text";

describe("meaningCores", () => {
  it("괄호 속 덧말을 떼고 쉼표로 나눈다", () => {
    expect(meaningCores("나(여자)")).toEqual(["나"]);
    expect(meaningCores("(노래를)부르다")).toEqual(["부르다"]);
    expect(meaningCores("세탁, 빨래")).toEqual(["세탁", "빨래"]);
  });
});

describe("meaningsOverlap", () => {
  it("괄호만 다른 뜻은 겹친다고 본다(정답이 둘이 되지 않게)", () => {
    expect(meaningsOverlap("나(여자)", "나(남자)")).toBe(true);
  });
  it("쉼표로 나눈 뜻 하나만 같아도 겹친다", () => {
    expect(meaningsOverlap("세탁, 빨래", "빨래")).toBe(true);
  });
  it("다른 뜻은 겹치지 않는다", () => {
    expect(meaningsOverlap("강", "하늘")).toBe(false);
  });
});

describe("sameSentenceKo", () => {
  it("문장부호·공백만 다른 문장 뜻은 같다고 본다", () => {
    expect(sameSentenceKo("응, 시험.", "응 시험")).toBe(true);
    expect(sameSentenceKo("응, 시험.", "응, 산.")).toBe(false);
  });
});

describe("patternPieces", () => {
  it("문형 머리를 ～와 문장부호로 나눠 고정 조각만 남긴다", () => {
    expect(patternPieces("～は～じゃない。")).toEqual(["は", "じゃない"]);
  });
  it("읽는 법 괄호와 / 는 뗀다", () => {
    expect(patternPieces("～の前に[まえに]")).toEqual(["の前に"]);
    expect(patternPieces("うん、～。 / ううん、～じゃない。")).toEqual([
      "うん",
      "ううん",
      "じゃない",
    ]);
  });
});

describe("patternPieces 거르기", () => {
  it("한국어 덧말이 섞인 조각은 보기로 쓰지 않는다", () => {
    expect(patternPieces("～の(위치)～")).toEqual(["の"]);
  });
  it("조사가 아닌 한 글자 조각과 ます·です는 쓰지 않는다", () => {
    expect(patternPieces("～を～る。")).toEqual(["を"]);
    expect(patternPieces("～ます。")).toEqual([]);
  });
});

describe("cleanHead", () => {
  it("읽는 법 괄호를 떼고 앞뒤·겹친 / 를 정리한다", () => {
    expect(cleanHead("～に来ない[こない]。 / / ～をしない。")).toBe(
      "～に来ない。 / ～をしない。",
    );
    expect(cleanHead("/ ~하지 않을래")).toBe("~하지 않을래");
  });
});

describe("splitTail", () => {
  it("문장 끝 문장부호를 뗀다", () => {
    expect(splitTail("川は川だ。")).toEqual({ body: "川は川だ", tail: "。" });
    expect(splitTail("どこ")).toEqual({ body: "どこ", tail: "" });
  });
});

describe("readingSlips", () => {
  it("장음을 빼거나 넣은 읽기를 낸다", () => {
    const slips = readingSlips("がっこう").map((s) => s.reading);
    expect(slips).toContain("がっこ");
    expect(readingSlips("ぼく").map((s) => s.reading)).toContain("ぼうく");
  });
  it("탁음을 붙이거나 뗀 읽기를 낸다", () => {
    expect(readingSlips("かわ").map((s) => s.reading)).toContain("がわ");
    expect(readingSlips("がっこう").map((s) => s.reading)).toContain(
      "かっこう",
    );
  });
  it("작은 っ를 빼거나 넣은 읽기를 낸다", () => {
    expect(readingSlips("がっこう").map((s) => s.reading)).toContain("がこう");
    expect(readingSlips("はかる").map((s) => s.reading)).toContain("はっかる");
  });
  it("정답과 같은 읽기는 내지 않는다", () => {
    expect(readingSlips("そら").map((s) => s.reading)).not.toContain("そら");
  });
});
