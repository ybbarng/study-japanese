import type { Track } from "@/lib/player/queue";
import type { Song } from "./schema";

// 노래를 사이트 재생기에 올리는 모양. 노래 파일은 media/songs/ 아래에 있고,
// 이 폴더는 출처 목록(src/lib/sources/registry.ts)에 없어 관리자만 받는다(src/lib/media/serve.ts).

export const SONG_BOOK = "song" as const;
export const SONG_MEDIA_DIR = "songs";

export function songAudioUrl(audioFile: string): string {
  return `/media/${SONG_MEDIA_DIR}/${encodeURIComponent(audioFile)}`;
}

export function songTrack(
  song: Pick<Song, "slug" | "title" | "artist" | "audioFile">,
): Track {
  return {
    book: SONG_BOOK,
    item: song.slug,
    kind: "extra",
    src: songAudioUrl(song.audioFile),
    title: song.title,
    subtitle: song.artist,
  };
}
