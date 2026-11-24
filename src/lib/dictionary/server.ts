import { connection } from "next/server";
import { transcriptCues } from "@/lib/context/cues";
import { loadContextTranscript, visibleBooks } from "@/lib/context/server";
import { KIND_LABEL, lessonLabel } from "@/lib/ilmuta/labels";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Track } from "@/lib/player/queue";
import { loadIlmuta, loadTranscript } from "@/lib/textbook/load";
import type { Example, Ilmuta } from "@/lib/textbook/schema";
import { mergeTextbookAnalysis } from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import {
  type DictEntry,
  type DictSummary,
  dictKey,
  summarize,
} from "./entries";
import { dictionaryIndex } from "./index-server";
import { findExampleCues } from "./sentence-cue";

// 사전 화면(서버 컴포넌트)이 쓰는 데이터. 교재 출처를 닫았으면 방문자에게는 드릴 낱말만 보인다.

function dictionary(book: Ilmuta | null): DictEntry[] {
  return dictionaryIndex(book).entries;
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
  // 예문 mp3의 문장 자리는 앞뒤 문장을 함께 보고 찾으므로 예문마다 한 번 구한다
  const cueCache = new Map<string, ({ start: number; end: number } | null)[]>();
  const cuesOf = (example: Example) => {
    const hit = cueCache.get(example.id);
    if (hit) return hit;
    const transcript = loadTranscript("ilmuta", example.id);
    // 일무따를 볼 수 있을 때만 여기에 온다(book이 있다). 카드는 자막 API와 같은 짝짓기 결과다
    const carded = transcript
      ? loadContextTranscript("ilmuta", example.id, () => true)
      : null;
    const found = transcript
      ? findExampleCues(
          carded ? transcriptCues(carded) : [],
          transcript.segments,
          example.sentences,
        )
      : [];
    cueCache.set(example.id, found);
    return found;
  };
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
    examples.push({
      lesson: lesson.no,
      lessonLabel: lessonLabel(lesson.no),
      kindLabel: KIND_LABEL[example.kind],
      parts,
      ko: sentence.ko,
      track: exampleTrack(lesson, example),
      cue: cuesOf(example)[o.index] ?? null,
      wordCard: example.kind === "words",
      length: Array.from(sentence.ja).length,
    });
  }
  return { entry: summarize(entry), examples, limited: book === null };
}
