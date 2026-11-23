/**
 * 오디오 파일 하나를 whisper로 듣고 원 결과(`RawTranscription`)를 돌려준다.
 *
 * 1. mp3 → 16kHz 모노 wav(임시 폴더)
 * 2. 무음으로 말소리 조각을 나눈다(긴 조각은 짧은 무음에서 다시 자른다)
 * 3. 조각마다 whisper 언어 감지로 전사한다(`-l auto`)
 * 4. 감지와 글자 종류가 엇갈린 조각만 `-l ko`·`-l ja`로 다시 전사한다
 *
 * 고르기와 구간 모으기는 `buildTranscript`(src/lib/transcript/assemble.ts)가 한다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RawTranscription } from "@/lib/transcript/assemble";
import { planRerun } from "@/lib/transcript/choose";
import {
  parseSilences,
  speechRegions,
  splitLongRegions,
} from "@/lib/transcript/regions";
import type { TranscriptBook, TranscriptKind } from "@/lib/transcript/schema";
import type { ChunkResult } from "@/lib/transcript/whisper-json";
import { silenceLog, toWav, type WhisperOptions, whisper } from "./tools";
import { durationOf, readWav, sliceWav } from "./wav";

/** 무음 기준: -35dB 아래로 0.4초 넘게 */
const SILENCE = { noiseDb: -35, minSilence: 0.4 };
/** 긴 조각을 자를 짧은 무음: -30dB 아래로 0.15초 넘게 */
const FINE_SILENCE = { noiseDb: -30, minSilence: 0.15 };
/** whisper 창(-ac 768 ≈ 15.4초)에 들어가게 */
const MAX_CHUNK_SEC = 14;

export type FileJob = {
  book: TranscriptBook;
  kind: TranscriptKind;
  item: string;
  src: string;
};

export async function transcribeFile(
  job: FileJob,
  workDir: string,
  opts: WhisperOptions,
): Promise<RawTranscription> {
  await mkdir(workDir, { recursive: true });
  const wavPath = path.join(workDir, "full.wav");
  await toWav(job.src, wavPath);
  const pcm = readWav(await readFile(wavPath));
  const duration = durationOf(pcm);

  const silences = parseSilences(
    await silenceLog(wavPath, SILENCE.noiseDb, SILENCE.minSilence),
    duration,
  );
  const fine = parseSilences(
    await silenceLog(wavPath, FINE_SILENCE.noiseDb, FINE_SILENCE.minSilence),
    duration,
  );
  const spans = splitLongRegions(
    speechRegions(silences, duration, { pad: 0.1, minLength: 0.2 }),
    fine,
    MAX_CHUNK_SEC,
  );

  const writeChunks = async (dir: string, idx: number[]) => {
    await mkdir(dir, { recursive: true });
    return Promise.all(
      idx.map(async (i) => {
        const f = path.join(dir, `c${String(i).padStart(4, "0")}.wav`);
        await writeFile(f, sliceWav(pcm, spans[i].start, spans[i].end));
        return f;
      }),
    );
  };

  const all = spans.map((_, i) => i);
  const auto = await whisper(
    await writeChunks(path.join(workDir, "auto"), all),
    "auto",
    opts,
  );
  const plans = auto.map(planRerun);

  const rerun = async (lang: "ko" | "ja") => {
    const idx = all.filter((i) => plans[i][lang]);
    const results = await whisper(
      await writeChunks(path.join(workDir, lang), idx),
      lang,
      opts,
    );
    return Object.fromEntries(idx.map((i, k) => [i, results[k]])) as Record<
      number,
      ChunkResult
    >;
  };
  const ko = await rerun("ko");
  const ja = await rerun("ja");
  return { durationSec: duration, spans, auto, ko, ja };
}
