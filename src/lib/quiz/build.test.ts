import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/ilmunta/random";
import { fakeLesson } from "./__fixtures__/lesson";
import { sectionQuestions } from "./build";
import { orderAccepted } from "./order";
import { blankPiece } from "./patterns";
import { buildQuizPool, emptyQuizPool } from "./pool";
import { meaningsOverlap } from "./text";
import type { ChoiceQuestion, HasClip, Question } from "./types";

const lesson = fakeLesson(7);
const pool = buildQuizPool([lesson], 7);
const allClips: HasClip = () => true;
const noClips: HasClip = () => false;
const noTokens = () => undefined;

function build(
  step: "words" | "patterns" | "conversation",
  opts: {
    seed?: number;
    hasClip?: HasClip;
    tokensOf?: Parameters<typeof sectionQuestions>[1]["tokensOf"];
    prefer?: Set<string>;
  } = {},
): Question[] {
  return sectionQuestions(step, {
    lesson,
    pool,
    rng: seededRng(opts.seed ?? 1),
    hasClip: opts.hasClip ?? allClips,
    tokensOf: opts.tokensOf ?? noTokens,
    prefer: opts.prefer,
  });
}

const choices = (qs: Question[]) =>
  qs.filter((q): q is ChoiceQuestion => q.type === "choice");

describe("단어 구역", () => {
  it("세 문제를 서로 다른 낱말로 내고, 소리를 찾으면 듣기 문제를 먼저 낸다", () => {
    const qs = build("words");
    expect(qs).toHaveLength(3);
    expect(new Set(qs.map((q) => q.key.split(":")[3])).size).toBe(3);
    const first = qs[0] as ChoiceQuestion;
    expect(first.prompt.kind).toBe("listen");
  });

  it("소리 구간이 없으면 듣기 문제를 내지 않는다", () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const q of choices(build("words", { seed, hasClip: noClips })))
        expect(q.prompt.kind).not.toBe("listen");
  });

  it("뜻 고르기 보기에 정답과 뜻이 겹치는 낱말(나(여자)·나(남자))을 함께 두지 않는다", () => {
    for (let seed = 1; seed <= 40; seed++)
      for (const q of choices(build("words", { seed, hasClip: noClips }))) {
        if (!q.key.includes(":meaning:")) continue;
        const right = q.options[q.answer].label;
        q.options.forEach((o, i) => {
          if (i !== q.answer)
            expect(meaningsOverlap(o.label, right), `${o.label}/${right}`).toBe(
              false,
            );
        });
      }
  });

  it("읽는 법 고르기는 한자 낱말에만 내고 보기에 같은 읽기가 둘 없다", () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++)
      for (const q of choices(build("words", { seed, hasClip: noClips }))) {
        if (!q.key.includes(":reading:")) continue;
        seen++;
        expect(q.prompt.kind === "word" && q.prompt.word.ja).not.toBe("ねこ");
        const labels = q.options.map((o) => o.label);
        expect(new Set(labels).size).toBe(labels.length);
      }
    expect(seen).toBeGreaterThan(0);
  });

  it("복습할 때가 된 문제를 먼저 낸다", () => {
    const key = "L7:w:meaning:07-2#2";
    const qs = build("words", { prefer: new Set([key]), seed: 5 });
    expect(qs[0].key).toBe(key);
  });

  it("같은 씨앗이면 같은 문제를 낸다", () => {
    expect(build("words", { seed: 9 })).toEqual(build("words", { seed: 9 }));
  });
});

describe("문형 구역", () => {
  it("빈칸은 그 문형 머리의 고정 조각을 비우고, 정답 조각을 품거나 품기는 보기를 두지 않는다", () => {
    for (let seed = 1; seed <= 30; seed++)
      for (const q of choices(build("patterns", { seed, hasClip: noClips }))) {
        if (q.prompt.kind !== "blank") continue;
        const right = q.options[q.answer].label;
        expect(q.prompt.before + right + q.prompt.after).toBe(q.reveal?.ja);
        for (const o of q.options)
          if (o.label !== right) {
            expect(o.label.includes(right) || right.includes(o.label)).toBe(
              false,
            );
          }
      }
  });

  it("blankPiece: 다른 조각 안에 든 조각은 비우지 않는다", () => {
    expect(
      blankPiece("ううん、ねこじゃない。", "うん、～。 / ううん、～じゃない。"),
    ).toBe("じゃない");
    expect(blankPiece("学校の前に川。", "～の前に[まえに]")).toBe("の前に");
  });

  it("낱말 분석이 있으면 어순 맞추기를 내고, 조각을 이으면 정답 문장이 된다", () => {
    const tokensOf = (ja: string) =>
      ja === "学校の前に川。"
        ? [
            { surface: "学校", pos: "名詞" },
            { surface: "の", pos: "助詞" },
            { surface: "前", pos: "名詞" },
            { surface: "に", pos: "助詞" },
            { surface: "川", pos: "名詞" },
            { surface: "。", plain: true as const },
          ]
        : undefined;
    let found = false;
    for (let seed = 1; seed <= 30 && !found; seed++)
      for (const q of build("patterns", { seed, tokensOf, hasClip: noClips }))
        if (q.type === "order") {
          found = true;
          expect(q.answer.join("") + q.tail).toBe("学校の前に川。");
          expect(orderAccepted(q.tiles, q.shape)).toBe(false);
          expect(orderAccepted(q.answer, q.shape)).toBe(true);
          expect(q.tiles.toSorted()).toEqual(q.answer.toSorted());
        }
    expect(found).toBe(true);
  });

  it("듣고 뜻 고르기 보기의 뜻은 서로 다르다", () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const q of choices(build("patterns", { seed }))) {
        if (q.prompt.kind !== "listen") continue;
        const labels = q.options.map((o) => o.label);
        expect(new Set(labels).size).toBe(labels.length);
      }
  });
});

describe("회화 구역", () => {
  it("할 말 고르기는 맞장구(うん)처럼 짧은 줄을 내지 않고 앞 사람 말을 보인다", () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const q of choices(
        build("conversation", { seed, hasClip: noClips }),
      )) {
        expect(q.prompt.kind).toBe("say");
        expect(q.options[q.answer].label).not.toBe("うん。");
        if (q.prompt.kind === "say" && q.prompt.before)
          expect(q.prompt.before.speaker).toBeDefined();
      }
  });

  it("다시 듣기는 자연 속도(Advanced) 오디오 구간을 먼저 쓴다", () => {
    const qs = build("conversation");
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(q.clip?.item).toBe("07-4-2");
  });
});

describe("보기 재료가 모자랄 때", () => {
  it("보기를 셋 넘게 만들 수 없으면 그 문제를 내지 않는다", () => {
    const tiny = {
      ...lesson,
      examples: [
        {
          ...lesson.examples[0],
          sentences: lesson.examples[0].sentences.slice(0, 2),
        },
      ],
    };
    const qs = sectionQuestions("words", {
      lesson: tiny,
      pool: emptyQuizPool(),
      rng: seededRng(1),
      hasClip: noClips,
      tokensOf: noTokens,
    });
    for (const q of choices(qs))
      expect(q.options.length).toBeGreaterThanOrEqual(3);
  });
});
