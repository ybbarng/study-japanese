import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { hasKanji } from "@/lib/ilmuta/ruby";
import { isPressable } from "@/lib/songs/words";
import type { Ilmuta } from "@/lib/textbook/schema";
import {
  lessonSentences,
  mergeTextbookAnalysis,
} from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import { buildDictionary, type DictEntry, type DictInput } from "./entries";

// 교재 낱말 사전 색인을 파일에서 만든다(서버만). 사전 화면(server.ts)과, 받아 적은 자막 줄에 낱말 칩을
// 다는 맥락 카드(context/lesson-names-server.ts)가 함께 쓴다. 여기서는 맥락 쪽을 부르지 않는다(순환을 막는다).

/** 예문 분석에 나온 활용한 꼴(겉모양) → 기본형. 받아 적은 글에서 활용한 꼴을 알아볼 때 쓴다 */
export interface DictInflection {
  surface: string;
  base: string;
  /** 그 꼴이 처음 나온 일무따 강 */
  lesson: number;
}

export interface DictionaryIndex {
  entries: DictEntry[];
  inflections: DictInflection[];
}

function ilmutaInput(
  book: Ilmuta,
): Pick<DictInput, "ilmutaWords" | "analyzed"> {
  const ilmutaWords = book.lessons.map((l) => ({
    lesson: l.no,
    words: [
      ...l.examples
        .filter((e) => e.kind === "words")
        .flatMap((e) => e.sentences),
      ...(l.conversationWords ?? []),
    ],
  }));
  const analyzed: DictInput["analyzed"] = [];
  for (const lesson of book.lessons) {
    const analysis = loadTextbookAnalysis("ilmuta", lesson.no);
    if (!analysis) continue;
    const refs = lessonSentences(lesson);
    const { analyses } = mergeTextbookAnalysis(refs, analysis);
    for (const ref of refs) {
      const found = analyses[ref.ja];
      if (found)
        analyzed.push({
          lesson: lesson.no,
          example: ref.example,
          index: ref.index,
          tokens: found.tokens,
        });
    }
  }
  return { ilmutaWords, analyzed };
}

function drillInput(): DictInput["drill"] {
  return [
    ...VERBS.map((v) => ({
      dict: v.dict,
      reading: v.reading,
      ko: v.ko,
      drill: { kind: "verb" as const, group: v.group },
      ...WORD_LESSONS[v.dict],
    })),
    ...ADJECTIVES.map((a) => ({
      dict: a.dict,
      reading: a.reading,
      ko: a.ko,
      drill: { kind: "adj" as const, adjKind: a.kind },
      ...WORD_LESSONS[a.dict],
    })),
  ];
}

/** 분석 낱말 가운데 겉모양이 기본형과 다르고 한자가 든 것(처음 나온 강) */
function inflectionsOf(analyzed: DictInput["analyzed"]): DictInflection[] {
  const out = new Map<string, DictInflection>();
  for (const s of analyzed)
    for (const t of s.tokens) {
      if (!t.base || t.base === t.surface || !hasKanji(t.surface)) continue;
      if (!isPressable({ ...t, plain: t.plain })) continue;
      const had = out.get(t.surface);
      if (!had || s.lesson < had.lesson)
        out.set(t.surface, {
          surface: t.surface,
          base: t.base,
          lesson: s.lesson,
        });
    }
  return [...out.values()];
}

// 교재 객체(readJson이 파일이 그대로면 같은 객체를 준다)가 같으면 다시 만들지 않는다.
// 분석 파일만 바뀐 것은 1분 뒤에 반영한다
let cache: { book: Ilmuta | null; at: number; index: DictionaryIndex } | null =
  null;
const CACHE_MS = 60_000;

/** 사전 색인. 일무따 교재를 볼 수 없으면(null) 드릴 낱말만 */
export function dictionaryIndex(book: Ilmuta | null): DictionaryIndex {
  const now = Date.now();
  if (cache && cache.book === book && now - cache.at < CACHE_MS)
    return cache.index;
  const ilmuta = book ? ilmutaInput(book) : { ilmutaWords: [], analyzed: [] };
  const index = {
    entries: buildDictionary({ ...ilmuta, drill: drillInput() }),
    inflections: inflectionsOf(ilmuta.analyzed),
  };
  cache = { book, at: now, index };
  return index;
}
