import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { buildGlossary, type Glossary, hasKanji } from "@/lib/ilmuta/ruby";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import { type CardSource, type CueWord, findWords } from "./cards";
import { normalizeJa } from "./match";
import type { TranscriptPair } from "./transcript-pairs";

// 자막 하나에 카드를 붙일 재료(맞출 소책자 문장·읽는 법 사전·낱말)를 고른다. 파일을 읽지 않는 순수 함수다.

/** 오디오 항목 이름에서 강·과 번호: 강의 `L10`·`L10-01`, 예문 `10-3`·`10-4-1` */
export function lessonNoOfItem(item: string): number | null {
  const m = item.match(/^L?(\d{1,3})(?:-|$)/);
  return m ? Number(m[1]) : null;
}

function wordsOfLesson(lesson: IlmutaLesson): Sentence[] {
  return [
    ...lesson.examples
      .filter((e) => e.kind === "words")
      .flatMap((e) => e.sentences),
    ...(lesson.conversationWords ?? []),
  ];
}

function toCueWord(s: Sentence): CueWord | null {
  if (!s.ko) return null;
  return s.reading && s.reading !== s.ja
    ? { ja: s.ja, reading: s.reading, ko: s.ko }
    : { ja: s.ja, ko: s.ko };
}

/** `uptoNo`강까지 일무따에서 배운 낱말 */
export function ilmutaWords(
  lessons: IlmutaLesson[],
  uptoNo: number,
): CueWord[] {
  return lessons
    .filter((l) => l.no <= uptoNo)
    .flatMap(wordsOfLesson)
    .map(toCueWord)
    .filter((w): w is CueWord => w !== null);
}

/** 강 제목 문장(소책자 강 머리). 예문 mp3 첫머리와 강의에서 읽는다 */
function titleSentence(lesson: IlmutaLesson): Sentence[] {
  return lesson.title ? [{ ja: lesson.title, ko: lesson.titleKo ?? "" }] : [];
}

/**
 * 예문 mp3가 읽는 소책자 문장의 차례. 기본 회화 듣기(-1)는 강 제목 뒤에 회화를 읽는다.
 * 연습 문제(-5)·장문(-6)은 소책자에 글이 없어 차례를 모른다(undefined).
 */
export function orderedSentences(
  lesson: IlmutaLesson,
  item: string,
): Sentence[] | undefined {
  const example = lesson.examples.find((e) => e.id === item);
  if (!example) return undefined;
  if (example.kind === "dialogue") {
    const conversation =
      lesson.examples.find((e) => e.kind === "conversationBasic")?.sentences ??
      [];
    return [...titleSentence(lesson), ...conversation];
  }
  return example.sentences.length > 0 ? example.sentences : undefined;
}

/**
 * 일무따 강의·예문: 그 강의 소책자 문장(제목·예문·회화·단어)과 맞추고,
 * 읽는 법과 낱말은 그 강까지 배운 단어로 단다. item이 예문 mp3면 읽는 차례도 넘긴다.
 */
export function ilmutaCardSource(
  lessons: IlmutaLesson[],
  no: number,
  item?: string,
): CardSource {
  const lesson = lessons.find((l) => l.no === no);
  const ordered = lesson && item ? orderedSentences(lesson, item) : undefined;
  return {
    sentences: lesson
      ? [
          ...titleSentence(lesson),
          ...lesson.examples.flatMap((e) => e.sentences),
          ...(lesson.conversationWords ?? []),
        ]
      : [],
    ...(ordered ? { ordered } : {}),
    glossary: buildGlossary(lessons, no),
    words: ilmutaWords(lessons, no),
    // 한글 소리로 찾을 낱말은 그 강에서 익히는 것만(많으면 한국어 말과 잘못 닮는다)
    focus: lesson
      ? wordsOfLesson(lesson)
          .map(toCueWord)
          .filter((w): w is CueWord => w !== null)
      : [],
  };
}

/** 일문따 드릴에 쓰는 기초 동사·형용사·명사(세션이 고른 낱말, 교재 글이 아니다) */
function drillWords(): CueWord[] {
  return [...VERBS, ...ADJECTIVES].map((w) =>
    w.reading !== w.dict
      ? { ja: w.dict, reading: w.reading, ko: w.ko }
      : { ja: w.dict, ko: w.ko },
  );
}

/** 일문따에서 쓰는 낱말: 드릴 낱말과, 일무따 출처를 볼 수 있으면 일무따 전체 단어 */
function ilmuntaWords(ilmutaLessons: IlmutaLesson[] | null): CueWord[] {
  return [
    ...drillWords(),
    ...(ilmutaLessons
      ? ilmutaWords(ilmutaLessons, Number.POSITIVE_INFINITY)
      : []),
  ];
}

function glossaryOf(words: CueWord[]): Glossary {
  const glossary: Glossary = {};
  for (const w of words)
    if (w.reading && hasKanji(w.ja) && !(w.ja in glossary))
      glossary[w.ja] = w.reading;
  return glossary;
}

/** 일문따 낱말의 한자 → 읽는 법(받아 적은 두 일본어를 가나로 풀어 견줄 때도 쓴다) */
export function ilmuntaGlossary(
  ilmutaLessons: IlmutaLesson[] | null,
): Glossary {
  return glossaryOf(ilmuntaWords(ilmutaLessons));
}

/**
 * 아는 낱말 전체의 비교용 글(표기·읽는 법). 가타카나 줄이 진짜 외래어인지 가를 때 쓴다(misheard.ts).
 * 일무따 출처를 볼 수 없으면 드릴 낱말만.
 */
export function knownWordForms(lessons: IlmutaLesson[] | null): Set<string> {
  const out = new Set<string>();
  for (const w of ilmuntaWords(lessons))
    for (const form of [w.ja, w.reading ?? ""]) {
      const plain = normalizeJa(form.replace(/[～~]/g, ""));
      if ([...plain].length >= 2) out.add(plain);
    }
  return out;
}

/** な형용사·동사·い형용사의 활용하지 않는 앞부분(得意な → 得意, 食べる → 食べ). 두 글자 미만이면 null */
function stemOf(ja: string): string | null {
  if (!hasKanji(ja)) return null;
  const stem = ja.replace(/[なだいうくぐすつぬぶむる]$/u, "");
  return stem !== ja && [...stem].length >= 2 ? stem : null;
}

/** 글 속에 표기나 활용하지 않는 앞부분이 나오는 낱말(활용한 꼴로 나와도 찾는다) */
function wordsInText(text: string, words: CueWord[]): CueWord[] {
  const out = findWords(text, words, Number.POSITIVE_INFINITY);
  for (const w of words) {
    if (out.includes(w)) continue;
    const stem = stemOf(w.ja);
    if (stem && text.includes(stem)) out.push(w);
  }
  return out;
}

/**
 * 일문따: 소책자에 예문 글이 없어서, 그 과 문법 예문 자막에서 찾은 일본어·뜻 되풀이 짝
 * (transcript-pairs.ts)을 문장 후보로 쓴다. 받아 적은 글이라 출처를 transcript로 둔다.
 * 낱말은 일문따 드릴 낱말과, 일무따 출처를 볼 수 있으면 일무따 전체 단어.
 */
export function ilmuntaCardSource(
  ilmutaLessons: IlmutaLesson[] | null,
  pairs: TranscriptPair[] = [],
  lessonNo: number | null = null,
): CardSource {
  const words = ilmuntaWords(ilmutaLessons);
  const glossary = glossaryOf(words);
  // 한글 소리로 찾을 낱말: 그 과 예문 짝에 나오는 낱말과, 교재 색인상 그 과에서 처음 나오는 드릴 낱말
  const focus = [
    ...wordsInText(pairs.map((p) => p.ja).join("　"), words),
    ...(lessonNo === null
      ? []
      : drillWords().filter((w) => WORD_LESSONS[w.ja]?.ilmunta === lessonNo)),
  ];
  return {
    sentences: pairs.map((p) => ({ ja: p.ja, ko: p.ko })),
    origin: "transcript",
    glossary,
    words,
    focus,
  };
}
