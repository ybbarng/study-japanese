/**
 * content/transcripts/의 자막 JSON을 모두 검사해 센다.
 *
 *   pnpm transcribe:verify [--dir content/transcripts]
 *
 * 모양, 구간 시각 차례, 빈 파일, 환각(같은 구간 되풀이·구간 안 되풀이·정해진 환각 문구)을 본다.
 * 글은 찍지 않고 파일 이름과 문제 종류만 찍는다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkTranscript } from "@/lib/transcript/verify";

const root = process.cwd();
const { values: args } = parseArgs({
  options: {
    dir: { type: "string", default: path.join(root, "content/transcripts") },
  },
});

type Tally = {
  files: number;
  segments: number;
  ja: number;
  ko: number;
  seconds: number;
};
const tally = new Map<string, Tally>();
const bad = {
  schema: [] as string[],
  order: [] as string[],
  empty: [] as string[],
  hallucination: [] as string[],
};

for (const book of readdirSync(args.dir).sort()) {
  const dir = path.join(args.dir, book);
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()) {
    const id = `${book}/${name.replace(/\.json$/, "")}`;
    const data = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as {
      kind?: string;
      durationSec?: number;
    };
    const c = checkTranscript(data);
    const key = `${book} ${data.kind ?? "?"}`;
    const t = tally.get(key) ?? {
      files: 0,
      segments: 0,
      ja: 0,
      ko: 0,
      seconds: 0,
    };
    t.files++;
    t.segments += c.segments;
    t.ja += c.ja;
    t.ko += c.ko;
    t.seconds += data.durationSec ?? 0;
    tally.set(key, t);
    if (!c.schemaOk) bad.schema.push(`${id}: ${c.problems.join("; ")}`);
    const order = c.problems.filter((p) => p.startsWith("시각"));
    if (order.length > 0)
      bad.order.push(
        `${id}: ${order[0]}${order.length > 1 ? ` 외 ${order.length - 1}개` : ""}`,
      );
    if (c.empty) bad.empty.push(id);
    if (c.hallucination)
      bad.hallucination.push(
        `${id}: ${c.problems.filter((p) => p.startsWith("환각")).join("; ")}`,
      );
  }
}

console.log("책·종류별");
for (const [key, t] of [...tally.entries()].sort()) {
  console.log(
    `  ${key}: 파일 ${t.files}, ${(t.seconds / 3600).toFixed(1)}시간, 구간 ${t.segments} (ja ${t.ja} / ko ${t.ko})`,
  );
}
for (const [label, list] of [
  ["모양이 틀림", bad.schema],
  ["시각 차례가 틀림", bad.order],
  ["비어 있음", bad.empty],
  ["환각 의심", bad.hallucination],
] as const) {
  console.log(`${label}: ${list.length}개`);
  for (const line of list) console.log(`  ${line}`);
}
if (bad.schema.length + bad.order.length + bad.empty.length > 0)
  process.exitCode = 1;
