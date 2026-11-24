import type { Rng } from "@/lib/ilmunta/random";
import { hasKanji } from "@/lib/ilmuta/ruby";
import { examplesOf } from "@/lib/ilmuta/steps";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import {
  arrange,
  assemble,
  enoughOptions,
  MAX_OPTIONS,
  type Maker,
  takeDistractors,
} from "./pick";
import type { PoolWord, QuizPool } from "./pool";
import { meaningsOverlap, readingSlips } from "./text";
import type { ChoiceQuestion, HasClip, Question } from "./types";

// 단어 구역 끝 문제: 소리 듣고 낱말 고르기, 뜻 고르기, 읽는 법 고르기.

interface WordTarget {
  item: string;
  index: number;
  word: Sentence;
}

/** 가나만인 낱말은 글 자체가 읽는 법이다 */
const kanaOf = (w: { ja: string; reading?: string }) => w.reading ?? w.ja;

const show = (w: { ja: string; reading?: string }) =>
  w.reading && w.reading !== w.ja ? `${w.ja}（${w.reading}）` : w.ja;

export function wordTargets(lesson: IlmutaLesson): WordTarget[] {
  return examplesOf(lesson, "words").flatMap((e) =>
    e.sentences
      .map((word, index) => ({ item: e.id, index, word }))
      .filter((t) => t.word.ko !== "" && !t.word.ja.startsWith("～")),
  );
}

export function wordQuestions(
  lesson: IlmutaLesson,
  pool: QuizPool,
  rng: Rng,
  hasClip: HasClip,
  prefer?: ReadonlySet<string>,
): Question[] {
  const targets = wordTargets(lesson);
  const here: PoolWord[] = targets.map((t) => ({
    ...t.word,
    lesson: lesson.no,
  }));
  const before = pool.words.filter((w) => !here.some((h) => h.ja === w.ja));
  const keyOf = (kind: string) => (t: WordTarget) =>
    `L${lesson.no}:w:${kind}:${t.item}#${t.index}`;
  const base = (t: WordTarget, key: string) => ({
    key,
    lesson: lesson.no,
    section: "words" as const,
    reveal: { ja: t.word.ja, ko: t.word.ko, reading: t.word.reading },
    clip: hasClip(t) ? { item: t.item, index: t.index } : undefined,
  });

  const listen: Maker<WordTarget> = {
    keyOf: keyOf("listen"),
    make: (t) => {
      if (!hasClip(t)) return null;
      const kana = kanaOf(t.word);
      const wrong = takeDistractors(
        [here, before],
        (c, chosen) =>
          c.ja !== t.word.ja &&
          kanaOf(c) !== kana &&
          !chosen.some((x) => kanaOf(x) === kanaOf(c)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("listen")(t)),
        type: "choice",
        prompt: {
          kind: "listen",
          clip: { item: t.item, index: t.index },
          ask: "들린 낱말은?",
          fallback: { ja: t.word.ja, reading: t.word.reading },
        },
        ...arrange(
          { label: t.word.ja, ja: true, reading: t.word.reading },
          wrong.map((w) => ({
            label: w.ja,
            ja: true,
            reading: w.reading,
            note: `${show(w)} = '${w.ko}'`,
          })),
          rng,
        ),
        // 정답 낱말·읽는 법·뜻은 아래 다시 보이므로 따로 적지 않는다
        explain: "",
      };
      return enoughOptions(q) ? q : null;
    },
  };

  const meaning: Maker<WordTarget> = {
    keyOf: keyOf("meaning"),
    make: (t) => {
      const wrong = takeDistractors(
        [here, before],
        (c, chosen) =>
          c.ja !== t.word.ja &&
          !meaningsOverlap(c.ko, t.word.ko) &&
          !chosen.some((x) => meaningsOverlap(x.ko, c.ko)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("meaning")(t)),
        type: "choice",
        prompt: {
          kind: "word",
          // 뜻을 묻는 문제라 읽는 법은 보인다(한자를 못 읽어 뜻을 못 맞히지 않게)
          word: { ja: t.word.ja, reading: t.word.reading },
          ask: "뜻은?",
        },
        ...arrange(
          { label: t.word.ko },
          wrong.map((w) => ({ label: w.ko, note: `'${w.ko}' = ${show(w)}` })),
          rng,
        ),
        explain: "",
      };
      return enoughOptions(q) ? q : null;
    },
  };

  const reading: Maker<WordTarget> = {
    keyOf: keyOf("reading"),
    make: (t) => {
      const r = t.word.reading;
      if (!r || r === t.word.ja || !hasKanji(t.word.ja)) return null;
      // 헷갈리는 쪽으로 바꾼 읽기 하나 + 다른 낱말의 읽기(글자 수가 비슷한 것)
      const slips = takeDistractors([readingSlips(r)], () => true, 1, rng);
      const len = Array.from(r).length;
      const others = takeDistractors(
        [
          [...here, ...before].filter(
            (w) =>
              w.reading && Math.abs(Array.from(w.reading).length - len) <= 1,
          ),
          [...here, ...before].filter((w) => w.reading),
        ],
        (c, chosen) =>
          c.reading !== r &&
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
          word: { ja: t.word.ja },
          ask: `읽는 법은? (뜻: ${t.word.ko})`,
        },
        ...arrange(
          { label: r, ja: true },
          [
            ...slips.map((s) => ({ label: s.reading, ja: true, note: s.why })),
            ...others.map((w) => ({
              label: w.reading ?? "",
              ja: true,
              note: `${w.reading} = ${w.ja}('${w.ko}')의 읽는 법`,
            })),
          ],
          rng,
        ),
        explain: "",
      };
      return enoughOptions(q) ? q : null;
    },
  };

  return assemble(
    targets,
    [listen, meaning, reading],
    (t) => `${t.item}#${t.index}`,
    rng,
    prefer,
  );
}
