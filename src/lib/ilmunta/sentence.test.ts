import { describe, expect, it } from "vitest";
import {
  SKILL_BY_KEY,
  SKILLS,
  type Skill,
  skillsInLessons,
} from "./curriculum";
import { seededRng } from "./random";
import { rubyPlain } from "./ruby-text";
import {
  framesFor,
  hasSentence,
  makeDrillQuestion,
  makeSentenceQuestion,
} from "./sentence";
import { FRAMES } from "./sentence-frames";
import { SCENES } from "./sentence-words";
import { VERB_BY_DICT } from "./verbs";
import { ADJECTIVES } from "./words";

const skill = (key: string): Skill => {
  const s = SKILL_BY_KEY.get(key);
  if (!s) throw new Error(key);
  return s;
};

/** 씨앗 여럿으로 문장 문제를 만든다 */
function many(key: string, n = 200) {
  return Array.from({ length: n }, (_, seed) => {
    const q = makeSentenceQuestion(skill(key), seededRng(seed));
    if (!q?.sentence) throw new Error(`${key}: 문장 문제가 나오지 않음`);
    return { ...q, sentence: q.sentence };
  });
}

const filled = (q: ReturnType<typeof many>[number]) =>
  rubyPlain(q.sentence.before) + q.answer.kanji + rubyPlain(q.sentence.after);

describe("문장 틀과 낱말 자료", () => {
  it("장면에 적은 낱말은 모두 verbs.ts·words.ts에 있는 낱말이다", () => {
    const known = new Set([
      ...VERB_BY_DICT.keys(),
      ...ADJECTIVES.map((a) => a.dict),
    ]);
    const missing = Object.values(SCENES)
      .flat()
      .map((w) => w.dict)
      .filter((d) => !known.has(d));
    expect(missing).toEqual([]);
  });

  it("틀 id는 겹치지 않고 빈칸은 하나다", () => {
    const ids = FRAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bad = FRAMES.filter((f) => f.ja.split("{_}").length !== 2).map(
      (f) => f.id,
    );
    expect(bad).toEqual([]);
  });

  it("과거 틀에만 昨日·前は·昔 같은 과거 단서가 있다", () => {
    const PAST = new Set([
      "mashita",
      "masendeshita",
      "ta",
      "nakatta",
      "plainPast",
      "plainPastNeg",
      "politePast",
      "politePastNeg",
    ]);
    const PRESENT = new Set([
      "masu",
      "masen",
      "nai",
      "dict",
      "plain",
      "plainNeg",
      "polite",
      "politeNeg",
    ]);
    const cue = /昨日|前は|昔/;
    const wrong = FRAMES.filter(
      (f) =>
        (PAST.has(f.form) && !cue.test(rubyPlain(f.ja))) ||
        (PRESENT.has(f.form) && cue.test(rubyPlain(f.ja))),
    ).map((f) => f.id);
    expect(wrong).toEqual([]);
  });

  it("보통체 회화 틀(ねえ·から·けど)의 한국어 뜻은 반말로, 정중체 틀은 ~습니다로 옮긴다", () => {
    const PLAIN_TALK =
      /^(dict|nai|ta|nakatta|plain|plainNeg|plainPast|plainPastNeg)$/;
    const POLITE =
      /^(masu|masen|mashita|masendeshita|polite|politeNeg|politePast|politePastNeg)$/;
    const wrong = FRAMES.filter(
      (f) =>
        (PLAIN_TALK.test(f.form) && !f.koForm.startsWith("casual")) ||
        (POLITE.test(f.form) && !/olite$/.test(f.koForm)),
    ).map((f) => `${f.id}:${f.koForm}`);
    expect(wrong).toEqual([]);
  });

  it("보통체 명사 틀은 '~이다'가 아니라 '~(이)야'로 옮긴다", () => {
    const notCasual = many("adj:plain:noun", 20)
      .map((q) => q.sentence.ko)
      .filter((ko) => !/야\.$/.test(ko));
    expect(notCasual).toEqual([]);
  });

  it("부정 틀에는 あまり나 같은 낱말을 다시 쓰는 뒤 문장이 있다", () => {
    const NEG =
      /^(masen|masendeshita|nai|nakatta|plainNeg|plainPastNeg|politeNeg|politePastNeg)$/;
    const wrong = FRAMES.filter(
      (f) => NEG.test(f.form) && !/あまり|\{word\}/.test(f.ja),
    ).map((f) => f.id);
    expect(wrong).toEqual([]);
  });

  it("동사 활용과 형용사·명사 활용(さ 빼고)은 모든 갈래가 문장으로 나온다", () => {
    const without = SKILLS.filter(
      (s) =>
        (s.kind === "verb" || (s.kind === "adj" && s.form !== "sa")) &&
        !hasSentence(s),
    ).map((s) => s.key);
    expect(without).toEqual([]);
  });

  it("문형·경어·자타동사·있다·さ는 문장 틀이 없다(활용표 문제로 낸다)", () => {
    for (const key of [
      "pattern:tai",
      "keigo:honorific",
      "transitive:toTransitive",
      "exist",
      "adj:sa:i",
    ].filter((k) => SKILL_BY_KEY.has(k)))
      expect(hasSentence(skill(key))).toBe(false);
  });
});

describe("makeSentenceQuestion", () => {
  it("1그룹 ました: 昨日가 든 문장, 정답은 ました, 한국어 뜻은 과거 정중체", () => {
    for (const q of many("verb:mashita:godan", 60)) {
      expect(rubyPlain(q.sentence.before)).toContain("昨日");
      expect(q.answer.reading.endsWith("ました")).toBe(true);
      expect(q.sentence.ko).toMatch(/^(어제|선생님, 어제).+습니다\.$/);
      expect(q.sentence.ko).not.toMatch(/않/);
      expect(q.skillKey).toBe("verb:mashita:godan");
    }
  });

  it("빈칸에 넣는 낱말은 틀 장면에 든 낱말 가운데 기술의 갈래와 맞는 것뿐이다", () => {
    const sceneWords = new Set(
      [...SCENES.request, ...SCENES.beforeOut].map((w) => w.dict),
    );
    for (const q of many("verb:te:ichidan")) {
      const dict = q.id.split("|")[1];
      expect(sceneWords.has(dict)).toBe(true);
      expect(VERB_BY_DICT.get(dict)?.group).toBe("ichidan");
    }
  });

  it("어떤 기술이든 틀의 활용형이 기술의 활용형과 같다", () => {
    for (const s of SKILLS.filter(hasSentence))
      for (let seed = 0; seed < 20; seed++) {
        const q = makeSentenceQuestion(s, seededRng(seed));
        const frame = FRAMES.find((f) => f.id === q?.sentence?.frameId);
        expect(frame && "form" in frame ? frame.form : null).toBe(
          s.kind === "verb" || s.kind === "adj" ? s.form : null,
        );
      }
  });

  it("좋은 느낌 て형 틀에는 좋은 느낌 형용사만 들어간다", () => {
    const good = new Set(
      SCENES.quality.filter((w) => w.tone === "good").map((w) => w.dict),
    );
    for (const q of many("adj:te:i"))
      if (q.sentence.frameId === "adj-te-good")
        expect(good.has(q.id.split("|")[1])).toBe(true);
  });

  it("명사 부정 틀은 같은 명사를 뒤 문장에 다시 써서 부정임을 알린다", () => {
    for (const q of many("adj:plainNeg:noun", 30)) {
      const noun = q.id.split("|")[1];
      expect(rubyPlain(q.sentence.after)).toContain(`${noun}だよ`);
      // 보통체 회화라 반말로 옮긴다(아니야 … 야)
      expect(q.sentence.ko).toMatch(/아니야\. 남동생이 .+야\.$/);
    }
  });

  it("채운 문장과 한국어 뜻에 자리 표시가 남지 않는다", () => {
    for (const s of SKILLS.filter(hasSentence))
      for (let seed = 0; seed < 10; seed++) {
        const q = makeSentenceQuestion(s, seededRng(seed));
        const text = `${q?.sentence?.before}${q?.sentence?.after}${q?.sentence?.ko}`;
        expect(text).not.toMatch(/[{}]/);
      }
  });

  it("한국어 뜻에 빈칸이 겹치거나 문장부호 앞에 빈칸이 남지 않는다", () => {
    const q = many("verb:masu:suru").find((x) => x.id.includes("運動する"));
    expect(q?.sentence.ko).not.toMatch(/ {2}| [.!]/);
  });

  it("같은 씨앗이면 같은 문장을 낸다", () => {
    const a = makeSentenceQuestion(skill("verb:passive:godan"), seededRng(7));
    const b = makeSentenceQuestion(skill("verb:passive:godan"), seededRng(7));
    expect(a).toEqual(b);
  });

  it("앞 문제의 낱말을 피해서 고른다", () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = makeSentenceQuestion(
        skill("verb:te:kuru"),
        seededRng(seed),
        "来る",
      );
      expect(q?.id.split("|")[1]).not.toBe("来る");
    }
  });

  it("정답을 채운 문장 예: 1그룹 ない형은 あまり 뒤에 온다", () => {
    for (const q of many("verb:nai:godan", 30))
      expect(filled(q)).toMatch(/あまり.+ない(よ)?。$/);
  });
});

describe("강별 범위", () => {
  it("1~9과에서는 명사·형용사 기본 활용과 1그룹 ない·た·ます 꼴만 문장으로 나온다", () => {
    const forms = new Set<string>();
    for (const s of skillsInLessons(1, 9))
      for (let seed = 0; seed < 10; seed++) {
        const q = makeDrillQuestion(s, "sentence", seededRng(seed));
        const frame = FRAMES.find((f) => f.id === q.sentence?.frameId);
        if (frame) forms.add(`${frame.kind}:${frame.form}`);
      }
    expect([...forms].sort()).toEqual(
      [
        "adj:plain",
        "adj:plainNeg",
        "adj:plainPast",
        "adj:plainPastNeg",
        "adj:polite",
        "adj:politeNeg",
        "adj:politePast",
        "adj:politePastNeg",
        "verb:mashita",
        "verb:masen",
        "verb:masendeshita",
        "verb:masu",
        "verb:nai",
        "verb:nakatta",
        "verb:ta",
      ].sort(),
    );
  });

  it("문장 방식이어도 틀이 없는 기술은 활용표 문제로 낸다", () => {
    const s = SKILLS.find((x) => x.kind === "pattern");
    if (!s) throw new Error("문형 기술이 없음");
    const q = makeDrillQuestion(s, "sentence", seededRng(1));
    expect(q.sentence).toBeUndefined();
    expect(q.skillKey).toBe(s.key);
  });

  it("활용표 방식이면 문장 없이 낸다", () => {
    const q = makeDrillQuestion(skill("verb:te:godan"), "table", seededRng(1));
    expect(q.sentence).toBeUndefined();
  });

  it("문장으로 낼 수 있는 기술마다 틀이 하나 이상 있다(틀 수 확인)", () => {
    expect(
      framesFor(skill("verb:causative:kuru")).map((x) => x.frame.id),
    ).toEqual(["causative-teacher"]);
  });
});
