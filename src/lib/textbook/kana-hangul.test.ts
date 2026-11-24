import { describe, expect, it } from "vitest";
import { hangulizeKanaNames, kanaToHangul } from "./kana-hangul";

describe("히라가나 낱말을 한글로", () => {
  it.each([
    ["たなか", "다나카"], // 어두 た는 다, 어중 か는 카
    ["ちば", "지바"],
    ["いちろう", "이치로"], // 어중 ち는 치, 장음 う는 적지 않음
    ["なごや", "나고야"],
    ["しんじゅく", "신주쿠"], // ん은 받침 ㄴ
    ["さっぽろ", "삿포로"], // っ은 받침 ㅅ
    ["ほっかいどう", "홋카이도"],
    ["きょうこ", "교코"],
    ["おおた", "오타"], // おお 장음
    ["つくば", "쓰쿠바"],
  ])("%s → %s", (kana, hangul) => {
    expect(kanaToHangul(kana)).toBe(hangul);
  });

  it("표에 없는 글자(작은 ぁ 등)가 있으면 바꾸지 않는다", () => {
    expect(kanaToHangul("ぁい")).toBeNull();
  });
});

describe("해석 속 이름·지명만 한글로", () => {
  it("조사가 붙은 이름과 지명을 바꾼다", () => {
    expect(hangulizeKanaNames("たなか씨는 なごや로 갔어요.")).toBe(
      "다나카씨는 나고야로 갔어요.",
    );
  });

  it("공백·문장 부호·괄호 앞에서 끝나는 이름도 바꾼다", () => {
    expect(hangulizeKanaNames("어, けんた. (ちば 등)")).toBe(
      "어, 겐타. (지바 등)",
    );
  });

  it("일본어 문장 부호로 끝나는 부르는 이름도 바꾼다", () => {
    expect(hangulizeKanaNames("응, けんた。")).toBe("응, 겐타。");
  });

  it("괄호 뒤에 붙은 일본어 어미는 이름으로 보지 않는다", () => {
    expect(hangulizeKanaNames("～(な 삭제)です。 ~합니다.")).toBe(
      "～(な 삭제)です。 ~합니다.",
    );
  });

  it("문법 이야기의 가나(～에 붙은 것, 형·단)는 그대로 둔다", () => {
    expect(hangulizeKanaNames("～ます형 / て형 / ～う단")).toBe(
      "～ます형 / て형 / ～う단",
    );
  });

  it("낱말을 설명하는 괄호(…의 높임말)는 그대로 둔다", () => {
    expect(hangulizeKanaNames("어떻게(どう의 높임말)")).toBe(
      "어떻게(どう의 높임말)",
    );
  });

  it("한 글자 가나는 이름으로 보지 않는다", () => {
    expect(hangulizeKanaNames("～は～ 위치")).toBe("～は～ 위치");
  });
});
