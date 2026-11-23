import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { silentMp3 } from "./silent-mp3";

// E2E용 가짜 노래. 실제 노래·가사를 쓰지 않는다(상업 음원, 공개 저장소).
// 노래 파일은 무음 mp3, 가사는 모양만 같은 지어낸 줄이다.

export const SONG_FILE = "e2e-song.mp3";
export const SONG_SECONDS = 40;

/** 지어낸 가사 넉 줄(한자가 섞여 읽는 법이 달린다) */
export const FAKE_LYRICS = [
  "空を見ていた",
  "テストのうたです",
  "雨が降っても",
  "もういちどうたう",
] as const;

export function writeFakeSong(mediaDir: string) {
  const dir = path.join(mediaDir, "songs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, SONG_FILE), silentMp3(SONG_SECONDS));
}
