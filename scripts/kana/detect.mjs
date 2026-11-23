#!/usr/bin/env node
// 히라가나표 오디오에서 글자 하나씩 읽은 구간을 찾아 segments.json을 만든다.
//
// 사용: node scripts/kana/detect.mjs [--source <mp3>] [--write]
//   --source  원본 오디오(기본: KANA_SOURCE 환경 변수, 없으면 layout.mjs 기본값)
//   --write   결과를 scripts/kana/segments.json에 쓴다(없으면 화면에만 찍는다)
//
// 방법: ffmpeg silencedetect로 소리 덩어리를 나눈 뒤, 짧은 덩어리(글자 하나)가
// 이어진 묶음만 골라 ROWS의 행 길이(5·3)와 차례대로 맞춘다. 행 전체를 이어
// 읽은 긴 덩어리와 한국어 안내는 길이로 걸러진다. 맞지 않으면 실패한다.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { DEFAULT_SOURCE, ROWS, SEGMENTS_FILE } from "./layout.mjs";

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    write: { type: "boolean", default: false },
    noise: { type: "string", default: "-35dB" },
    "min-silence": { type: "string", default: "0.25" },
    "max-char": { type: "string", default: "0.5" },
  },
});

const source = values.source ?? process.env.KANA_SOURCE ?? DEFAULT_SOURCE;
const maxChar = Number(values["max-char"]);

function detectChunks(file) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      `silencedetect=noise=${values.noise}:d=${values["min-silence"]}`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg 실패: ${result.stderr}`);
  }
  const silences = [];
  for (const line of result.stderr.split("\n")) {
    const start = line.match(/silence_start: ([\d.]+)/);
    if (start) silences.push({ start: Number(start[1]) });
    const end = line.match(/silence_end: ([\d.]+)/);
    if (end) silences[silences.length - 1].end = Number(end[1]);
  }
  const chunks = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start - cursor > 0.05) chunks.push({ start: cursor, end: s.start });
    cursor = s.end ?? Number.POSITIVE_INFINITY;
  }
  return chunks;
}

function groupShortRuns(chunks) {
  const runs = [];
  let run = [];
  for (const c of chunks) {
    if (c.end - c.start < maxChar) {
      run.push(c);
    } else {
      if (run.length) runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}

const chunks = detectChunks(source);
const rowSizes = new Set(ROWS.map((r) => r.ids.length));
const runs = groupShortRuns(chunks).filter((r) => rowSizes.has(r.length));

if (runs.length !== ROWS.length) {
  console.error(
    `행 수가 맞지 않음: 찾은 묶음 ${runs.length}개, 기대 ${ROWS.length}개`,
  );
  for (const r of runs) {
    console.error(`  ${r[0].start.toFixed(2)}s부터 ${r.length}개`);
  }
  process.exit(1);
}

const segments = [];
ROWS.forEach((row, i) => {
  if (runs[i].length !== row.ids.length) {
    console.error(
      `${row.kana} 행: 덩어리 ${runs[i].length}개, 기대 ${row.ids.length}개`,
    );
    process.exit(1);
  }
  row.ids.forEach((id, j) => {
    const c = runs[i][j];
    segments.push({
      id,
      start: Number(c.start.toFixed(3)),
      end: Number(c.end.toFixed(3)),
    });
  });
});

const output = `${JSON.stringify({ source: "A01-1.mp3", segments }, null, 2)}\n`;
if (values.write) {
  writeFileSync(SEGMENTS_FILE, output);
  console.log(`${segments.length}개 구간을 ${SEGMENTS_FILE}에 씀`);
} else {
  process.stdout.write(output);
}
