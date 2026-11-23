import { type Song, type SongInput, toLineInput } from "@/lib/songs/schema";

export type SaveResult =
  | { ok: true; song: Song }
  | { ok: false; error: string };

const MESSAGES: Record<number, string> = {
  400: "형식이 맞지 않습니다. 빈칸과 파일 이름을 확인하세요.",
  401: "로그인이 풀렸습니다. 다시 로그인하세요.",
  409: "같은 주소 이름의 노래가 이미 있습니다.",
  413: "가사가 너무 깁니다.",
};

/** 노래를 서버에 저장한다. create면 같은 이름이 있을 때 덮어쓰지 않는다 */
export async function saveSong(
  slug: string,
  input: SongInput,
  { create = false }: { create?: boolean } = {},
): Promise<SaveResult> {
  try {
    const res = await fetch(`/api/songs/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(create ? { "If-None-Match": "*" } : {}),
      },
      body: JSON.stringify({
        ...input,
        lines: input.lines.map(toLineInput),
      }),
    });
    if (!res.ok)
      return {
        ok: false,
        error: MESSAGES[res.status] ?? `저장하지 못했습니다(${res.status}).`,
      };
    const { item } = (await res.json()) as { item: Song };
    return { ok: true, song: item };
  } catch {
    return { ok: false, error: "서버에 닿지 못했습니다. 연결을 확인하세요." };
  }
}

/** 저장된 노래에서 다시 보낼 본문 */
export function inputOf(song: Song): SongInput {
  return {
    title: song.title,
    artist: song.artist,
    audioFile: song.audioFile,
    lyricsPublic: song.lyricsPublic,
    lines: song.lines.map(toLineInput),
  };
}
