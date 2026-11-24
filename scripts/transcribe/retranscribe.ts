/**
 * 교재와 짝을 못 찾은 일본어 자막 구간만 오디오에서 잘라 whisper로 다시 받아 적는다.
 *
 *   pnpm transcribe:retry [--book ilmunta|ilmuta] [--only <book>/<item>,...] [--jobs 2] [--threads 4]
 *                         [--beam 8] [--limit N] [--out content/transcripts-next]
 *
 * - 원래 자막(CONTENT_DIR/transcripts)은 덮어쓰지 않고, 같은 스키마로 --out 폴더에 모든 파일을 쓴다
 *   (바꾼 구간 말고는 그대로 복사). 교재 글이라 git 밖이다.
 * - 구간마다 두 번 받아 적는다: 그 강·과 낱말·문장을 initial prompt로 넣은 것과 넣지 않은 것.
 *   빔 검색, 온전한 오디오 창(-ac 0), 언어는 일본어로 고정한다.
 * - 나아진 것만 바꾼다(retranscribe-judge.ts). 일문따는 과마다 문법 예문(`NN-1`)을 먼저 고친 뒤,
 *   그 자막에서 다시 찾은 일본어·뜻 짝으로 나머지 파일을 맞춘다(서버와 같은 방식).
 * - whisper 결과는 RETRANSCRIBE_RAW_DIR(기본 ~/.cache/study-japanese/retranscribe-raw)에 남겨, 다시 돌리면 이어 간다.
 * 교재 글을 찍지 않고 숫자만 찍는다.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  lessonNoOfItem,
} from "@/lib/context/card-sources";
import { buildCards, type CardSource, kanaOf } from "@/lib/context/cards";
import type { Transcript } from "@/lib/context/cues";
import {
  findRepeatPairs,
  type TranscriptPair,
} from "@/lib/context/transcript-pairs";
import { contentDir, loadIlmuta, loadTranscript } from "@/lib/textbook/load";
import { isNoiseLine, withoutNoise } from "@/lib/transcript/hallucination";
import type {
  TranscriptBook,
  TranscriptSegment,
} from "@/lib/transcript/schema";
import {
  chunkText,
  parseWhisperJson,
  type WhisperJson,
} from "@/lib/transcript/whisper-json";
import { listJobs } from "./jobs";
import { buildPrompt, judge } from "./retranscribe-judge";
import { toWav } from "./tools";
import type { FileJob } from "./transcribe-file";
import { readWav, sliceWav } from "./wav";

const run = promisify(execFile);
const BIG = { maxBuffer: 64 * 1024 * 1024 };

const root = process.cwd();
const { values: args } = parseArgs({
  options: {
    book: { type: "string" },
    only: { type: "string" },
    jobs: { type: "string", default: "2" },
    threads: { type: "string", default: "4" },
    beam: { type: "string", default: "8" },
    limit: { type: "string" },
    out: {
      type: "string",
      default: path.join(root, "content/transcripts-next"),
    },
  },
});

/** 자를 때 앞뒤 여유(초). 이웃 구간 안으로는 이만큼만 들어간다 */
const PAD = 0.3;
const NEIGHBOR_OVERLAP = 0.05;

const model =
  process.env.WHISPER_MODEL ??
  path.join(homedir(), ".cache/whisper/ggml-large-v3-turbo.bin");
const rawDir =
  process.env.RETRANSCRIBE_RAW_DIR ??
  path.join(homedir(), ".cache/study-japanese/retranscribe-raw");
const dir = contentDir();
const ilmutaBook = loadIlmuta(dir);
if (!ilmutaBook) {
  console.error(`일무따 교재가 없습니다: ${dir}/textbook/ilmuta.json`);
  process.exit(1);
}
const lessons = ilmutaBook.lessons;

type Cached = {
  prompt: string;
  /** 구간 열쇠(`start-end`) → 받아쓰기 */
  prompted: Record<string, string | null>;
  plain: Record<string, string | null>;
};

type Stats = {
  files: number;
  changedFiles: number;
  targets: number;
  matched: number;
  agreed: number;
  kanji: number;
};
const stats: Record<string, Stats> = {};
const stat = (key: string): Stats => {
  stats[key] ??= {
    files: 0,
    changedFiles: 0,
    targets: 0,
    matched: 0,
    agreed: 0,
    kanji: 0,
  };
  return stats[key];
};

async function writeJson(dest: string, data: unknown, indent?: number) {
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(`${dest}.tmp`, `${JSON.stringify(data, null, indent)}\n`);
  await rename(`${dest}.tmp`, dest);
}

const segKey = (s: TranscriptSegment) => `${s.start}-${s.end}`;

async function whisperJa(
  wavs: string[],
  prompt: string | null,
): Promise<(string | null)[]> {
  if (wavs.length === 0) return [];
  await run(
    "whisper-cli",
    [
      "-m",
      model,
      "-l",
      "ja",
      "-t",
      args.threads,
      "-bs",
      args.beam,
      "-bo",
      args.beam,
      "-ojf",
      "-np",
      ...(prompt ? ["--prompt", prompt] : []),
      ...wavs,
    ],
    BIG,
  );
  return Promise.all(
    wavs.map(async (w) => {
      const r = parseWhisperJson(
        JSON.parse(await readFile(`${w}.json`, "utf8")) as WhisperJson,
      );
      const t = chunkText(r).trim();
      return t === "" ? null : t;
    }),
  );
}

function sourceFor(
  book: TranscriptBook,
  no: number,
  pairs: TranscriptPair[],
): CardSource {
  return book === "ilmuta"
    ? ilmutaCardSource(lessons, no)
    : ilmuntaCardSource(lessons, pairs, no);
}

function promptFor(source: CardSource): string {
  return buildPrompt([
    ...(source.focus ?? []).map((w) => w.ja),
    ...source.sentences.map((s) => s.ja),
  ]);
}

/** 맞춘(통째) 일본어 구간 차례들 */
function wholeSet(
  segments: TranscriptSegment[],
  source: CardSource,
): Set<number> {
  const cards = buildCards(segments, source);
  const out = new Set<number>();
  segments.forEach((s, i) => {
    if (s.lang === "ja" && cards[String(i)]?.whole) out.add(i);
  });
  return out;
}

/**
 * 파일 하나를 다시 받아 적고 나은 구간만 바꾼 자막을 돌려준다.
 * pairsOf: 바뀐 구간 열로 일문따 짝을 다시 만들지(문법 예문 파일), 고정된 짝을 쓸지.
 */
async function retryFile(
  job: FileJob,
  t: Transcript,
  sourceOf: (segments: TranscriptSegment[]) => CardSource,
  tmpRoot: string,
): Promise<Transcript> {
  const key = `${job.book} ${job.kind}`;
  const st = stat(key);
  st.files++;
  const segments = t.segments.map((s) => ({ ...s }));
  const before = wholeSet(segments, sourceOf(segments));
  const targets = segments
    .map((_, i) => i)
    .filter(
      (i) =>
        segments[i].lang === "ja" &&
        !before.has(i) &&
        !isNoiseLine(segments[i].text),
    );
  if (targets.length === 0) return t;
  st.targets += targets.length;

  const source0 = sourceOf(segments);
  const prompt = promptFor(source0);
  const toKana = (x: string) => kanaOf(x, source0.glossary);
  const cacheFile = path.join(rawDir, job.book, `${job.item}.json`);
  const cached: Cached = existsSync(cacheFile)
    ? (JSON.parse(await readFile(cacheFile, "utf8")) as Cached)
    : { prompt, prompted: {}, plain: {} };
  // 판정 규칙을 고쳐 일문따 짝이 달라지면 prompt도 조금 달라진다. prompt는 표기를 끌어당길 뿐이라
  // 이미 받은 결과를 그대로 쓴다(처음부터 다시 받으려면 캐시 폴더를 지운다)
  const needPrompted = targets.filter(
    (i) => !(segKey(segments[i]) in cached.prompted),
  );
  const needPlain = targets.filter(
    (i) => !(segKey(segments[i]) in cached.plain),
  );

  if (needPrompted.length + needPlain.length > 0) {
    const work = path.join(tmpRoot, `${job.book}-${job.item}`);
    try {
      await mkdir(work, { recursive: true });
      const full = path.join(work, "full.wav");
      await toWav(job.src, full);
      const pcm = readWav(await readFile(full));
      const clip = async (sub: string, idx: number[]) => {
        await mkdir(path.join(work, sub), { recursive: true });
        return Promise.all(
          idx.map(async (i) => {
            const s = segments[i];
            const prev = segments[i - 1];
            const next = segments[i + 1];
            const from = Math.max(
              0,
              s.start - PAD,
              prev ? Math.min(s.start, prev.end - NEIGHBOR_OVERLAP) : 0,
            );
            const to = Math.min(
              t.durationSec,
              s.end + PAD,
              next
                ? Math.max(s.end, next.start + NEIGHBOR_OVERLAP)
                : t.durationSec,
            );
            const f = path.join(
              work,
              sub,
              `c${String(i).padStart(4, "0")}.wav`,
            );
            await writeFile(f, sliceWav(pcm, from, to));
            return f;
          }),
        );
      };
      const p = await whisperJa(await clip("p", needPrompted), prompt || null);
      needPrompted.forEach((i, k) => {
        cached.prompted[segKey(segments[i])] = p[k];
      });
      const q = await whisperJa(await clip("q", needPlain), null);
      needPlain.forEach((i, k) => {
        cached.plain[segKey(segments[i])] = q[k];
      });
      await writeJson(cacheFile, cached);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  let changed = 0;
  let current = wholeSet(segments, sourceOf(segments));
  for (const i of targets) {
    const s = segments[i];
    const original = s.text;
    const makesWhole = (text: string) => {
      s.text = text;
      const after = wholeSet(segments, sourceOf(segments));
      s.text = original;
      if (!after.has(i)) return false;
      // 다른 구간의 맞춤을 잃지 않는다
      for (const j of current) if (!after.has(j)) return false;
      return true;
    };
    const verdict = judge(
      {
        original,
        prompted: cached.prompted[segKey(s)] ?? null,
        plain: cached.plain[segKey(s)] ?? null,
        durationSec: s.end - s.start,
        mixedSpeech: job.kind === "lecture",
      },
      makesWhole,
      toKana,
    );
    if (!verdict.change) continue;
    s.text = verdict.text;
    changed++;
    st[verdict.kind]++;
    current = wholeSet(segments, sourceOf(segments));
  }
  if (changed === 0) return t;
  st.changedFiles++;
  return { ...t, segments };
}

/** 같은 강·과 묶음. 일문따는 문법 예문(`NN-1`)을 맨 앞에 둔다 */
function lessonGroups(jobs: FileJob[]): FileJob[][] {
  const groups = new Map<string, FileJob[]>();
  for (const j of jobs) {
    const no = lessonNoOfItem(j.item);
    if (no === null) continue;
    const k = `${j.book}:${no}`;
    groups.set(k, [...(groups.get(k) ?? []), j]);
  }
  for (const list of groups.values())
    list.sort((a, b) => {
      const ga = a.kind === "example" && /^\d{2}-1$/.test(a.item) ? 0 : 1;
      const gb = b.kind === "example" && /^\d{2}-1$/.test(b.item) ? 0 : 1;
      return ga - gb;
    });
  return [...groups.values()];
}

async function processGroup(group: FileJob[], tmpRoot: string) {
  let pairs: TranscriptPair[] | null = null;
  for (const job of group) {
    const t0 = Date.now();
    const t = loadTranscript(job.book, job.item, dir);
    if (!t) continue;
    const no = lessonNoOfItem(job.item) as number;
    const grammar =
      job.book === "ilmunta" &&
      job.kind === "example" &&
      /^\d{2}-1$/.test(job.item);
    if (job.book === "ilmunta" && pairs === null && !grammar) {
      // 문법 예문 자막이 없는 과: 원래 짝(없으면 빈 열)
      const g = loadTranscript(
        "ilmunta",
        `${String(no).padStart(2, "0")}-1`,
        dir,
      );
      pairs = g ? findRepeatPairs(withoutNoise(g.segments)) : [];
    }
    const sourceOf = (segments: TranscriptSegment[]) =>
      sourceFor(
        job.book,
        no,
        grammar ? findRepeatPairs(withoutNoise(segments)) : (pairs ?? []),
      );
    try {
      const next = await retryFile(job, t, sourceOf, tmpRoot);
      if (grammar) pairs = findRepeatPairs(withoutNoise(next.segments));
      await writeJson(
        path.join(args.out, job.book, `${job.item}.json`),
        next,
        1,
      );
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      const changed =
        next === t
          ? 0
          : next.segments.filter((s, i) => s.text !== t.segments[i].text)
              .length;
      console.log(`${job.book}/${job.item} 바꾼 구간 ${changed} (${sec}s)`);
    } catch (e) {
      console.error(
        `[실패] ${job.book}/${job.item}: ${e instanceof Error ? e.message : e}`,
      );
      await writeJson(path.join(args.out, job.book, `${job.item}.json`), t, 1);
    }
  }
}

async function main() {
  let jobs = listJobs({
    ilmuta:
      process.env.ILMUTA_DIR ??
      path.join(homedir(), "personal/study/japanese/BN003460_total"),
    ilmunta:
      process.env.ILMUNTA_DIR ??
      path.join(homedir(), "personal/study/japanese/BN003602_total"),
  });
  if (args.book) jobs = jobs.filter((j) => j.book === args.book);
  if (args.only) {
    const wanted = new Set(args.only.split(","));
    jobs = jobs.filter((j) => wanted.has(`${j.book}/${j.item}`));
  }
  const queue = lessonGroups(jobs);
  if (args.limit) queue.splice(Number(args.limit));
  console.log(
    `묶음 ${queue.length}개, 파일 ${queue.flat().length}개, 동시에 ${args.jobs}개`,
  );
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "sj-retranscribe-"));
  const started = Date.now();
  try {
    await Promise.all(
      Array.from({ length: Number(args.jobs) }, async () => {
        for (let g = queue.shift(); g; g = queue.shift())
          await processGroup(g, tmpRoot);
      }),
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
  console.log(
    "묶음\t파일\t바뀐 파일\t다시 받아 적은 구간\t맞춤으로 바꿈\t두 받아쓰기 일치로 바꿈\t한자 표기만 고침",
  );
  for (const [k, s] of Object.entries(stats))
    console.log(
      [
        k,
        s.files,
        s.changedFiles,
        s.targets,
        s.matched,
        s.agreed,
        s.kanji,
      ].join("\t"),
    );
  console.log(`끝: ${((Date.now() - started) / 60000).toFixed(1)}분`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
