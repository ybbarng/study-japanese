import type { Rng } from "@/lib/ilmunta/random";
import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { hasKanji } from "@/lib/ilmuta/ruby";
import {
  arrange,
  assemble,
  enoughOptions,
  MAX_OPTIONS,
  type Maker,
  QUESTIONS_PER_SECTION,
  takeDistractors,
} from "./pick";
import { meaningsOverlap, readingSlips } from "./text";
import type { ChoiceQuestion, Question } from "./types";

// 일문따 과 끝 확인 문제 가운데, 활용을 다루지 않는 과(쓰임·조사를 배우는 과)의 낱말 문제.
// 드릴 낱말(세션이 고른 기초 낱말) 가운데 그 과에서 처음 나오는 것의 뜻·읽는 법을 묻는다.
// 그 과 낱말이 모자라면 바로 앞 과들에서 처음 나온 낱말로 채운다.

export interface DrillWord {
  dict: string;
  reading: string;
  ko: string;
  /** 일문따에서 처음 나오는 과(word-lessons.ts). 모르면 null */
  ilmunta: number | null;
}

export const DRILL_WORDS: readonly DrillWord[] = [...VERBS, ...ADJECTIVES].map(
  (w) => ({
    dict: w.dict,
    reading: w.reading,
    ko: w.ko,
    ilmunta: WORD_LESSONS[w.dict]?.ilmunta ?? null,
  }),
);

const show = (w: DrillWord) =>
  w.reading !== w.dict ? `${w.dict}（${w.reading}）` : w.dict;

/** 문제로 낼 낱말: 이 과에서 처음 나오는 것, 모자라면 가까운 앞 과의 것부터 */
export function lessonWordTargets(
  lesson: number,
  words: readonly DrillWord[] = DRILL_WORDS,
  count = QUESTIONS_PER_SECTION,
): DrillWord[] {
  const here = words.filter((w) => w.ilmunta === lesson);
  if (here.length >= count) return here;
  const earlier = words
    .filter((w) => w.ilmunta !== null && w.ilmunta > 0 && w.ilmunta < lesson)
    .sort((a, b) => (b.ilmunta ?? 0) - (a.ilmunta ?? 0));
  return [...here, ...earlier.slice(0, count - here.length)];
}

/** 활용이 없는 과의 확인 문제(뜻 고르기·읽는 법 고르기) */
export function drillWordQuestions(
  lesson: number,
  rng: Rng,
  words: readonly DrillWord[] = DRILL_WORDS,
  count = QUESTIONS_PER_SECTION,
): Question[] {
  const targets = lessonWordTargets(lesson, words, count);
  // 틀린 보기는 이 과 낱말을 먼저, 모자라면 이미 아는(이 과까지 나온) 낱말
  const known = words.filter((w) => w.ilmunta === null || w.ilmunta <= lesson);
  const keyOf = (kind: string) => (w: DrillWord) =>
    `ilmunta${lesson}:w:${kind}:${w.dict}`;
  const base = (w: DrillWord, key: string) => ({
    key,
    lesson,
    section: "drill" as const,
    reveal: { ja: w.dict, ko: w.ko, reading: w.reading },
    explain: "",
  });

  const meaning: Maker<DrillWord> = {
    keyOf: keyOf("meaning"),
    make: (t) => {
      const wrong = takeDistractors(
        [targets, known],
        (c, chosen) =>
          c.dict !== t.dict &&
          !meaningsOverlap(c.ko, t.ko) &&
          !chosen.some((x) => meaningsOverlap(x.ko, c.ko)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("meaning")(t)),
        type: "choice",
        prompt: {
          kind: "word",
          word: { ja: t.dict, reading: t.reading },
          ask: "뜻은?",
        },
        ...arrange(
          { label: t.ko },
          wrong.map((w) => ({ label: w.ko, note: `'${w.ko}' = ${show(w)}` })),
          rng,
        ),
      };
      return enoughOptions(q) ? q : null;
    },
  };

  const reading: Maker<DrillWord> = {
    keyOf: keyOf("reading"),
    make: (t) => {
      if (t.reading === t.dict || !hasKanji(t.dict)) return null;
      const slips = takeDistractors(
        [readingSlips(t.reading)],
        () => true,
        1,
        rng,
      );
      const len = Array.from(t.reading).length;
      const others = takeDistractors(
        [
          known.filter(
            (w) => Math.abs(Array.from(w.reading).length - len) <= 1,
          ),
          known,
        ],
        (c, chosen) =>
          c.reading !== t.reading &&
          !slips.some((s) => s.reading === c.reading) &&
          !chosen.some((x) => x.reading === c.reading),
        MAX_OPTIONS - 1 - slips.length,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("reading")(t)),
        type: "choice",
        prompt: {
          kind: "word",
          word: { ja: t.dict },
          ask: `읽는 법은? (뜻: ${t.ko})`,
        },
        ...arrange(
          { label: t.reading, ja: true },
          [
            ...slips.map((s) => ({ label: s.reading, ja: true, note: s.why })),
            ...others.map((w) => ({
              label: w.reading,
              ja: true,
              note: `${w.reading} = ${w.dict}('${w.ko}')의 읽는 법`,
            })),
          ],
          rng,
        ),
      };
      return enoughOptions(q) ? q : null;
    },
  };

  return assemble(
    targets,
    [meaning, reading],
    (w) => w.dict,
    rng,
    undefined,
    count,
  );
}
