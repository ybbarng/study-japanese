import { describe, expect, it } from "vitest";
import { conjugate, VERB_FORMS } from "./conjugate";
import { VERBS, verbsOf } from "./verbs";

describe("기초 동사 목록", () => {
  it("80~150개 사이이고 사전형이 겹치지 않는다", () => {
    expect(VERBS.length).toBeGreaterThanOrEqual(80);
    expect(VERBS.length).toBeLessThanOrEqual(150);
    expect(new Set(VERBS.map((v) => v.dict)).size).toBe(VERBS.length);
  });

  it("읽기는 히라가나뿐이고 사전형과 끝 글자가 같다", () => {
    const bad = VERBS.filter(
      (v) =>
        !/^[ぁ-ゖー]+$/.test(v.reading) ||
        v.dict.slice(-1) !== v.reading.slice(-1),
    ).map((v) => v.dict);
    expect(bad).toEqual([]);
  });

  it("2그룹은 모두 い단·え단 + る로 끝난다", () => {
    const bad = verbsOf("ichidan")
      .filter(
        (v) =>
          !/[いきぎしじちにひびみりえけげせぜてでねへべめれ]る$/.test(
            v.reading,
          ),
      )
      .map((v) => v.dict);
    expect(bad).toEqual([]);
  });

  it("3그룹은 する·くる로 끝나고 갈래마다 동사가 있다", () => {
    expect(verbsOf("suru").every((v) => v.reading.endsWith("する"))).toBe(true);
    expect(verbsOf("kuru").every((v) => v.reading.endsWith("くる"))).toBe(true);
    expect(verbsOf("kuru").length).toBeGreaterThan(0);
  });

  it("모든 동사가 모든 활용형으로 바뀐다(글자가 비거나 오류가 나지 않는다)", () => {
    const failed: string[] = [];
    for (const v of VERBS) {
      for (const f of VERB_FORMS) {
        try {
          const c = conjugate(v, f);
          if (!c.kanji || !c.reading) failed.push(`${v.dict}:${f}`);
        } catch {
          failed.push(`${v.dict}:${f}`);
        }
      }
    }
    expect(failed).toEqual([]);
  });

  it("2그룹처럼 생긴 1그룹 예외 동사를 담고 있다", () => {
    const godan = new Set(verbsOf("godan").map((v) => v.dict));
    for (const d of ["帰る", "入る", "走る", "知る", "要る", "切る"])
      expect(godan.has(d)).toBe(true);
  });
});
