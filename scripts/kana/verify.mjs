#!/usr/bin/env node
// 잘린 <out>/<id>.mp3를 whisper로 받아써 기대 글자와 맞는지 표로 찍는다.
//
// 사용: node scripts/kana/verify.mjs [--rows] [--out <폴더>] [--only a,ka]
//   --rows         글자 하나씩이 아니라, 행의 파일을 0.4초 간격으로 이어
//                  붙여 받아쓴다(앞뒤 맥락이 생겨 훨씬 정확하다)
//   WHISPER_BIN    whisper-cli 경로(기본: whisper-cli)
//   WHISPER_MODEL  모델 경로(기본: ~/.cache/whisper/ggml-large-v3-turbo.bin)
//   WHISPER_PROMPT 글자별 받아쓰기 때 줄 앞글(기본: 가나로 적으라는 한 줄)
//
// 글자 하나만 들으면 whisper가 숫자·알파벳·한자(2=に, G=じ, 図=ず)로 적거나
// 약한 자음을 놓친다(ほ·ぽ를 お로). 글자별 표에서 틀린 줄은 --rows 결과로
// 판단한다. 앞뒤에 무음 0.7초를 붙여 받아쓴다.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_OUT_DIR, ROWS, SAME_SOUND } from "./layout.mjs";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    only: { type: "string" },
    rows: { type: "boolean", default: false },
  },
});
const outDir = values.out ?? process.env.KANA_OUT_DIR ?? DEFAULT_OUT_DIR;
const whisper = process.env.WHISPER_BIN ?? "whisper-cli";
const model =
  process.env.WHISPER_MODEL ??
  join(homedir(), ".cache/whisper/ggml-large-v3-turbo.bin");
const only = values.only ? new Set(values.only.split(",")) : null;
// 숫자·알파벳·한자 대신 가나로 적도록 앞글을 준다.
const prompt =
  process.env.WHISPER_PROMPT ?? "ひらがなを一文字ずつ、ひらがなで書きます。";

function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

function normalize(text) {
  return [...toHiragana(text)]
    .map((ch) => SAME_SOUND[ch] ?? ch)
    .filter((ch) => /[ぁ-ゖ]/.test(ch))
    .join("");
}

// 글자 끝 모음(あ단~お단)을 구한다.
const VOWEL_ROWS = [
  "あかさたなはまやらわがざだばぱぁ",
  "いきしちにひみりぎじぢびぴぃ",
  "うくすつぬふむゆるぐずづぶぷぅ",
  "えけせてねへめれげぜでべぺぇ",
  "おこそとのほもよろをごぞどぼぽぉ",
];
const VOWELS = "あいうえお";
function vowelOf(ch) {
  const i = VOWEL_ROWS.findIndex((row) => row.includes(ch));
  return i < 0 ? null : VOWELS[i];
}

// 「ねえ」「はぁ」처럼 같은 모음을 늘인 받아쓰기는 일치로 본다.
function matchesChar(heard, want) {
  const h = normalize(heard);
  if (!h.startsWith(want)) return false;
  const v = vowelOf(want);
  return [...h.slice(want.length)].every((ch) => vowelOf(ch) === v);
}

// 행 받아쓰기: わ를 조사 표기 は로 적는 것은 같은 소리로 본다.
function matchesRow(heard, want) {
  const h = [...normalize(heard)];
  const w = [...normalize(want)];
  return (
    h.length === w.length &&
    w.every((ch, i) => h[i] === ch || (ch === "わ" && h[i] === "は"))
  );
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} 실패: ${r.stderr}`);
  return r;
}

function transcribe(wav, withPrompt) {
  const args = ["-m", model, "-l", "ja", "-nt", "-np"];
  if (withPrompt) args.push("--prompt", prompt);
  return run(whisper, [...args, wav]).stdout.replace(/\s+/g, "");
}

function duration(file) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ]).stdout.trim(),
  );
}

// 파일들을 0.4초 간격으로 이어 앞뒤 무음 0.7초를 붙인 16kHz wav로 만든다.
function toWav(mp3s, wav) {
  const inputs = mp3s.flatMap((f) => ["-i", f]);
  const parts = mp3s.map(
    (_, i) =>
      `[${i}]aresample=16000,aformat=channel_layouts=mono,apad=pad_dur=0.4[p${i}]`,
  );
  const concat = `${mp3s.map((_, i) => `[p${i}]`).join("")}concat=n=${mp3s.length}:v=0:a=1,adelay=700,apad=pad_dur=0.7[out]`;
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...inputs,
    "-filter_complex",
    [...parts, concat].join(";"),
    "-map",
    "[out]",
    wav,
  ]);
}

const work = mkdtempSync(join(tmpdir(), "kana-verify-"));
const results = [];
try {
  for (const row of ROWS) {
    if (values.rows) {
      if (only && !row.ids.some((id) => only.has(id))) continue;
      const wav = join(work, `${row.ids[0]}-row.wav`);
      toWav(
        row.ids.map((id) => join(outDir, `${id}.mp3`)),
        wav,
      );
      const heard = transcribe(wav, false);
      results.push({
        label: row.ids.join(" "),
        want: row.kana,
        heard,
        ok: matchesRow(heard, row.kana),
      });
      continue;
    }
    [...row.kana].forEach((kana, i) => {
      const id = row.ids[i];
      if (only && !only.has(id)) return;
      const mp3 = join(outDir, `${id}.mp3`);
      const wav = join(work, `${id}.wav`);
      toWav([mp3], wav);
      const heard = transcribe(wav, true);
      results.push({
        label: id,
        want: kana,
        heard,
        seconds: duration(mp3),
        ok: matchesChar(heard, normalize(kana)),
      });
    });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

const withLength = !values.rows;
console.log(
  `| id | 기대 | 받아쓴 글 |${withLength ? " 길이(초) |" : ""} 일치 |`,
);
console.log(`| --- | --- | --- |${withLength ? " --- |" : ""} --- |`);
for (const r of results) {
  const length = withLength ? ` ${r.seconds.toFixed(2)} |` : "";
  console.log(
    `| ${r.label} | ${r.want} | ${r.heard || "(없음)"} |${length} ${r.ok ? "O" : "X"} |`,
  );
}
const okCount = results.filter((r) => r.ok).length;
console.log(`\n일치 ${okCount}/${results.length}`);
