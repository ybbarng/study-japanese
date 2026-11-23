import { describe, expect, it } from "vitest";
import {
  DRILL_LESSONS,
  SKILL_BY_KEY,
  SKILLS,
  skillLabel,
  skillsInLessons,
  skillsOfLesson,
} from "./curriculum";

describe("과별 기술", () => {
  it("14과는 네 갈래의 ない형을 다룬다", () => {
    expect(skillsOfLesson(14).map((s) => s.key)).toEqual([
      "verb:nai:godan",
      "verb:nai:ichidan",
      "verb:nai:kuru",
      "verb:nai:suru",
    ]);
  });

  it("8과와 14과에 모두 나오는 1그룹 ない형은 기술 하나에 두 과를 단다", () => {
    expect(SKILL_BY_KEY.get("verb:nai:godan")?.lessons).toEqual([8, 14]);
  });

  it("1~25과에서 동사 활용형 15가지와 명사·형용사를 다룬다", () => {
    const verbForms = new Set(
      skillsInLessons(1, 25).flatMap((s) =>
        s.kind === "verb" ? [s.form] : [],
      ),
    );
    expect([...verbForms].sort()).toEqual(
      [
        "ba",
        "causative",
        "causativePassive",
        "dict",
        "imperative",
        "masen",
        "masendeshita",
        "mashita",
        "masu",
        "nai",
        "nakatta",
        "passive",
        "potential",
        "prohibitive",
        "ta",
        "te",
        "volitional",
      ].sort(),
    );
    expect(skillsInLessons(1, 7).every((s) => s.kind === "adj")).toBe(true);
  });

  it("과 범위에 기술이 없는 과(조사·부사 등)는 드릴 과 목록에 없다", () => {
    expect(DRILL_LESSONS).not.toContain(26);
    expect(DRILL_LESSONS).toContain(25);
    expect(DRILL_LESSONS).toContain(56);
  });

  it("기술 열쇠는 겹치지 않고 처음 나오는 과 순서로 놓인다", () => {
    expect(new Set(SKILLS.map((s) => s.key)).size).toBe(SKILLS.length);
    const firsts = SKILLS.map((s) => Math.min(...s.lessons));
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
  });
});

describe("skillLabel", () => {
  it("활용형과 갈래를 함께 보인다", () => {
    const s = SKILL_BY_KEY.get("verb:te:godan");
    if (!s) throw new Error();
    expect(skillLabel(s)).toBe("て형 · 1그룹");
  });
});
