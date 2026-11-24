import { readdirSync } from "node:fs";
import path from "node:path";
import { contextTranscript } from "@/lib/context/build";
import { lessonNoOfItem } from "@/lib/context/card-sources";
import { transcriptSchema } from "@/lib/context/cues";
import { ilmuntaLessonPairs } from "@/lib/context/ilmunta-pairs";
import { contentDir, loadIlmuta, readJson } from "@/lib/textbook/load";

// 강의·예문 자막의 일본어 구간이 소책자 문장·낱말과 얼마나 맞았는지 숫자로만 보인다.
// 서버가 내주는 것과 같은 길(contextTranscript: 잡음·한국어 말 가타카나 줄 거르기 → 카드)로 센다.
// 교재 글을 찍지 않는다(저장소 규칙).
//   `CONTENT_DIR=<content 폴더> pnpm context:report`            묶음별
//   `CONTENT_DIR=<content 폴더> pnpm context:report -- --items`  자막 파일별
//   `TRANSCRIPTS=transcripts-next ...`                          다른 자막 폴더(다시 받아 적은 것)를 센다

const dir = contentDir();
const folder = process.env.TRANSCRIPTS ?? "transcripts";
const byItem = process.argv.includes("--items");
const ilmuta = loadIlmuta(dir);
if (!ilmuta) {
  console.error(`일무따 교재가 없습니다: ${dir}/textbook/ilmuta.json`);
  process.exit(1);
}

type Tally = {
  files: number;
  /** 원래 자막의 일본어 구간과, 거른 뒤 내주는 일본어 구간 */
  rawJa: number;
  ja: number;
  sentence: number;
  whole: number;
  word: number;
  /** 화면에 뜨는 낱말 칩 수와 그중 그림이 붙은 수 */
  chips: number;
  emojiChips: number;
  /** 서로 다른 낱말 수와 그중 그림이 붙은 수 */
  distinct: Set<string>;
  distinctEmoji: Set<string>;
  /** 바로 맞추지 못하고 차례·앞뒤 맥락·소리로 채운 일본어 구간(align.ts·repair.ts) */
  inferred: number;
  /** 한국어 줄이 통째로 낱말 카드가 된 수, 표기를 덧붙인 수 */
  koWhole: number;
  koAnnotated: number;
};
const blank = (): Tally => ({
  files: 0,
  rawJa: 0,
  ja: 0,
  sentence: 0,
  whole: 0,
  word: 0,
  chips: 0,
  emojiChips: 0,
  distinct: new Set(),
  distinctEmoji: new Set(),
  inferred: 0,
  koWhole: 0,
  koAnnotated: 0,
});
const tallies: Record<string, Tally> = {};

for (const book of ["ilmuta", "ilmunta"] as const) {
  let files: string[] = [];
  try {
    files = readdirSync(path.join(dir, folder, book))
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    continue;
  }
  for (const file of files) {
    const item = file.replace(/\.json$/, "");
    const t = readJson(path.join(dir, folder, book, file), transcriptSchema);
    if (!t) continue;
    const no = lessonNoOfItem(item);
    const pairs =
      book === "ilmunta" && no !== null ? ilmuntaLessonPairs(no, dir) : null;
    const out = contextTranscript(book, item, t, ilmuta, pairs);
    const cards = out.cards ?? {};
    const key = byItem ? `${book} ${item}` : `${book} ${t.kind}`;
    tallies[key] ??= blank();
    const tally = tallies[key];
    tally.files++;
    tally.rawJa += t.segments.filter((s) => s.lang === "ja").length;
    out.segments.forEach((s, i) => {
      const card = cards[String(i)];
      if (s.lang === "ko") {
        if (card?.whole) tally.koWhole++;
        else if (card?.text) tally.koAnnotated++;
        return;
      }
      tally.ja++;
      if (card?.inferred) tally.inferred++;
      if (card?.sentences.length) tally.sentence++;
      if (card?.whole) tally.whole++;
      if (card?.words.length) tally.word++;
      for (const w of card?.words ?? []) {
        tally.chips++;
        tally.distinct.add(w.ja);
        if (w.emoji || w.picture) {
          tally.emojiChips++;
          tally.distinctEmoji.add(w.ja);
        }
      }
    });
  }
}

const pct = (n: number, d: number) =>
  d === 0 ? "-" : `${Math.round((n / d) * 100)}%`;
console.log(
  "묶음\t파일\t일본어 구간(원래→내줌)\t문장 맞춤\t구간 전체 맞춤\t낱말 있음\t그림 붙은 칩\t그림 붙은 낱말(서로 다른)\t맥락으로 채움\t받아쓰기로 남음\t한국어 줄→낱말\t한국어 줄 표기 덧붙임",
);
for (const [key, t] of Object.entries(tallies))
  console.log(
    [
      key,
      t.files,
      `${t.rawJa}→${t.ja}`,
      `${t.sentence} (${pct(t.sentence, t.ja)})`,
      `${t.whole} (${pct(t.whole, t.ja)})`,
      `${t.word} (${pct(t.word, t.ja)})`,
      `${t.emojiChips}/${t.chips} (${pct(t.emojiChips, t.chips)})`,
      `${t.distinctEmoji.size}/${t.distinct.size} (${pct(t.distinctEmoji.size, t.distinct.size)})`,
      `${t.inferred} (${pct(t.inferred, t.ja)})`,
      `${t.ja - t.whole} (${pct(t.ja - t.whole, t.ja)})`,
      t.koWhole,
      t.koAnnotated,
    ].join("\t"),
  );
