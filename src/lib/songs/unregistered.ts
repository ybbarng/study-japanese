import { AUDIO_FILE_PATTERN, SLUG_PATTERN } from "./schema";

/**
 * 서버 media/songs/ 폴더에 있지만 아직 노래로 넣지 않은 음원 파일 이름(이름 차례).
 * 파일 이름 규칙(AUDIO_FILE_PATTERN)에 맞지 않는 파일은 넣을 수 없으니 뺀다.
 */
export function unregisteredAudio(
  files: readonly string[],
  songs: readonly { audioFile: string }[],
): string[] {
  const used = new Set(songs.map((s) => s.audioFile));
  return files.filter((f) => AUDIO_FILE_PATTERN.test(f) && !used.has(f)).sort();
}

/** 파일 이름에서 노래 주소 이름을 짐작한다(`lemon.mp3` → `lemon`). 규칙에 안 맞으면 빈 글 */
export function slugFromAudioFile(file: string): string {
  const base = file.replace(/\.(mp3|m4a)$/, "").toLowerCase();
  return SLUG_PATTERN.test(base) ? base : "";
}
