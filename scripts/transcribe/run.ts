/**
 * 교재 오디오 전체를 시각 붙은 자막 JSON으로 만든다(로컬 whisper.cpp만 쓴다).
 *
 *   pnpm transcribe [--only <book>/<item>,...] [--book ilmuta|ilmunta] [--kind lecture|example]
 *                   [--jobs 3] [--threads 2] [--limit N] [--force] [--rebuild]
 *
 * 결과: content/transcripts/<book>/<item>.json (교재 글이라 git 밖).
 * whisper 원 결과는 TRANSCRIBE_RAW_DIR(기본 ~/.cache/study-japanese/transcribe-raw)에 남긴다.
 * - 이미 있는 원 결과는 whisper를 다시 돌리지 않으므로, 끊겨도 다시 돌리면 이어 간다.
 * - `--rebuild`: whisper 없이 원 결과에서 자막만 다시 만든다(고르기 규칙을 고친 뒤).
 * - `--force`: 원 결과도 버리고 whisper부터 다시 돌린다.
 * 필요한 도구: ffmpeg, whisper-cli(whisper.cpp). 모델은 WHISPER_MODEL 또는 ~/.cache/whisper/ggml-large-v3-turbo.bin.
 * 자료 폴더는 ILMUTA_DIR·ILMUNTA_DIR로 바꿀 수 있고, 읽기만 한다.
 */
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
import { parseArgs } from "node:util";
import {
  buildTranscript,
  type RawTranscription,
} from "@/lib/transcript/assemble";
import { listJobs } from "./jobs";
import { type FileJob, transcribeFile } from "./transcribe-file";

const root = process.cwd();
const { values: args } = parseArgs({
  options: {
    only: { type: "string" },
    book: { type: "string" },
    kind: { type: "string" },
    jobs: { type: "string", default: "3" },
    threads: { type: "string", default: "2" },
    limit: { type: "string" },
    force: { type: "boolean", default: false },
    rebuild: { type: "boolean", default: false },
    out: { type: "string", default: path.join(root, "content/transcripts") },
  },
});

const model =
  process.env.WHISPER_MODEL ??
  path.join(homedir(), ".cache/whisper/ggml-large-v3-turbo.bin");
const rawDir =
  process.env.TRANSCRIBE_RAW_DIR ??
  path.join(homedir(), ".cache/study-japanese/transcribe-raw");
const whisperOpts = { model, threads: Number(args.threads), audioCtx: 768 };
const outPath = (j: FileJob) => path.join(args.out, j.book, `${j.item}.json`);
const rawPath = (j: FileJob) => path.join(rawDir, j.book, `${j.item}.json`);

let jobs = listJobs({
  ilmuta:
    process.env.ILMUTA_DIR ??
    path.join(homedir(), "personal/study/japanese/BN003460_total"),
  ilmunta:
    process.env.ILMUNTA_DIR ??
    path.join(homedir(), "personal/study/japanese/BN003602_total"),
});
if (args.only) {
  const wanted = new Set(args.only.split(","));
  jobs = jobs.filter((j) => wanted.has(`${j.book}/${j.item}`));
}
if (args.book) jobs = jobs.filter((j) => j.book === args.book);
if (args.kind) jobs = jobs.filter((j) => j.kind === args.kind);
const todo = args.rebuild
  ? jobs.filter((j) => existsSync(rawPath(j)))
  : jobs.filter((j) => args.force || !existsSync(outPath(j)));
const queue = args.limit ? todo.slice(0, Number(args.limit)) : todo;

async function writeJson(
  dest: string,
  data: unknown,
  indent?: number,
): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(`${dest}.tmp`, `${JSON.stringify(data, null, indent)}\n`);
  await rename(`${dest}.tmp`, dest);
}

/** 원 결과를 캐시에서 읽거나, 없으면 whisper로 만들어 캐시에 둔다. */
async function rawFor(
  job: FileJob,
  tmpRoot: string,
): Promise<{ raw: RawTranscription; fresh: boolean }> {
  if (!args.force && existsSync(rawPath(job))) {
    return {
      raw: JSON.parse(await readFile(rawPath(job), "utf8")) as RawTranscription,
      fresh: false,
    };
  }
  const work = path.join(tmpRoot, `${job.book}-${job.item}`);
  try {
    const raw = await transcribeFile(job, work, whisperOpts);
    await writeJson(rawPath(job), raw);
    return { raw, fresh: true };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

let done = 0;
let failed = 0;

async function worker(tmpRoot: string): Promise<void> {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const t0 = Date.now();
    try {
      const { raw, fresh } = await rawFor(job, tmpRoot);
      const transcript = buildTranscript(job, raw);
      await writeJson(outPath(job), transcript, 1);
      done++;
      if (fresh || !args.rebuild) {
        const reruns = new Set([...Object.keys(raw.ko), ...Object.keys(raw.ja)])
          .size;
        console.log(
          `[${done + failed}] ${job.book}/${job.item} ${transcript.durationSec}s → ${((Date.now() - t0) / 1000).toFixed(1)}s, 조각 ${raw.spans.length}(다시 ${reruns}), 구간 ${transcript.segments.length}`,
        );
      }
    } catch (e) {
      failed++;
      console.error(
        `[실패] ${job.book}/${job.item}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `전체 ${jobs.length}개 중 할 것 ${queue.length}개, 동시에 ${args.jobs}개`,
  );
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "sj-transcribe-"));
  const started = Date.now();
  try {
    await Promise.all(
      Array.from({ length: Number(args.jobs) }, () => worker(tmpRoot)),
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
  console.log(
    `끝: 성공 ${done}, 실패 ${failed}, ${((Date.now() - started) / 60000).toFixed(1)}분`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
