import { describe, expect, it } from "vitest";
import type { Verb, VerbGroup } from "./conjugate";
import { PATTERN_BY_ID, PATTERNS, patternRule } from "./patterns";
import { VERBS } from "./verbs";

const v = (dict: string, reading: string, group: VerbGroup): Verb => ({
  dict,
  reading,
  group,
  ko: "",
});
const nomu = v("飲む", "のむ", "godan");
const taberu = v("食べる", "たべる", "ichidan");
const kuru = v("来る", "くる", "kuru");

const build = (id: string, verb: Verb) => {
  const p = PATTERN_BY_ID.get(id);
  if (!p) throw new Error(id);
  const c = p.build(verb);
  return [c.kanji, c.reading];
};

describe("활용형에 붙는 문형", () => {
  it.each<[string, Verb, string, string]>([
    ["naideKudasai", nomu, "飲まないでください", "のまないでください"],
    ["nakereba", nomu, "飲まなければならない", "のまなければならない"],
    ["nakutemoii", taberu, "食べなくてもいい", "たべなくてもいい"],
    ["tai", nomu, "飲みたい", "のみたい"],
    ["nagara", taberu, "食べながら", "たべながら"],
    ["kotogadekiru", kuru, "来ることができる", "くることができる"],
    ["youtoomou", nomu, "飲もうと思う", "のもうと思う"],
    ["teiru", nomu, "飲んでいる", "のんでいる"],
    ["tekudasai", kuru, "来てください", "きてください"],
    ["takotogaaru", taberu, "食べたことがある", "たべたことがある"],
    ["tari", nomu, "飲んだり", "のんだり"],
    ["to", nomu, "飲むと", "のむと"],
  ])("%s: %s → %s", (id, verb, kanji, reading) => {
    expect(build(id, verb)).toEqual([kanji, reading]);
  });

  it("お～になる는 ます형 앞에 お를 붙인다", () => {
    expect(build("oNinaru", v("待つ", "まつ", "godan"))).toEqual([
      "お待ちになる",
      "おまちになる",
    ]);
  });

  it("お～になる는 따로 높임말이 있는 동사(見る·来る)에는 쓰지 않는다", () => {
    const p = PATTERN_BY_ID.get("oNinaru");
    expect(p?.fits?.(v("見る", "みる", "ichidan"))).toBe(false);
    expect(p?.fits?.(kuru)).toBe(false);
  });

  it("～に行く는 行く·来る에 쓰지 않는다", () => {
    const p = PATTERN_BY_ID.get("niIku");
    expect(p?.fits?.(v("行く", "いく", "godan"))).toBe(false);
    expect(p?.fits?.(nomu)).toBe(true);
  });

  it("문형마다 어울리는 기초 동사가 하나 이상 있다", () => {
    const empty = PATTERNS.filter(
      (p) => !VERBS.some((verb) => !verb.basicOnly && (p.fits?.(verb) ?? true)),
    ).map((p) => p.id);
    expect(empty).toEqual([]);
  });
});

describe("patternRule", () => {
  it.each<[string, string]>([
    ["tai", "ます형(ます를 뗀 꼴) + たい"],
    ["teiru", "て형 + いる"],
    ["nakereba", "ない형에서 い를 빼고 ければならない"],
    ["oNinaru", "お + ます형(ます를 뗀 꼴) + になる"],
    ["to", "사전형 + と"],
    ["youtoomou", "의지형 + と思う"],
  ])("%s는 「%s」", (id, rule) => {
    const p = PATTERN_BY_ID.get(id);
    if (!p) throw new Error(id);
    expect(patternRule(p)).toBe(rule);
  });
});
