import { mergeGlosses } from "@/lib/dictionary/glosses";
import { skillsOfLesson } from "@/lib/ilmunta/curriculum";
import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { buildGlossary, type Glossary, hasKanji } from "@/lib/ilmuta/ruby";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import {
  type CardSource,
  type CueWord,
  findWords,
  type InflectedWord,
} from "./cards";
import { conjugatedForms } from "./conjugations";
import type { DictChips } from "./dict-words";
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
 * 소책자에 원문이 없는 예문 mp3인가: 일무따 연습 문제(`-5`)·장문(`-6`), 일문따 읽기 글(`-2`).
 * 이 오디오의 맞추지 못한 일본어 줄은 잡음보다 받아 적은 글로 보인다(cards.ts의 noBookText)
 */
export function itemWithoutBookText(book: string, item: string): boolean {
  if (book === "ilmuta") return /^\d{1,3}-[56]$/.test(item);
  if (book === "ilmunta") return /^\d{1,3}-2$/.test(item);
  return false;
}

let allInflected: InflectedWord[] | null = null;

/**
 * 드릴 낱말의 활용한 꼴 → 사전형 칩(받아 적은 글에서 食べました를 食べる로 알아본다).
 * allowed로 낱말을 고른다(일무따는 그 강까지 배운 것만). 두 낱말에 같은 꼴이 있으면(開いて: あく·ひらく)
 * 어느 쪽인지 모르니 뺀다. 사전형과 같은 꼴은 낱말 목록이 이미 찾는다.
 */
export function inflectedWords(
  allowed?: (dict: string) => boolean,
): InflectedWord[] {
  if (!allowed) {
    allInflected ??= inflectedWords(() => true);
    return allInflected;
  }
  const byForm = new Map<string, InflectedWord | null>();
  for (const f of conjugatedForms()) {
    if (!allowed(f.dict) || f.kanji === f.dict) continue;
    const word: CueWord =
      f.dictReading !== f.dict
        ? { ja: f.dict, reading: f.dictReading, ko: f.ko }
        : { ja: f.dict, ko: f.ko };
    const had = byForm.get(f.kanji);
    if (had === undefined) byForm.set(f.kanji, { form: f.kanji, word });
    else if (had !== null && had.word.ja !== f.dict) byForm.set(f.kanji, null);
  }
  return [...byForm.values()].filter((f): f is InflectedWord => f !== null);
}

/**
 * 파일에서 모은 그 강·과의 덧붙일 재료. 일무따: 낱말 분석의 등장인물 이름과 한자 읽기(lesson-names.ts).
 * 일문따: 같은 과 예문 mp3 자막의 일본어 줄(ilmunta-pairs.ts의 ilmuntaLessonLines).
 */
export interface LessonExtras {
  names?: CueWord[];
  glossary?: Glossary;
  echoes?: string[];
  /** 사전 색인에서 고른 칩 낱말(dict-words.ts). 받아 적은 글에서만 더 찾는다 */
  dict?: DictChips;
  /** 받아 적은 문장의 읽는 법(문장 읽기 파일, sentence-readings.ts). 열쇠는 plainForm(ja) */
  sentenceReadings?: ReadonlyMap<string, string>;
}

let formReadings: Glossary | null = null;

/**
 * 드릴 낱말 활용한 꼴의 표기 → 읽기(来ない → こない). 활용 엔진이 만든 꼴이라 읽기가 정확하다.
 * 같은 표기에 읽기가 둘이면(行った: いった·おこなった) 어느 쪽인지 모르니 뺀다
 */
export function conjugatedFormReadings(): Glossary {
  if (formReadings) return formReadings;
  const seen = new Map<string, string | null>();
  for (const f of conjugatedForms()) {
    if (!hasKanji(f.kanji) || [...f.kanji].length < 2) continue;
    const had = seen.get(f.kanji);
    if (had === undefined) seen.set(f.kanji, f.reading);
    else if (had !== f.reading) seen.set(f.kanji, null);
  }
  formReadings = {};
  for (const [form, reading] of seen) if (reading) formReadings[form] = reading;
  return formReadings;
}

/**
 * 받아 적은 글에 읽는 법을 달 낱말 표: 기본 낱말 표에, 읽기가 하나뿐인 사전 색인 낱말과
 * 드릴 활용한 꼴을 보탠다(기본 낱말 표가 먼저). 자리 확인은 그대로 거친다(word-bounds.ts)
 */
export function heardGlossaryOf(
  glossary: Glossary,
  extras: LessonExtras | null,
): Glossary {
  const out: Glossary = { ...conjugatedFormReadings() };
  for (const w of extras?.dict?.words ?? [])
    if (w.reading && hasKanji(w.ja) && !readingNeedsContext(w))
      out[w.ja] = w.reading;
  return { ...out, ...glossary };
}

/**
 * 앞뒤를 봐야 읽기가 정해지는 사전 낱말: 세는 말·접미사(뜻이 ~로 시작: 時 じ는 수 뒤에서만, 君 くん은 이름 뒤에서만)와
 * 「수 + 세는 말」 낱말(1日·一日 ついたち는 「하루에」의 いちにち이기도 하다)
 */
function readingNeedsContext(w: CueWord): boolean {
  return (
    /^[~～]/u.test(w.ko) ||
    /[0-9０-９]/u.test(w.ja) ||
    /^[一二三四五六七八九十百千何]+[日時月年分回個本枚人]$/u.test(w.ja)
  );
}

/** 받아 적은 글에서 찾을 낱말의 활용한 꼴: 드릴 활용형과 사전 색인(예문 분석)의 꼴 */
function heardInflected(
  drill: InflectedWord[],
  extras: LessonExtras | null,
): InflectedWord[] {
  return [...drill, ...(extras?.dict?.inflected ?? [])];
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
  const learnedInIlmuta = (dict: string) => {
    const first = WORD_LESSONS[dict]?.ilmuta;
    return first !== undefined && first <= no;
  };
  // 한글 소리로 찾을 낱말은 그 강에서 익히는 것만(많으면 한국어 말과 잘못 닮는다)
  const focus = lesson
    ? wordsOfLesson(lesson)
        .map(toCueWord)
        .filter((w): w is CueWord => w !== null)
    : [];
  const glossary = {
    ...(extras?.glossary ?? {}),
    ...buildGlossary(lessons, no),
  };
  return {
    sentences: lesson
      ? [
          ...titleSentence(lesson),
          ...lesson.examples.flatMap((e) => e.sentences),
          ...(lesson.conversationWords ?? []),
        ]
      : [],
    ...(ordered ? { ordered } : {}),
    glossary,
    heardGlossary: heardGlossaryOf(glossary, extras),
    ...(extras?.sentenceReadings
      ? { sentenceReadings: extras.sentenceReadings }
      : {}),
    words: withAllMeanings(ilmutaWords(lessons, no)),
    // 받아 적은 글 속 활용한 꼴은 그 강까지 일무따에 나온 드릴 낱말만
    inflected: heardInflected(inflectedWords(learnedInIlmuta), extras),
    heardOnlyWords: extras?.dict?.words,
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

/** 칩에 모아 보일 뜻의 수 */
const MAX_CHIP_GLOSSES = 3;

/**
 * 같은 낱말(표기·읽기가 같음)이 낱말 표에 여러 번 다른 뜻으로 있으면(드릴 「집다」, 일무따 단어 「집다, 잡다, 취하다」)
 * 하나로 합쳐 뜻을 모은다. 칩이 대표 뜻 하나만 확신 있게 보이지 않게 한다(앞에 나온 뜻이 먼저)
 */
export function withAllMeanings(words: CueWord[]): CueWord[] {
  const groups = new Map<string, CueWord[]>();
  for (const w of words) {
    const key = `${w.ja}\t${w.reading ?? ""}`;
    const list = groups.get(key);
    if (list) list.push(w);
    else groups.set(key, [w]);
  }
  return [...groups.values()].map((list) =>
    list.length === 1
      ? list[0]
      : {
          ...list[0],
          ko: mergeGlosses(
            list.map((w) => w.ko),
            MAX_CHIP_GLOSSES,
          ).join(", "),
        },
  );
}

/** 일문따에서 쓰는 낱말: 드릴 낱말과, 일무따 출처를 볼 수 있으면 일무따 전체 단어 */
function ilmuntaWords(ilmutaLessons: IlmutaLesson[] | null): CueWord[] {
  return withAllMeanings([
    ...drillWords(),
    ...(ilmutaLessons
      ? ilmutaWords(ilmutaLessons, Number.POSITIVE_INFINITY)
      : []),
  ]);
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
    heardGlossary: heardGlossaryOf(glossary, extras),
    ...(extras?.sentenceReadings
      ? { sentenceReadings: extras.sentenceReadings }
      : {}),
    words,
    inflected: heardInflected(inflectedWords(), extras),
    heardOnlyWords: extras?.dict?.words,
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
