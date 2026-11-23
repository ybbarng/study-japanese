import { readdirSync } from "node:fs";
import path from "node:path";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  lessonNoOfItem,
} from "@/lib/context/card-sources";
import { buildCards } from "@/lib/context/cards";
import { ilmuntaLessonPairs } from "@/lib/context/ilmunta-pairs";
import { contentDir, loadIlmuta, loadTranscript } from "@/lib/textbook/load";

// 강의·예문 자막의 일본어 구간이 소책자 문장·낱말과 얼마나 맞았는지 숫자로만 보인다.
// 교재 글을 찍지 않는다(저장소 규칙). `CONTENT_DIR=<content 폴더> pnpm context:report`

const dir = contentDir();
const ilmuta = loadIlmuta(dir);
if (!ilmuta) {
  console.error(`일무따 교재가 없습니다: ${dir}/textbook/ilmuta.json`);
  process.exit(1);
}

type Tally = {
  files: number;
  ja: number;
  sentence: number;
  whole: number;
  word: number;
  /** 화면에 뜨는 낱말 칩 수와 그중 그림 문자가 붙은 수 */
  chips: number;
  emojiChips: number;
  /** 서로 다른 낱말 수와 그중 그림 문자가 붙은 수 */
  distinct: Set<string>;
  distinctEmoji: Set<string>;
};
const blank = (): Tally => ({
  files: 0,
  ja: 0,
  sentence: 0,
  whole: 0,
  word: 0,
  chips: 0,
  emojiChips: 0,
  distinct: new Set(),
  distinctEmoji: new Set(),
});
const tallies: Record<string, Tally> = {};

for (const book of ["ilmuta", "ilmunta"] as const) {
  const folder = path.join(dir, "transcripts", book);
  let files: string[] = [];
  try {
    files = readdirSync(folder).filter((f) => f.endsWith(".json"));
  } catch {
    continue;
  }
  for (const file of files) {
    const item = file.replace(/\.json$/, "");
    const t = loadTranscript(book, item, dir);
    if (!t) continue;
    const no = lessonNoOfItem(item);
    const source =
      book === "ilmuta"
        ? no === null
          ? null
          : ilmutaCardSource(ilmuta.lessons, no)
        : ilmuntaCardSource(
            ilmuta.lessons,
            no === null ? [] : ilmuntaLessonPairs(no, dir),
          );
    if (!source) continue;
    const cards = buildCards(t.segments, source);
    const key = `${book} ${t.kind}`;
    tallies[key] ??= blank();
    const tally = tallies[key];
    tally.files++;
    t.segments.forEach((s, i) => {
      if (s.lang !== "ja") return;
      tally.ja++;
      const card = cards[String(i)];
      if (card?.sentences.length) tally.sentence++;
      if (card?.whole) tally.whole++;
      if (card?.words.length) tally.word++;
      for (const w of card?.words ?? []) {
        tally.chips++;
        tally.distinct.add(w.ja);
        if (w.emoji) {
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
  "묶음\t파일\t일본어 구간\t문장 맞춤\t구간 전체 맞춤\t낱말 있음\t그림 붙은 칩\t그림 붙은 낱말(서로 다른)",
);
for (const [key, t] of Object.entries(tallies))
  console.log(
    [
      key,
      t.files,
      t.ja,
      `${t.sentence} (${pct(t.sentence, t.ja)})`,
      `${t.whole} (${pct(t.whole, t.ja)})`,
      `${t.word} (${pct(t.word, t.ja)})`,
      `${t.emojiChips}/${t.chips} (${pct(t.emojiChips, t.chips)})`,
      `${t.distinctEmoji.size}/${t.distinct.size} (${pct(t.distinctEmoji.size, t.distinct.size)})`,
    ].join("\t"),
  );
