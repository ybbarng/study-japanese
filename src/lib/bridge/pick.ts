import { buildGlossary } from "@/lib/ilmuta/ruby";
import type { Script } from "@/lib/kana/data";
import { learnedThrough } from "@/lib/kana/lessons";
import type { Example, IlmutaLesson } from "@/lib/textbook/schema";
import type { Bridge } from "./bridges";
import { type Piece, sentencePieces } from "./pieces";
import { isReadable, type Learned, moraCount } from "./readable";

// 일무따 강 예문 가운데 지금까지 배운 글자만으로 읽을 수 있는 문장을 고른다.

export interface BridgeSentence {
  lessonNo: number;
  exampleId: string;
  /** 문장이 든 예문 mp3(교재 자료 폴더 기준 경로) */
  exampleFile: string;
  ja: string;
  ko: string;
  pieces: Piece[];
}

export interface PickOptions {
  /** 고를 강 번호(차례대로) */
  lessonNos: readonly number[];
  /** 강마다 최대 문장 수 */
  maxPerLesson?: number;
  /** 너무 짧은 것(한두 박)은 빼려고 두는 최소 박 수 */
  minMora?: number;
  /** 이 글자(가타카나 등)가 하나라도 든 문장만 */
  mustInclude?: Script;
}

function includesScript(pieces: readonly Piece[], script: Script): boolean {
  return pieces.some(
    (p) =>
      (p.kind === "kana" && p.script === script) ||
      (p.kind === "kanji" && includesScript(p.units, script)),
  );
}

/** 문장 코너를 먼저, 낱말 코너는 뒤에. 듣기만 하는 코너(글 없음)는 빠진다 */
const KIND_ORDER: Example["kind"][] = [
  "patterns",
  "conversationBasic",
  "conversationAdvanced",
  "words",
];

function orderedExamples(lesson: IlmutaLesson): Example[] {
  return KIND_ORDER.flatMap((kind) =>
    lesson.examples.filter((e) => e.kind === kind),
  );
}

export function pickReadableSentences(
  lessons: readonly IlmutaLesson[],
  learned: Learned,
  { lessonNos, maxPerLesson = 6, minMora = 3, mustInclude }: PickOptions,
): BridgeSentence[] {
  const out: BridgeSentence[] = [];
  for (const no of lessonNos) {
    const lesson = lessons.find((l) => l.no === no);
    if (!lesson) continue;
    const glossary = buildGlossary([...lessons], no);
    const seen = new Set<string>();
    let taken = 0;
    for (const example of orderedExamples(lesson)) {
      for (const s of example.sentences) {
        if (taken >= maxPerLesson) break;
        if (seen.has(s.ja)) continue;
        seen.add(s.ja);
        const pieces = sentencePieces(s.ja, glossary);
        if (moraCount(pieces) < minMora || !isReadable(pieces, learned))
          continue;
        if (mustInclude && !includesScript(pieces, mustInclude)) continue;
        out.push({
          lessonNo: no,
          exampleId: example.id,
          exampleFile: example.file,
          ja: s.ja,
          ko: s.ko,
          pieces,
        });
        taken += 1;
      }
    }
  }
  return out;
}

/** 다리 레슨 하나의 문장: 그 다리 앞 가나 레슨까지 배운 글자로 읽을 수 있는 것 */
export function pickForBridge(
  lessons: readonly IlmutaLesson[],
  bridge: Bridge,
): BridgeSentence[] {
  return pickReadableSentences(lessons, learnedThrough(bridge.after), {
    lessonNos: bridge.lessonNos,
    maxPerLesson: bridge.maxPerLesson,
    mustInclude: bridge.mustInclude,
  });
}
