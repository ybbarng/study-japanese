#!/usr/bin/env node
// segments.json의 구간대로 원본을 잘라 <out>/<id>.mp3를 만든다.
//
// 사용: node scripts/kana/cut.mjs [--source <mp3>] [--out <폴더>] [--only a,ka]
//   --source  원본 오디오(기본: KANA_SOURCE 환경 변수, 없으면 layout.mjs 기본값)
//   --out     출력 폴더(기본: KANA_OUT_DIR 환경 변수, 없으면 media/kana)
//   --only    쉼표로 나눈 id만 자른다
//
// 앞뒤에 여유(--pad-before, --pad-after 초)를 두고, 짧게 페이드해 딸깍 소리를
// 막는다. 음량은 글자마다 평균 음량을 --target-db에 맞추되 최대치가 -1dB를
// 넘지 않게 한다(짧은 소리라 loudnorm 대신 이렇게 한다).

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_OUT_DIR, DEFAULT_SOURCE, SEGMENTS_FILE } from "./layout.mjs";

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    out: { type: "string" },
    only: { type: "string" },
    "pad-before": { type: "string", default: "0.08" },
    "pad-after": { type: "string", default: "0.10" },
    "target-db": { type: "string", default: "-18" },
  },
});

const source = values.source ?? process.env.KANA_SOURCE ?? DEFAULT_SOURCE;
const outDir = values.out ?? process.env.KANA_OUT_DIR ?? DEFAULT_OUT_DIR;
const padBefore = Number(values["pad-before"]);
const padAfter = Number(values["pad-after"]);
const targetDb = Number(values["target-db"]);
const only = values.only ? new Set(values.only.split(",")) : null;

const { segments } = JSON.parse(readFileSync(SEGMENTS_FILE, "utf8"));
mkdirSync(outDir, { recursive: true });

function ffmpeg(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], {
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`ffmpeg 실패: ${r.stderr}`);
  return r.stderr;
}

function measure(start, end) {
  const log = ffmpeg([
    "-ss",
    String(start),
    "-to",
    String(end),
    "-i",
    source,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const mean = Number(log.match(/mean_volume: (-?[\d.]+) dB/)[1]);
  const max = Number(log.match(/max_volume: (-?[\d.]+) dB/)[1]);
  return { mean, max };
}

let count = 0;
for (const seg of segments) {
  if (only && !only.has(seg.id)) continue;
  const start = Math.max(0, seg.start - padBefore);
  const end = seg.end + padAfter;
  const duration = end - start;
  const { mean, max } = measure(start, end);
  const gain = Math.min(targetDb - mean, -1 - max);
  const fadeOut = Math.max(0, duration - 0.02);
  const file = join(outDir, `${seg.id}.mp3`);
  ffmpeg([
    "-y",
    "-loglevel",
    "error",
    "-ss",
    String(start),
    "-to",
    String(end),
    "-i",
    source,
    "-af",
    `volume=${gain.toFixed(2)}dB,afade=t=in:d=0.01,afade=t=out:st=${fadeOut.toFixed(3)}:d=0.02`,
    "-ac",
    "1",
    "-ar",
    "44100",
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "4",
    file,
  ]);
  count++;
}
console.log(`${count}개 파일을 ${outDir}에 만듦`);
