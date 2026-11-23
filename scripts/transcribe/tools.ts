/** 바깥 도구(ffmpeg, whisper-cli) 부르기. 모두 이 맥 안에서만 돈다. */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  type ChunkResult,
  parseWhisperJson,
  type WhisperJson,
} from "@/lib/transcript/whisper-json";

const run = promisify(execFile);
const BIG = { maxBuffer: 64 * 1024 * 1024 };

/** mp3 → 16kHz 모노 16비트 wav */
export async function toWav(src: string, dest: string): Promise<void> {
  await run(
    "ffmpeg",
    [
      "-nostdin",
      "-loglevel",
      "error",
      "-y",
      "-i",
      src,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      dest,
    ],
    BIG,
  );
}

/** ffmpeg silencedetect 로그(stderr)를 돌려준다. */
export async function silenceLog(
  wav: string,
  noiseDb: number,
  minSilence: number,
): Promise<string> {
  const { stderr } = await run(
    "ffmpeg",
    [
      "-nostdin",
      "-i",
      wav,
      "-af",
      `silencedetect=noise=${noiseDb}dB:d=${minSilence}`,
      "-f",
      "null",
      "-",
    ],
    BIG,
  );
  return stderr;
}

export type WhisperOptions = {
  model: string;
  threads: number;
  /** whisper 오디오 창 크기. 768이면 약 15초까지 듣는다 */
  audioCtx: number;
};

/**
 * 여러 wav를 whisper-cli 한 번으로 전사한다(모델을 한 번만 읽는다).
 * 결과는 각 wav 옆의 `<wav>.json`에 쓰이고, 그것을 읽어 같은 차례로 돌려준다.
 */
export async function whisper(
  wavs: string[],
  lang: "auto" | "ko" | "ja",
  opts: WhisperOptions,
): Promise<ChunkResult[]> {
  if (wavs.length === 0) return [];
  await run(
    "whisper-cli",
    [
      "-m",
      opts.model,
      "-l",
      lang,
      "-t",
      String(opts.threads),
      "-ac",
      String(opts.audioCtx),
      "-mc",
      "0",
      "-ojf",
      "-np",
      ...wavs,
    ],
    BIG,
  );
  return Promise.all(
    wavs.map(async (w) =>
      parseWhisperJson(
        JSON.parse(await readFile(`${w}.json`, "utf8")) as WhisperJson,
      ),
    ),
  );
}
