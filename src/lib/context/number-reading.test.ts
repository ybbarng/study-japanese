import { describe, expect, it } from "vitest";
import { numberReadings } from "./number-reading";

describe("숫자를 읽을 수 있는 소리", () => {
  it("소리가 여럿인 한 자리 숫자는 모두 낸다", () => {
    expect(numberReadings("7").sort()).toEqual(["しち", "なな", "なの"].sort());
    expect(numberReadings("9").sort()).toEqual(
      ["きゅう", "く", "ここの"].sort(),
    );
    expect(numberReadings("4").sort()).toEqual(
      ["し", "よ", "よっ", "よん"].sort(),
    );
  });

  it("끝자리가 뒤 말에 붙어 줄어든 꼴(いっ·じゅっ·ひゃっ)을 넣는다", () => {
    expect(numberReadings("1")).toContain("いっ");
    expect(numberReadings("30")).toEqual(
      expect.arrayContaining(["さんじゅう", "さんじゅっ", "さんじっ"]),
    );
    expect(numberReadings("100")).toContain("ひゃっ");
  });

  it("여러 자리 수는 자리마다 탁음·촉음 변화를 따른다", () => {
    expect(numberReadings("8000")).toContain("はっせん");
    expect(numberReadings("300")).toContain("さんびゃく");
    expect(numberReadings("31")).toContain("さんじゅういち");
    expect(numberReadings("200000")).toContain("にじゅうまん");
  });

  it("두~네 자리는 한 자리씩 읽는 소리도 낸다(119 いちいちきゅう)", () => {
    expect(numberReadings("119")).toEqual(
      expect.arrayContaining(["ひゃくじゅうきゅう", "いちいちきゅう"]),
    );
  });

  it("통째로 읽는 말(1日 ついたち의 つい, 1人 ひとり의 ひと)은 넣지 않는다", () => {
    expect(numberReadings("1")).not.toContain("つい");
    expect(numberReadings("1")).not.toContain("ひと");
    expect(numberReadings("20")).not.toContain("はた");
  });

  it("숫자가 아니거나 너무 긴 글은 빈 배열이다", () => {
    expect(numberReadings("1.5")).toEqual([]);
    expect(numberReadings("123456789")).toEqual([]);
  });
});
