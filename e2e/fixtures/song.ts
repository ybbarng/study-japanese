import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lineHash } from "@/lib/songs/line-hash";
import { silentMp3 } from "./silent-mp3";

// E2E용 가짜 노래. 실제 노래·가사를 쓰지 않는다(상업 음원, 공개 저장소).
// 노래 파일은 무음 mp3, 가사·해석·분석은 모양만 같은 지어낸 것이다.

export const SONG_FILE = "e2e-song.mp3";
export const SONG_SECONDS = 40;

/** 지어낸 가사 넉 줄(한자가 섞여 읽는 법이 달린다) */
export const FAKE_LYRICS = [
  "空を見ていた",
  "テストのうた",
  "雨が降っても",
  "もういちどうたう",
] as const;

/** 지어낸 해석(가사와 줄 수가 같다) */
export const FAKE_KO = [
  "하늘을 보고 있었다",
  "시험의 노래",
  "비가 내려도",
  "한 번 더 노래한다",
] as const;

/** 분석 파일을 미리 둘 노래 주소 이름. 분석 전 화면은 이 밖의 이름으로 본다 */
export const ANALYZED_SLUGS = ["e2e-public", "e2e-flow", "e2e-stale"] as const;

/** 세션이 쓰는 분석 파일 모양(가사 글 없이 차례·지문·위치). 지어낸 뜻·문법 메모 */
export function fakeAnalysis(slug: string) {
  return {
    slug,
    analyzedAt: "2026-11-23",
    lines: [
      {
        index: 0,
        hash: lineHash(FAKE_LYRICS[0]),
        tokens: [
          { start: 0, length: 1, reading: "そら", pos: "名詞", gloss: "하늘" },
          {
            start: 2,
            length: 4,
            reading: "みていた",
            base: "見る",
            pos: "動詞",
            gloss: "보고 있었다",
          },
        ],
        grammar: [
          {
            pattern: "〜ていた",
            explain: "시험용 설명: 하고 있었다.",
            ref: { book: "ilmuta", lesson: 3 },
          },
        ],
      },
      {
        index: 1,
        hash: lineHash(FAKE_LYRICS[1]),
        tokens: [{ start: 0, length: 3, pos: "名詞", gloss: "시험" }],
      },
      {
        index: 2,
        hash: lineHash(FAKE_LYRICS[2]),
        tokens: [
          { start: 0, length: 1, reading: "あめ", pos: "名詞", gloss: "비" },
          {
            start: 2,
            length: 4,
            reading: "ふっても",
            base: "降る",
            pos: "動詞",
            gloss: "내려도",
          },
        ],
        grammar: [
          {
            pattern: "〜ても",
            explain: "시험용 설명: 해도.",
            ref: { book: "ilmunta", lesson: 1 },
          },
        ],
      },
      { index: 3, hash: lineHash(FAKE_LYRICS[3]), tokens: [] },
    ],
  };
}

export function writeFakeSong(mediaDir: string, contentDir: string) {
  const dir = path.join(mediaDir, "songs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, SONG_FILE), silentMp3(SONG_SECONDS));

  const songsDir = path.join(contentDir, "songs");
  mkdirSync(songsDir, { recursive: true });
  for (const slug of ANALYZED_SLUGS)
    writeFileSync(
      path.join(songsDir, `${slug}.json`),
      JSON.stringify(fakeAnalysis(slug)),
    );
}
