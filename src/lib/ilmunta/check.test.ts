import { describe, expect, it } from "vitest";
import { isCorrectAnswer, normalizeAnswer, splitChange } from "./check";

const nonde = [{ kanji: "飲んで", reading: "のんで" }];

describe("isCorrectAnswer", () => {
  it("읽기를 히라가나로 치면 맞다", () => {
    expect(isCorrectAnswer("のんで", nonde)).toBe(true);
  });

  it("한자 표기로 치면 맞다", () => {
    expect(isCorrectAnswer("飲んで", nonde)).toBe(true);
  });

  it("가타카나·빈칸·마침표는 넘어간다", () => {
    expect(isCorrectAnswer(" ノンデ。", nonde)).toBe(true);
  });

  it("로마자로 치면 가나로 바꿔 비교한다", () => {
    expect(isCorrectAnswer("nonde", nonde)).toBe(true);
    expect(isCorrectAnswer("notte", nonde)).toBe(false);
  });

  it("빈 답과 다른 꼴은 틀리다", () => {
    expect(isCorrectAnswer("", nonde)).toBe(false);
    expect(isCorrectAnswer("のって", nonde)).toBe(false);
  });

  it("맞는 답 목록 가운데 하나만 맞아도 맞다", () => {
    const accepted = [
      { kanji: "飲ませられる", reading: "のませられる" },
      { kanji: "飲まされる", reading: "のまされる" },
    ];
    expect(isCorrectAnswer("のまされる", accepted)).toBe(true);
  });
});

describe("normalizeAnswer", () => {
  it("전각 빈칸도 지운다", () => {
    expect(normalizeAnswer("た　べる")).toBe("たべる");
  });
});

describe("splitChange", () => {
  it("바탕 꼴과 답의 같은 앞부분과 바뀐 끝을 나눈다", () => {
    expect(splitChange("飲む", "飲んで")).toEqual({
      stem: "飲",
      from: "む",
      to: "んで",
    });
    expect(splitChange("来る", "来ない")).toEqual({
      stem: "来",
      from: "る",
      to: "ない",
    });
  });
});
