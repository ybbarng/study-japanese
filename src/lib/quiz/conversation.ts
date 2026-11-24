import type { Rng } from "@/lib/ilmunta/random";
import { conversationScripts } from "@/lib/ilmuta/conversation";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import {
  arrange,
  assemble,
  enoughOptions,
  MAX_OPTIONS,
  type Maker,
  takeDistractors,
} from "./pick";
import type { QuizPool } from "./pool";
import { bareLength, sameSentenceKo } from "./text";
import type { ChoiceQuestion, ClipRef, HasClip, Question } from "./types";

// 회화 구역 끝 문제: 이 상황에서 할 말 고르기, 회화 한 줄 듣고 뜻 고르기.

interface LineTarget {
  /** 대본 열쇠(첫 예문 id) */
  script: string;
  index: number;
  line: Sentence;
  prev?: Sentence;
  /** 이 줄을 읽는 예문 mp3들(자연 속도 Advanced를 먼저) */
  items: string[];
  others: Sentence[];
}

/** 할 말 고르기로 낼 줄: 너무 짧은 맞장구(うん)와 긴 줄은 뺀다 */
const SAY_MIN = 4;
const SAY_MAX = 22;

export function lineTargets(lesson: IlmutaLesson): LineTarget[] {
  return conversationScripts(lesson).flatMap((script) => {
    const items = script.examples
      .toSorted(
        (a, b) =>
          Number(b.kind === "conversationAdvanced") -
          Number(a.kind === "conversationAdvanced"),
      )
      .map((e) => e.id);
    return script.sentences.map((line, index) => ({
      script: script.examples[0].id,
      index,
      line,
      prev: script.sentences[index - 1],
      items,
      others: script.sentences.filter((_, i) => i !== index),
    }));
  });
}

export function conversationQuestions(
  lesson: IlmutaLesson,
  pool: QuizPool,
  rng: Rng,
  hasClip: HasClip,
  prefer?: ReadonlySet<string>,
): Question[] {
  const targets = lineTargets(lesson);
  const before = pool.lines.filter((l) => l.lesson !== lesson.no);
  const keyOf = (kind: string) => (t: LineTarget) =>
    `L${lesson.no}:c:${kind}:${t.script}#${t.index}`;
  const clipOf = (t: LineTarget): ClipRef | undefined =>
    t.items.map((item) => ({ item, index: t.index })).find((c) => hasClip(c));
  const base = (t: LineTarget, key: string) => ({
    key,
    lesson: lesson.no,
    section: "conversation" as const,
    reveal: { ja: t.line.ja, ko: t.line.ko },
    clip: clipOf(t),
  });
  const len = (s: { ja: string }) => bareLength(s.ja);
  const distinct = (t: LineTarget) => (c: { ja: string; ko: string }) =>
    c.ja !== t.line.ja &&
    c.ko !== "" &&
    !sameSentenceKo(c.ko, t.line.ko) &&
    len(c) >= 2;

  const say: Maker<LineTarget> = {
    keyOf: keyOf("say"),
    make: (t) => {
      const n = len(t.line);
      if (n < SAY_MIN || n > SAY_MAX || t.line.ko === "") return null;
      const near = (c: { ja: string }) => Math.abs(len(c) - n) <= n / 2 + 2;
      const wrong = takeDistractors<{ ja: string; ko: string }>(
        [t.others.filter(near), before.filter(near), t.others],
        (c, chosen) =>
          distinct(t)(c) &&
          !chosen.some((x) => x.ja === c.ja || sameSentenceKo(x.ko, c.ko)),
        MAX_OPTIONS - 1,
        rng,
      );
      const prev =
        t.prev && t.prev.speaker !== t.line.speaker ? t.prev : undefined;
      const q: ChoiceQuestion = {
        ...base(t, keyOf("say")(t)),
        type: "choice",
        prompt: {
          kind: "say",
          ko: t.line.ko,
          ask: prev ? "이어서 이렇게 말하려면?" : "이렇게 말하려면?",
          before: prev
            ? { speaker: prev.speaker, ja: prev.ja, ko: prev.ko }
            : undefined,
        },
        ...arrange(
          { label: t.line.ja, ja: true },
          wrong.map((w) => ({
            label: w.ja,
            ja: true,
            note: `${w.ja} = '${w.ko}'`,
          })),
          rng,
        ),
        explain: `${t.line.ja} = '${t.line.ko}'`,
      };
      return enoughOptions(q) ? q : null;
    },
  };

  const listen: Maker<LineTarget> = {
    keyOf: keyOf("listen"),
    make: (t) => {
      const clip = clipOf(t);
      if (!clip || len(t.line) < 3 || t.line.ko === "") return null;
      const wrong = takeDistractors(
        [t.others],
        (c, chosen) =>
          distinct(t)(c) && !chosen.some((x) => sameSentenceKo(x.ko, c.ko)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("listen")(t)),
        type: "choice",
        prompt: {
          kind: "listen",
          clip,
          ask: "들은 말의 뜻은?",
          fallback: { ja: t.line.ja },
        },
        ...arrange(
          { label: t.line.ko },
          wrong.map((w) => ({ label: w.ko, note: `'${w.ko}' = ${w.ja}` })),
          rng,
        ),
        explain: `들린 말: ${t.line.ja}`,
      };
      return enoughOptions(q) ? q : null;
    },
  };

  return assemble(
    targets,
    [say, listen],
    (t) => `${t.script}#${t.index}`,
    rng,
    prefer,
  );
}
