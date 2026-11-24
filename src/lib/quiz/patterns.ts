import { type Rng, shuffle } from "@/lib/ilmunta/random";
import { examplesOf } from "@/lib/ilmuta/steps";
import type { ShownToken } from "@/lib/songs/analysis";
import type { IlmutaLesson, Pattern, Sentence } from "@/lib/textbook/schema";
import { orderAccepted, orderable, orderChunks, orderShape } from "./order";
import {
  arrange,
  assemble,
  enoughOptions,
  MAX_OPTIONS,
  type Maker,
  takeDistractors,
} from "./pick";
import type { PoolPiece, QuizPool } from "./pool";
import {
  cleanHead,
  countOf,
  nested,
  patternPieces,
  sameSentenceKo,
} from "./text";
import type { ChoiceQuestion, HasClip, OrderQuestion, Question } from "./types";

// 문형 구역 끝 문제: 그 강 문형의 빈칸 채우기, 어순 맞추기, 예문 듣고 뜻 고르기.

interface PatternTarget {
  item: string;
  index: number;
  sentence: Sentence;
  head?: Pattern;
  /** 같은 예문 mp3의 다른 문장(듣기 문제 보기) */
  siblings: Sentence[];
}

export type TokensOf = (ja: string) => readonly ShownToken[] | undefined;

/** 빈칸으로 비울 조각: 문형 머리의 고정 조각 중 문장에 한 번만 나오고 다른 조각 안에 들지 않은 가장 긴 것 */
export function blankPiece(ja: string, head: string): string | null {
  const found = patternPieces(head).filter((p) => countOf(ja, p) === 1);
  const outer = found.filter(
    (p) => !found.some((q) => q !== p && q.includes(p)),
  );
  const best = outer.toSorted((a, b) => b.length - a.length)[0];
  if (!best || Array.from(best).length > 10) return null;
  return best;
}

export function patternTargets(lesson: IlmutaLesson): PatternTarget[] {
  return examplesOf(lesson, "patterns").flatMap((e) =>
    e.sentences.map((sentence, index) => ({
      item: e.id,
      index,
      sentence,
      head: e.patterns?.find((p) => p.no === sentence.pattern),
      siblings: e.sentences.filter((_, i) => i !== index),
    })),
  );
}

export function patternQuestions(
  lesson: IlmutaLesson,
  pool: QuizPool,
  rng: Rng,
  hasClip: HasClip,
  tokensOf: TokensOf,
  prefer?: ReadonlySet<string>,
): Question[] {
  const targets = patternTargets(lesson);
  const keyOf = (kind: string) => (t: PatternTarget) =>
    `L${lesson.no}:p:${kind}:${t.item}#${t.index}`;
  const base = (t: PatternTarget, key: string) => ({
    key,
    lesson: lesson.no,
    section: "patterns" as const,
    reveal: { ja: t.sentence.ja, ko: t.sentence.ko },
    clip: hasClip(t) ? { item: t.item, index: t.index } : undefined,
  });
  const headNote = (t: PatternTarget) =>
    t.head ? `문형 ${cleanHead(t.head.ja)} = '${cleanHead(t.head.ko)}'` : "";
  // 이 강 문형 조각을 먼저, 모자라면 앞 강 문형 조각
  const herePieces = pool.pieces.filter((p) => p.lesson === lesson.no);
  const beforePieces = pool.pieces.filter((p) => p.lesson !== lesson.no);

  const blank: Maker<PatternTarget> = {
    keyOf: keyOf("blank"),
    make: (t) => {
      if (!t.head) return null;
      const piece = blankPiece(t.sentence.ja, t.head.ja);
      if (!piece) return null;
      const at = t.sentence.ja.indexOf(piece);
      const before = t.sentence.ja.slice(0, at);
      const after = t.sentence.ja.slice(at + piece.length);
      const wrong = takeDistractors<PoolPiece>(
        [herePieces, beforePieces],
        (c, chosen) =>
          !nested(c.piece, piece) &&
          // 빈칸 앞뒤 글과 이어져 원래 문장 조각이 되는 보기는 뺀다(は 자리에 はど 같은 것)
          !t.sentence.ja.includes(before + c.piece) &&
          // 정답보다 훨씬 긴 보기는 길이만 보고 지울 수 있어 뺀다
          Array.from(c.piece).length <= Array.from(piece).length + 3 &&
          !chosen.some((x) => nested(x.piece, c.piece)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("blank")(t)),
        type: "choice",
        prompt: {
          kind: "blank",
          before,
          after,
          ko: t.sentence.ko,
          ask: "빈칸에 들어갈 말은?",
        },
        ...arrange(
          { label: piece, ja: true },
          wrong.map((w) => ({
            label: w.piece,
            ja: true,
            note: `${w.piece}: 문형 ${cleanHead(w.head)} = '${cleanHead(w.headKo)}'`,
          })),
          rng,
        ),
        explain: headNote(t),
      };
      return enoughOptions(q) ? q : null;
    },
  };

  const order: Maker<PatternTarget> = {
    keyOf: keyOf("order"),
    make: (t) => {
      // 숫자 문장(10時半から…)은 조각이 숫자·半으로 어색하게 갈려 어순 문제로 내지 않는다
      if (/[0-9０-９]/.test(t.sentence.ja)) return null;
      const tokens = tokensOf(t.sentence.ja);
      if (!tokens) return null;
      const cut = orderChunks(t.sentence.ja, tokens);
      if (!cut || !orderable(cut.chunks)) return null;
      const answer = cut.chunks.map((c) => c.text);
      const shape = orderShape(cut.chunks);
      // 섞은 차례가 이미 맞는 꼴이면 다시 섞는다(몇 번 해도 맞으면 한 칸 민다)
      let tiles = shuffle(answer, rng);
      for (let i = 0; i < 6 && orderAccepted(tiles, shape); i++)
        tiles = shuffle(answer, rng);
      if (orderAccepted(tiles, shape)) tiles = [...tiles.slice(1), tiles[0]];
      if (orderAccepted(tiles, shape)) return null;
      const q: OrderQuestion = {
        ...base(t, keyOf("order")(t)),
        type: "order",
        ko: t.sentence.ko,
        tiles,
        answer,
        tail: cut.tail,
        shape,
        tileTokens: Object.fromEntries(
          cut.chunks.map((c) => [c.text, c.tokens]),
        ),
        explain: headNote(t),
      };
      return q;
    },
  };

  const listen: Maker<PatternTarget> = {
    keyOf: keyOf("listen"),
    make: (t) => {
      if (!hasClip(t)) return null;
      const wrong = takeDistractors(
        [
          // 같은 문형 예문(낱말 하나만 다른 것)을 먼저: 귀로 낱말을 가려내게
          t.siblings.filter((s) => s.pattern === t.sentence.pattern),
          t.siblings,
        ],
        (c, chosen) =>
          c.ja !== t.sentence.ja &&
          c.ko !== "" &&
          !sameSentenceKo(c.ko, t.sentence.ko) &&
          !chosen.some((x) => sameSentenceKo(x.ko, c.ko)),
        MAX_OPTIONS - 1,
        rng,
      );
      const q: ChoiceQuestion = {
        ...base(t, keyOf("listen")(t)),
        type: "choice",
        prompt: {
          kind: "listen",
          clip: { item: t.item, index: t.index },
          ask: "들은 문장의 뜻은?",
          fallback: { ja: t.sentence.ja },
        },
        ...arrange(
          { label: t.sentence.ko },
          wrong.map((w) => ({ label: w.ko, note: `'${w.ko}' = ${w.ja}` })),
          rng,
        ),
        explain: headNote(t),
      };
      return enoughOptions(q) ? q : null;
    },
  };

  return assemble(
    targets,
    [blank, order, listen],
    (t) => `${t.item}#${t.index}`,
    rng,
    prefer,
  );
}
