import { skillsOfLesson } from "@/lib/ilmunta/curriculum";
import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { buildGlossary, type Glossary, hasKanji } from "@/lib/ilmuta/ruby";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import { type CardSource, type CueWord, findWords } from "./cards";
import { conjugatedForms } from "./conjugations";
import { normalizeJa } from "./match";
import { repairMeaning } from "./meaning";
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
 * 파일에서 모은 그 강·과의 덧붙일 재료. 일무따: 낱말 분석의 등장인물 이름과 한자 읽기(lesson-names.ts).
 * 일문따: 같은 과 예문 mp3 자막의 일본어 줄(ilmunta-pairs.ts의 ilmuntaLessonLines).
 */
export interface LessonExtras {
  names?: CueWord[];
  glossary?: Glossary;
  echoes?: string[];
}

/**
 * 일무따 강의·예문: 그 강의 소책자 문장(제목·예문·회화·단어)과 맞추고,
 * 읽는 법과 낱말은 그 강까지 배운 단어로 단다. item이 예문 mp3면 읽는 차례도 넘긴다.
 * extras가 있으면 등장인물 이름을 문형 틀 빈칸 재료로, 분석 읽기를 한자 풀이에 보탠다.
 */
export function ilmutaCardSource(
  lessons: IlmutaLesson[],
  no: number,
  item?: string,
  extras: LessonExtras | null = null,
): CardSource {
  const lesson = lessons.find((l) => l.no === no);
  const ordered = lesson && item ? orderedSentences(lesson, item) : undefined;
  // 한글 소리로 찾을 낱말은 그 강에서 익히는 것만(많으면 한국어 말과 잘못 닮는다)
  const focus = lesson
    ? wordsOfLesson(lesson)
        .map(toCueWord)
        .filter((w): w is CueWord => w !== null)
    : [];
  return {
    sentences: lesson
      ? [
          ...titleSentence(lesson),
          ...lesson.examples.flatMap((e) => e.sentences),
          ...(lesson.conversationWords ?? []),
        ]
      : [],
    ...(ordered ? { ordered } : {}),
    glossary: { ...(extras?.glossary ?? {}), ...buildGlossary(lessons, no) },
    words: ilmutaWords(lessons, no),
    focus,
    fixed: {
      frames: lesson?.examples.flatMap((e) => e.patterns ?? []) ?? [],
      fillers: [...focus, ...(extras?.names ?? [])],
      conjugations: conjugatedForms(),
    },
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

/**
 * 낱말 표의 한 글자 한자와 겹치지만 읽기가 다른 높임 동사의 앞부분(下さる·下さい의 下는 した가 아니다).
 * 앞에서부터 가장 긴 것을 고르므로 이 앞부분이 한 글자 낱말보다 먼저 걸린다.
 */
const HONORIFIC_STEMS: Glossary = { 下さ: "くださ" };

function glossaryOf(words: CueWord[]): Glossary {
  const glossary: Glossary = { ...HONORIFIC_STEMS };
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
 * 아는 낱말의 가나 비교용 글. 장음 기호(ー)는 뺀다. 가타카나 줄이 진짜 일본어 낱말인지 가를 때 쓴다(misheard.ts).
 * 가나로 적는 낱말(외래어 등)은 두 글자부터, 한자 낱말의 읽는 법은 세 글자부터 넣는다
 * (두 글자 읽는 법은 가타카나로 적힌 한국어 말과 우연히 같기 쉽다: オール → おる → 折る).
 * 일무따 출처를 볼 수 없으면 드릴 낱말만.
 */
export function knownWordForms(lessons: IlmutaLesson[] | null): Set<string> {
  const out = new Set<string>();
  const add = (form: string, min: number) => {
    const plain = normalizeJa(form.replace(/[～~ー]/g, ""));
    if ([...plain].length >= min) out.add(plain);
  };
  for (const w of ilmuntaWords(lessons)) {
    if (!hasKanji(w.ja)) add(w.ja, 2);
    else if (w.reading) add(w.reading, 3);
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
 * 강사의 설명으로 보이는 한국어(뜻을 옮긴 말이 아니다). 「~하면·~라고·~합시다」는 뜻을 옮긴 말에도
 * 자주 나와(조건문·인용문·권유문) 넣지 않았다.
 */
const EXPLAINING =
  /번에서|번은|되겠|이렇게|연습|표현|붙여|붙이|해 ?봅|볼까|단계|문장|뜻|의미|동사|형용사|명사|조사|활용|바꿔|바꾸/u;

/**
 * 강의가 일본어 사이에 한 한국어 줄이 그 일본어의 뜻으로 볼 만한가.
 * 일문따 강의 801쌍을 보니 사이 줄은 거의 뜻을 옮긴 말이고, 아닌 것은 문형·차례를 설명하는 말투였다.
 * 설명 말투가 없고 길이가 일본어에 걸맞을 때(한글 음절 수가 일본어 글자 수의 두 배 + 4 이하)만 뜻으로 본다.
 */
export function looksLikeMeaning(ja: string, ko: string): boolean {
  if (EXPLAINING.test(ko)) return false;
  // 조사로 끝난 토막(「수류는」: する를 한국어로 읽으며 말을 이어 감)은 뜻을 옮긴 문장이 아니다
  if (/[은는을를][\s.,?!]*$/u.test(ko)) return false;
  const syllables = ko.replace(/[^가-힣]/gu, "").length;
  const jaChars = [...normalizeJa(ja)].length;
  return syllables > 0 && syllables <= jaChars * 2 + 4;
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
  extras: LessonExtras | null = null,
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
  // 받아 적은 뜻의 오타는 그 문장에 든 낱말(자리가 확인된 것)의 뜻으로 바로잡는다
  const sentences = pairs.map((p) => ({
    ja: p.ja,
    ko: p.ko
      ? repairMeaning(
          p.ko,
          findWords(p.ja, words, Number.POSITIVE_INFINITY, true),
        )
      : p.ko,
  }));
  return {
    sentences,
    origin: "transcript",
    glossary,
    words,
    focus,
    // 강사가 그 과의 활용형을 즉석에서 말한 줄을 드릴 활용형 표로 알아본다
    fixed: {
      conjugations: conjugatedForms(),
      lessonSkills:
        lessonNo === null
          ? undefined
          : new Set(skillsOfLesson(lessonNo).map((s) => s.key)),
      echoes: extras?.echoes,
      sentences,
    },
  };
}
