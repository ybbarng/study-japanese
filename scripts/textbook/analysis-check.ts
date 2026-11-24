/**
 * 교재 예문 낱말 분석 파일을 확인한다: 스키마에 맞는지, 그 강 예문과 모두 맞는지.
 *
 *   pnpm textbook:analysis-check ilmuta <강|강-강> [--list] [--show]
 *   예) pnpm textbook:analysis-check ilmuta 1-10
 *
 * --list는 분석할 문장 자리(예문 id#차례)·지문·글자 수를 찍는다(분석 파일에 옮겨 적는다).
 * --show는 조각 위치가 가리키는 낱말과 뜻을 문장마다 찍는다(위치를 잘못 셌는지 세션이 볼 때).
 *
 * 읽는 파일: content/textbook/ilmuta.json, content/textbook-analysis/ilmuta/<강>.json.
 * 결과에는 문장 글을 찍지 않고 자리만 찍는다(--show는 낱말만). 맞지 않으면 끝 코드 1.
 * 일문따는 소책자에 예문 글이 없어 아직 받지 않는다.
 */
import { readFileSync } from "node:fs";
import { cutTokens } from "@/lib/songs/analysis";
import { lineHash } from "@/lib/songs/line-hash";
import { loadIlmuta } from "@/lib/textbook/load";
import {
  lessonSentences,
  refKey,
  textbookAnalysisSchema,
} from "@/lib/word-tap/analysis";
import {
  checkTextbookAnalysis,
  formatTextbookCheck,
} from "@/lib/word-tap/analysis-check";
import { textbookAnalysisPath } from "@/lib/word-tap/analysis-file";

const [book, range] = process.argv.slice(2);
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const m = range?.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
if (book !== "ilmuta" || !m) {
  console.error(
    "쓰기: pnpm textbook:analysis-check ilmuta <강|강-강> [--list] [--show]",
  );
  process.exit(1);
}
const from = Number(m[1]);
const to = Number(m[2] ?? m[1]);

const textbook = loadIlmuta();
if (!textbook) {
  console.error("content/textbook/ilmuta.json이 없음");
  process.exit(1);
}

let allOk = true;
for (let no = from; no <= to; no++) {
  const lesson = textbook.lessons.find((l) => l.no === no);
  if (!lesson) continue;
  const sentences = lessonSentences(lesson);
  console.log(`── ${no}강 (문장 ${sentences.length}개)`);
  if (sentences.length === 0) continue;

  if (flags.has("--list")) {
    for (const s of sentences)
      console.log(
        `  ${refKey(s)}  hash ${lineHash(s.ja)}  글자 ${Array.from(s.ja).length}`,
      );
    continue;
  }

  const file = textbookAnalysisPath("ilmuta", no);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    const why =
      (err as NodeJS.ErrnoException).code === "ENOENT"
        ? "파일이 없음"
        : "JSON이 아님";
    console.log(`  content/textbook-analysis/ilmuta/${no}.json: ${why}`);
    allOk = false;
    continue;
  }
  const result = checkTextbookAnalysis(raw, {
    book: "ilmuta",
    lesson: no,
    sentences,
  });
  for (const line of formatTextbookCheck(result)) console.log(`  ${line}`);
  allOk &&= result.ok;

  if (flags.has("--show") && result.schemaErrors.length === 0) {
    const byRef = new Map(sentences.map((s) => [refKey(s), s]));
    for (const s of textbookAnalysisSchema.parse(raw).sentences) {
      const ja = byRef.get(refKey(s))?.ja;
      const cut = ja === undefined ? null : cutTokens(ja, s.tokens);
      if (!cut) continue;
      const words = cut
        .filter((t) => !t.plain)
        .map((t) => `${t.surface}${t.gloss ? `=${t.gloss}` : ""}`);
      console.log(`  ${refKey(s)}: ${words.join(" · ")}`);
    }
  }
}
process.exit(allOk ? 0 : 1);
