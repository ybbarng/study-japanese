import { VERBS } from "@/lib/ilmunta/verbs";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { buildGlossary, type Glossary, hasKanji } from "@/lib/ilmuta/ruby";
import type { IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import type { CardSource, CueWord } from "./cards";

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

/**
 * 일무따 강의·예문: 그 강의 소책자 문장(예문·회화·단어)과 맞추고,
 * 읽는 법과 낱말은 그 강까지 배운 단어로 단다.
 */
export function ilmutaCardSource(
  lessons: IlmutaLesson[],
  no: number,
): CardSource {
  const lesson = lessons.find((l) => l.no === no);
  return {
    sentences: lesson
      ? [
          ...lesson.examples.flatMap((e) => e.sentences),
          ...(lesson.conversationWords ?? []),
        ]
      : [],
    glossary: buildGlossary(lessons, no),
    words: ilmutaWords(lessons, no),
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

/**
 * 일문따: 예문 mp3와 짝지은 소책자 문장이 없어 문장 카드는 만들지 않고 낱말 카드만 붙인다.
 * 낱말은 일문따 드릴 낱말과, 일무따 출처를 볼 수 있으면 일무따 전체 단어.
 */
export function ilmuntaCardSource(
  ilmutaLessons: IlmutaLesson[] | null,
): CardSource {
  const fromIlmuta = ilmutaLessons
    ? ilmutaWords(ilmutaLessons, Number.POSITIVE_INFINITY)
    : [];
  const words = [...drillWords(), ...fromIlmuta];
  const glossary: Glossary = {};
  for (const w of words)
    if (w.reading && hasKanji(w.ja) && !(w.ja in glossary))
      glossary[w.ja] = w.reading;
  return { sentences: [], glossary, words };
}
