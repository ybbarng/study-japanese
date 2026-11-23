/**
 * 노래 분석 파일을 확인한다: 스키마에 맞는지, `pnpm songs:pull`로 받은 가사 줄과 모두 맞는지.
 *
 *   pnpm songs:check <slug> [--show]
 *
 * --show는 조각 위치가 가리키는 낱말과 뜻을 줄마다 찍는다(위치를 잘못 셌는지 볼 때).
 *
 * 읽는 파일: content/songs/<slug>.json(분석), content/songs/<slug>.lyrics.json(받은 가사).
 * 결과에는 가사 글을 찍지 않고 줄 번호만 찍는다. 맞지 않으면 끝 코드 1.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { cutTokens, songAnalysisSchema } from "@/lib/songs/analysis";
import { checkAnalysis, formatCheck } from "@/lib/songs/analysis-check";
import { isSlug } from "@/lib/songs/schema";
import { contentDir } from "@/lib/textbook/load";

const slug = process.argv[2];
if (!slug || !isSlug(slug)) {
  console.error("쓰기: pnpm songs:check <slug>");
  process.exit(1);
}

const dir = path.join(contentDir(), "songs");

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  } catch (err) {
    const why =
      (err as NodeJS.ErrnoException).code === "ENOENT"
        ? "파일이 없음"
        : "JSON이 아님";
    console.error(`content/songs/${file}: ${why}`);
    process.exit(1);
  }
}

const lyricsSchema = z.object({
  slug: z.string(),
  lines: z.array(z.object({ ja: z.string() })),
});
const lyrics = lyricsSchema.safeParse(readJson(`${slug}.lyrics.json`));
if (!lyrics.success) {
  console.error(
    `content/songs/${slug}.lyrics.json 모양이 맞지 않음. pnpm songs:pull ${slug}로 다시 받으세요.`,
  );
  process.exit(1);
}

const raw = readJson(`${slug}.json`);
const result = checkAnalysis(raw, lyrics.data);
for (const line of formatCheck(result)) console.log(line);

// --show: 조각 위치가 가리키는 낱말을 찍어 위치를 잘못 센 곳을 찾는다(세션만 본다. 줄 통째가 아니라 낱말만)
if (process.argv.includes("--show") && result.schemaErrors.length === 0) {
  const analysis = songAnalysisSchema.parse(raw);
  for (const line of analysis.lines) {
    const ja = lyrics.data.lines[line.index]?.ja;
    const cut = ja === undefined ? null : cutTokens(ja, line.tokens);
    if (!cut) continue;
    const words = cut
      .filter((t) => !t.plain)
      .map((t) => `${t.surface}${t.gloss ? `=${t.gloss}` : ""}`);
    console.log(`index ${line.index}: ${words.join(" · ")}`);
  }
}
process.exit(result.ok ? 0 : 1);
