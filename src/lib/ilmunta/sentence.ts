import type { Adjective } from "./adjective";
import type { Form, Verb } from "./conjugate";
import type { Skill } from "./curriculum";
import { type KoForm, koNoun, koPredicate } from "./korean";
import {
  adjQuestionOf,
  learnedBy,
  makeQuestion,
  pickAvoiding,
  type Question,
  verbFitsForm,
  verbQuestionOf,
} from "./question";
import { pick, type Rng } from "./random";
import { FRAMES, type Frame } from "./sentence-frames";
import { SCENES, type SceneWord } from "./sentence-words";
import { VERB_BY_DICT } from "./verbs";
import { ADJECTIVES } from "./words";

/**
 * 활용 기술 하나를 짧은 문장 속 빈칸 문제로 낸다.
 * 문장 틀(sentence-frames.ts)이 활용형을 정하고, 틀의 장면(sentence-words.ts)에서 기술의 갈래에 맞는 낱말을 고른다.
 * 정답·맞는 답·규칙·보기는 활용표 문제와 같은 함수로 만든다(채점·약점 추적이 같다).
 */

const ADJ_BY_DICT: ReadonlyMap<string, Adjective> = new Map(
  ADJECTIVES.map((a) => [a.dict, a]),
);

type Candidate = { word: SceneWord; verb?: Verb; adj?: Adjective };

/** 이 틀이 이 기술에 받을 수 있는 낱말(upTo를 주면 그 과까지 배운 낱말만) */
function candidates(frame: Frame, skill: Skill, upTo?: number): Candidate[] {
  const scene = SCENES[frame.scene];
  if (skill.kind === "verb" && frame.kind === "verb") {
    if (frame.form !== skill.form) return [];
    return scene.flatMap((word) => {
      const verb = VERB_BY_DICT.get(word.dict);
      return verb &&
        verb.group === skill.group &&
        verbFitsForm(verb, frame.form) &&
        learnedBy(verb, upTo)
        ? [{ word, verb }]
        : [];
    });
  }
  if (skill.kind === "adj" && frame.kind === "adj") {
    if (frame.form !== skill.form || !frame.adjKinds.includes(skill.adjKind))
      return [];
    return scene.flatMap((word) => {
      const adj = ADJ_BY_DICT.get(word.dict);
      if (!adj || adj.kind !== skill.adjKind || !learnedBy(adj, upTo))
        return [];
      if (frame.tone && word.tone !== frame.tone) return [];
      return [{ word, adj }];
    });
  }
  return [];
}

/**
 * 이 기술을 낼 수 있는 틀과 그 낱말들.
 * `upTo`를 주면 그 과까지 배운 낱말만 넣고, 넣을 낱말이 하나도 없는 틀은 뺀다
 */
export function framesFor(
  skill: Skill,
  upTo?: number,
): { frame: Frame; words: Candidate[] }[] {
  return FRAMES.map((frame) => ({
    frame,
    words: candidates(frame, skill, upTo),
  })).filter((x) => x.words.length > 0);
}

/** 문장으로 낼 수 있는 기술인지(문형·경어·자타동사 등은 활용표 문제로만 낸다) */
export function hasSentence(skill: Skill): boolean {
  return framesFor(skill).length > 0;
}

/** 일본어 낱말을 표기로(한자가 있으면 읽기를 단다) */
function rubyMark(f: Form): string {
  return f.kanji === f.reading ? f.kanji : `[${f.kanji}|${f.reading}]`;
}

function koOf(c: Candidate, form: KoForm): string {
  if (c.adj?.kind === "noun") return koNoun(c.word.ko[0], form);
  const kind = c.verb || c.word.koVerb ? "verb" : "adj";
  return koPredicate(c.word.ko, form, kind);
}

/** 겹친 빈칸을 하나로, 문장부호 앞 빈칸을 지운다 */
function tidyKo(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

function render(frame: Frame, c: Candidate): Question["sentence"] {
  const base: Form = c.verb
    ? { kanji: c.verb.dict, reading: c.verb.reading }
    : { kanji: c.adj?.dict ?? "", reading: c.adj?.reading ?? "" };
  const ja = frame.ja
    .replaceAll("{pre}", c.word.pre)
    .replaceAll("{post}", c.word.post ?? "")
    .replaceAll("{word}", rubyMark(base));
  const [before, after = ""] = ja.split("{_}");
  const ko = frame.ko
    .replaceAll("{pre}", c.word.koPre)
    .replaceAll("{post}", c.word.koPost ?? "")
    .replaceAll("{v}", koOf(c, frame.koForm))
    .replace(/\{w:(\w+)\}/g, (_, form: KoForm) => koOf(c, form));
  return { frameId: frame.id, before, after, ko: tidyKo(ko) };
}

/**
 * 기술 하나로 문장 빈칸 문제를 만든다. 낼 틀이 없으면 null(부르는 쪽이 활용표 문제로 낸다).
 * `avoidWord`는 바로 앞 문제의 낱말(사전형), `upTo`는 배운 범위의 마지막 과.
 * 앞 문제 낱말밖에 못 넣는 틀은 다른 틀이 있으면 고르지 않는다(같은 낱말이 잇달아 나오지 않게)
 */
export function makeSentenceQuestion(
  skill: Skill,
  rng: Rng,
  avoidWord?: string,
  upTo?: number,
): Question | null {
  const options = framesFor(skill, upTo);
  if (options.length === 0) return null;
  const fresh = options.filter((o) =>
    o.words.some((w) => w.word.dict !== avoidWord),
  );
  const { frame, words } = pick(fresh.length > 0 ? fresh : options, rng);
  const c = pickAvoiding(words, rng, (x) => x.word.dict, avoidWord);
  const q =
    skill.kind === "verb" && c.verb
      ? verbQuestionOf(skill, c.verb, rng)
      : skill.kind === "adj" && c.adj
        ? adjQuestionOf(skill, c.adj, rng)
        : null;
  if (!q) return null;
  return { ...q, id: `${q.id}|${frame.id}`, sentence: render(frame, c) };
}

export type QuestionStyle = "sentence" | "table";

/**
 * 드릴이 부르는 문제 만들기: 문장 방식이면 문장으로 내고, 낼 틀이 없는 기술만 활용표로.
 * `upTo`(배운 범위의 마지막 과)를 주면 그 과까지 배운 낱말만 쓴다
 */
export function makeDrillQuestion(
  skill: Skill,
  style: QuestionStyle,
  rng: Rng,
  avoidWord?: string,
  upTo?: number,
): Question {
  if (style === "sentence") {
    const q = makeSentenceQuestion(skill, rng, avoidWord, upTo);
    if (q) return q;
  }
  return makeQuestion(skill, rng, avoidWord, upTo);
}
