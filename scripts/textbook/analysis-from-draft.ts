/**
 * 분석 초안(낱말을 겉모양으로 적은 JSON, git 밖)을 분석 파일로 바꾼다.
 *
 *   pnpm textbook:analysis-from-draft ilmuta <강> <초안 파일> [--by kuromoji]
 *
 * 초안 모양: { "<문장 글>": { "t": [[겉모양, 품사, 뜻, 읽는 법?, 기본형?], …], "g": [[문형, 설명, 강?], …] } }
 * 겉모양을 문장에서 차례로 찾아 글자 위치로 바꾸고, content/textbook-analysis/ilmuta/<강>.json에 쓴다.
 * 같은 글이 강 안에 되풀이되면 처음 자리에만 적는다(화면·확인은 지문으로 나머지도 맞춘다).
 * 초안에는 교재 글이 있으니 저장소 안에 두지 않는다. 알림은 문장 자리로만 찍는다.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lineHash } from "@/lib/songs/line-hash";
import { loadIlmuta } from "@/lib/textbook/load";
import {
  lessonSentences,
  refKey,
  type SentenceAnalysis,
  textbookAnalysisSchema,
} from "@/lib/word-tap/analysis";
import { textbookAnalysisPath } from "@/lib/word-tap/analysis-file";
import { draftGrammar, draftSchema, placeTokens } from "@/lib/word-tap/draft";

const [book, lessonArg, draftFile] = process.argv.slice(2);
const byKuromoji = process.argv.includes("kuromoji");
if (book !== "ilmuta" || !/^\d{1,2}$/.test(lessonArg ?? "") || !draftFile) {
  console.error(
    "쓰기: pnpm textbook:analysis-from-draft ilmuta <강> <초안 파일> [--by kuromoji]",
  );
  process.exit(1);
}
const no = Number(lessonArg);
const lesson = loadIlmuta()?.lessons.find((l) => l.no === no);
if (!lesson) {
  console.error(`${no}강을 교재 데이터에서 찾지 못함`);
  process.exit(1);
}

const draft = draftSchema.parse(
  JSON.parse(readFileSync(path.resolve(draftFile), "utf8")),
);
const used = new Set<string>();
const done = new Set<string>();
const sentences: SentenceAnalysis[] = [];
const problems: string[] = [];
for (const ref of lessonSentences(lesson)) {
  if (done.has(ref.ja)) continue;
  done.add(ref.ja);
  const entry = draft[ref.ja];
  if (!entry) {
    problems.push(`초안에 없음: ${refKey(ref)}`);
    continue;
  }
  used.add(ref.ja);
  const placed = placeTokens(ref.ja, entry.t);
  if ("notFound" in placed) {
    problems.push(`${refKey(ref)}: 낱말을 문장에서 차례대로 찾지 못함`);
    continue;
  }
  const grammar = draftGrammar(entry.g);
  sentences.push({
    example: ref.example,
    index: ref.index,
    hash: lineHash(ref.ja),
    tokens: placed.tokens,
    ...(grammar ? { grammar } : {}),
  });
}
const extra = Object.keys(draft).filter((ja) => !used.has(ja)).length;
if (extra > 0) problems.push(`이 강에 없는 초안 문장 ${extra}개`);

const analysis = textbookAnalysisSchema.parse({
  book: "ilmuta",
  lesson: no,
  analyzedAt: new Date().toISOString().slice(0, 10),
  by: byKuromoji ? "kuromoji" : "claude",
  sentences,
});
const out = textbookAnalysisPath("ilmuta", no);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`${no}강: 문장 ${sentences.length}개를 썼다`);
for (const p of problems) console.log(`  ${p}`);
process.exit(problems.length > 0 ? 1 : 0);
