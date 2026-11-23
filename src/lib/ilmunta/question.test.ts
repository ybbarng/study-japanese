import { describe, expect, it } from "vitest";
import { SKILL_BY_KEY, SKILLS, type Skill } from "./curriculum";
import { makeQuestion, wordOf } from "./question";
import { seededRng } from "./random";

const skill = (key: string): Skill => {
  const s = SKILL_BY_KEY.get(key);
  if (!s) throw new Error(key);
  return s;
};

describe("makeQuestion: 동사 활용 문제", () => {
  it("사전형을 보여 주고 목표 활용형의 정답과 규칙을 담는다", () => {
    const q = makeQuestion(skill("verb:te:godan"), seededRng(1));
    expect(q.givenTag).toBe("사전형 · 1그룹");
    expect(q.target.label).toBe("て형");
    expect(q.skillKey).toBe("verb:te:godan");
    expect(
      q.answer.reading.endsWith("て") || q.answer.reading.endsWith("で"),
    ).toBe(true);
    expect(q.rule).not.toBe("");
  });

  it("사전형을 물을 때는 ます형을 보여 준다", () => {
    const q = makeQuestion(skill("verb:dict:kuru"), seededRng(3));
    expect(q.givenTag).toBe("ます형 · 3그룹 くる");
    expect(q.given.reading.endsWith("きます")).toBe(true);
    expect(q.answer.reading.endsWith("くる")).toBe(true);
  });

  it("쓰임이 어색한 동사(ある 등)는 가능형 문제에 나오지 않는다", () => {
    const words = new Set<string>();
    for (let seed = 0; seed < 300; seed++)
      words.add(
        wordOf(makeQuestion(skill("verb:potential:godan"), seededRng(seed)).id),
      );
    expect(words.has("ある")).toBe(false);
    expect(words.has("分かる")).toBe(false);
  });

  it("앞 문제의 낱말을 피해서 고른다", () => {
    const s = skill("verb:nai:kuru");
    for (let seed = 0; seed < 50; seed++) {
      const q = makeQuestion(s, seededRng(seed), "来る");
      expect(wordOf(q.id)).not.toBe("来る");
    }
  });

  it("같은 씨앗이면 같은 문제를 낸다", () => {
    const a = makeQuestion(skill("verb:passive:ichidan"), seededRng(42));
    const b = makeQuestion(skill("verb:passive:ichidan"), seededRng(42));
    expect(a).toEqual(b);
  });
});

describe("makeQuestion: 보기", () => {
  it("모든 기술에서 보기에 정답이 하나 들어 있고 같은 읽기가 겹치지 않는다", () => {
    const broken: string[] = [];
    for (const s of SKILLS) {
      for (let seed = 0; seed < 5; seed++) {
        const q = makeQuestion(s, seededRng(seed));
        const readings = q.choices.map((c) => c.reading);
        const hits = q.choices.filter((c) =>
          q.accepted.some((a) => a.reading === c.reading),
        ).length;
        if (
          hits !== 1 ||
          new Set(readings).size !== readings.length ||
          q.choices.length < 2
        )
          broken.push(`${s.key}#${seed}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("동사 활용 보기는 4개다", () => {
    for (let seed = 0; seed < 20; seed++)
      expect(
        makeQuestion(skill("verb:te:godan"), seededRng(seed)).choices,
      ).toHaveLength(4);
  });
});

describe("makeQuestion: 그 밖의 문제", () => {
  it("な형용사는 줄기를 보여 주고 갈래를 알린다", () => {
    const q = makeQuestion(skill("adj:plainPast:na"), seededRng(5));
    expect(q.givenTag).toBe("な형용사");
    expect(q.answer.kanji).toBe(`${q.given.kanji}だった`);
    expect(q.answer.kanji.endsWith("だった")).toBe(true);
  });

  it("있다 문제는 살아 있는 것이면 います가 정답이다", () => {
    for (let seed = 0; seed < 40; seed++) {
      const q = makeQuestion(skill("exist"), seededRng(seed));
      const alive = [
        "学生が",
        "先生が",
        "会社員が",
        "医者が",
        "猫が",
        "犬が",
        "友達が",
        "子どもが",
      ].includes(q.given.kanji);
      expect(q.answer.reading).toBe(alive ? "います" : "あります");
    }
  });

  it("자동사→타동사 문제는 짝인 타동사가 정답이다", () => {
    const q = makeQuestion(skill("transitive:toTransitive"), seededRng(0));
    expect(q.givenTag).toBe("자동사");
    expect(q.rule).toContain(q.given.kanji);
    expect(q.rule).toContain(q.answer.kanji);
  });

  it("존경어 문제는 존경어가 있는 동사만 낸다", () => {
    for (let seed = 0; seed < 40; seed++) {
      const q = makeQuestion(skill("keigo:honorific"), seededRng(seed));
      expect(["もらう", "あげる", "会う"]).not.toContain(q.given.kanji);
    }
  });
});
