import { connection } from "next/server";
import { transcriptCues } from "@/lib/context/cues";
import { loadContextTranscript, visibleBooks } from "@/lib/context/server";
import { VERBS } from "@/lib/ilmunta/verbs";
import { WORD_LESSONS } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { KIND_LABEL, lessonLabel } from "@/lib/ilmuta/labels";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Track } from "@/lib/player/queue";
import { loadIlmuta, loadTranscript } from "@/lib/textbook/load";
import type { Ilmuta } from "@/lib/textbook/schema";
import {
  lessonSentences,
  mergeTextbookAnalysis,
} from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import {
  buildDictionary,
  type DictEntry,
  type DictInput,
  type DictSummary,
  dictKey,
  summarize,
} from "./entries";
import { findExampleCue } from "./sentence-cue";

// 사전 화면(서버 컴포넌트)이 쓰는 데이터. 교재 출처를 닫았으면 방문자에게는 드릴 낱말만 보인다.

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

// 교재 객체(readJson이 파일이 그대로면 같은 객체를 준다)가 같으면 다시 만들지 않는다.
// 분석 파일만 바뀐 것은 1분 뒤에 반영한다
let cache: { book: Ilmuta | null; at: number; entries: DictEntry[] } | null =
  null;
const CACHE_MS = 60_000;

function dictionary(book: Ilmuta | null): DictEntry[] {
  const now = Date.now();
  if (cache && cache.book === book && now - cache.at < CACHE_MS)
    return cache.entries;
  const entries = buildDictionary({
    ilmutaWords: [],
    analyzed: [],
    ...(book ? ilmutaInput(book) : {}),
    drill: drillInput(),
  });
  cache = { book, at: now, entries };
  return entries;
}

async function visibleBook(): Promise<Ilmuta | null> {
  await connection();
  const canSee = await visibleBooks();
  return canSee("ilmuta") ? loadIlmuta() : null;
}

export interface DictListData {
  entries: DictSummary[];
  /** 일무따 교재를 볼 수 없어 드릴 낱말만 보이는 중 */
  limited: boolean;
}

export async function loadDictList(): Promise<DictListData> {
  const book = await visibleBook();
  return { entries: dictionary(book).map(summarize), limited: book === null };
}

/** 낱말이 나오는 예문 하나(문장 글을 그 낱말 자리로 나눠 강조한다) */
export interface DictExample {
  lesson: number;
  lessonLabel: string;
  kindLabel: string;
  parts: { text: string; hit?: true; reading?: string }[];
  ko: string;
  track: Track;
  /** 예문 mp3에서 이 문장이 읽히는 자리(못 찾으면 null, 처음부터 튼다) */
  cue: { start: number; end: number } | null;
  /** 단어 익히기 카드(낱말 자체를 읽는 구간)인지. 낱말 듣기가 먼저 고른다(word-sound.ts) */
  wordCard: boolean;
  /** 문장 글 길이 */
  length: number;
}

export interface DictWordData {
  entry: DictSummary;
  examples: DictExample[];
  limited: boolean;
}

export async function loadDictWord(id: string): Promise<DictWordData | null> {
  const book = await visibleBook();
  const entry = dictionary(book).find((e) => e.id === dictKey(id));
  if (!entry) return null;
  const examples: DictExample[] = [];
  for (const o of entry.occurrences) {
    const lesson = book?.lessons.find((l) => l.no === o.lesson);
    const example = lesson?.examples.find((e) => e.id === o.example);
    const sentence = example?.sentences[o.index];
    if (!lesson || !example || !sentence) continue;
    const analysis = loadTextbookAnalysis("ilmuta", lesson.no);
    const merged = analysis
      ? mergeTextbookAnalysis([{ ...o, ja: sentence.ja }], analysis).analyses[
          sentence.ja
        ]
      : undefined;
    const parts = merged
      ? merged.tokens.map((t) => {
          const hit = !t.plain && dictKey(t.base ?? t.surface) === entry.id;
          return {
            text: t.surface,
            ...(hit ? { hit: true as const } : {}),
            ...(t.reading && !t.plain ? { reading: t.reading } : {}),
          };
        })
      : [{ text: sentence.ja }];
    const transcript = loadTranscript("ilmuta", example.id);
    // 일무따를 볼 수 있을 때만 여기에 온다(book이 있다). 카드는 자막 API와 같은 짝짓기 결과다
    const carded = transcript
      ? loadContextTranscript("ilmuta", example.id, () => true)
      : null;
    examples.push({
      lesson: lesson.no,
      lessonLabel: lessonLabel(lesson.no),
      kindLabel: KIND_LABEL[example.kind],
      parts,
      ko: sentence.ko,
      track: exampleTrack(lesson, example),
      cue: transcript
        ? findExampleCue(
            carded ? transcriptCues(carded) : [],
            transcript.segments,
            sentence.ja,
          )
        : null,
      wordCard: example.kind === "words",
      length: Array.from(sentence.ja).length,
    });
  }
  return { entry: summarize(entry), examples, limited: book === null };
}
