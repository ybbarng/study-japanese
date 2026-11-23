import { describe, expect, it } from "vitest";
import {
  ADJ_FORMS,
  type Adjective,
  type AdjFormId,
  type AdjKind,
  adjFormApplies,
  adjRuleFor,
  conjugateAdj,
} from "./adjective";
import { acceptedForms } from "./conjugate";
import { ADJECTIVES } from "./words";

const a = (dict: string, reading: string, kind: AdjKind): Adjective => ({
  dict,
  reading,
  kind,
  ko: "",
});
const takai = a("高い", "たかい", "i");
const ii = a("いい", "いい", "i");
const shizuka = a("静か", "しずか", "na");
const gakusei = a("学生", "がくせい", "noun");

const kanji = (adj: Adjective, form: AdjFormId) =>
  conjugateAdj(adj, form).kanji;

describe("い형용사 高い", () => {
  it.each<[AdjFormId, string]>([
    ["plain", "高い"],
    ["plainNeg", "高くない"],
    ["plainPast", "高かった"],
    ["plainPastNeg", "高くなかった"],
    ["polite", "高いです"],
    ["politeNeg", "高くないです"],
    ["politePast", "高かったです"],
    ["politePastNeg", "高くなかったです"],
    ["te", "高くて"],
    ["adverb", "高く"],
    ["naru", "高くなる"],
    ["sa", "高さ"],
  ])("%s는 %s", (form, expected) => {
    expect(kanji(takai, form)).toBe(expected);
  });

  it("읽기도 함께 바뀐다", () => {
    expect(conjugateAdj(takai, "plainPast").reading).toBe("たかかった");
  });

  it("부정 정중체는 くありません도 맞는 답이다", () => {
    expect(
      acceptedForms(conjugateAdj(takai, "politeNeg")).map((f) => f.kanji),
    ).toEqual(["高くないです", "高くありません"]);
  });
});

describe("いい는 よ로 바뀐다", () => {
  it.each<[AdjFormId, string]>([
    ["plain", "いい"],
    ["plainNeg", "よくない"],
    ["plainPast", "よかった"],
    ["te", "よくて"],
    ["adverb", "よく"],
    ["sa", "よさ"],
  ])("%s는 %s", (form, expected) => {
    expect(kanji(ii, form)).toBe(expected);
  });

  it("かっこいい도 かっこよくない가 된다", () => {
    expect(kanji(a("かっこいい", "かっこいい", "i"), "plainNeg")).toBe(
      "かっこよくない",
    );
  });

  it("규칙에 いい가 よ로 바뀐다고 먼저 말한다", () => {
    expect(adjRuleFor(ii, "plainPast")).toBe(
      "いい는 よ로 바뀐다. い를 빼고 かった",
    );
  });
});

describe("な형용사 静か", () => {
  it.each<[AdjFormId, string]>([
    ["plain", "静かだ"],
    ["plainNeg", "静かじゃない"],
    ["plainPast", "静かだった"],
    ["plainPastNeg", "静かじゃなかった"],
    ["polite", "静かです"],
    ["politeNeg", "静かじゃありません"],
    ["politePast", "静かでした"],
    ["politePastNeg", "静かじゃありませんでした"],
    ["te", "静かで"],
    ["adverb", "静かに"],
    ["naru", "静かになる"],
  ])("%s는 %s", (form, expected) => {
    expect(kanji(shizuka, form)).toBe(expected);
  });

  it("부정은 では 꼴도 맞는 답이다", () => {
    expect(
      acceptedForms(conjugateAdj(shizuka, "politeNeg")).map((f) => f.reading),
    ).toEqual([
      "しずかじゃありません",
      "しずかではありません",
      "しずかじゃないです",
    ]);
  });
});

describe("명사 学生", () => {
  it("な형용사와 같은 방식으로 だ·です를 붙인다", () => {
    expect(kanji(gakusei, "plainPast")).toBe("学生だった");
    expect(kanji(gakusei, "politePastNeg")).toBe("学生じゃありませんでした");
    expect(kanji(gakusei, "te")).toBe("学生で");
    expect(kanji(gakusei, "naru")).toBe("学生になる");
  });

  it("명사에는 부사형·さ가 없다", () => {
    expect(adjFormApplies("noun", "adverb")).toBe(false);
    expect(adjFormApplies("noun", "sa")).toBe(false);
    expect(() => conjugateAdj(gakusei, "adverb")).toThrow();
  });
});

describe("기초 형용사·명사 목록", () => {
  it("모든 낱말이 맞는 꼴로 모두 바뀐다", () => {
    const failed: string[] = [];
    for (const w of ADJECTIVES)
      for (const form of ADJ_FORMS)
        if (adjFormApplies(w.kind, form) && !conjugateAdj(w, form).reading)
          failed.push(`${w.dict}:${form}`);
    expect(failed).toEqual([]);
  });

  it("い형용사는 모두 い로 끝난다", () => {
    const bad = ADJECTIVES.filter(
      (w) => w.kind === "i" && !w.reading.endsWith("い"),
    );
    expect(bad).toEqual([]);
  });
});
