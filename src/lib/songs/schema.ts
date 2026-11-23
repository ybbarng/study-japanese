import { z } from "zod";

// 노래 한 곡의 모양. 노래 파일(media/songs/<audioFile>)과 가사는 관리자가 직접 넣는다.
// 세션은 가사를 옮겨 적거나 번역해 넣지 않는다(docs/standing-rules.md "자료 출처와 공개 범위").

/** 주소에 쓰는 노래 이름(영문 소문자·숫자·하이픈) */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
/** media/songs/ 아래 파일 이름. 경로 조각이 되므로 이 모양만 받는다 */
export const AUDIO_FILE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(mp3|m4a)$/;

export const MAX_LINES = 300;
const MAX_SEC = 60 * 60;

const timeSchema = z.number().min(0).max(MAX_SEC);

/**
 * 가사 한 줄: 글·박자·메모만. 읽는 법·낱말 뜻·문법 메모는 DB가 아니라
 * 세션이 쓴 분석 파일(content/songs/<slug>.json, src/lib/songs/analysis.ts)에 둔다.
 * 예전에 저장된 tokens 같은 다른 필드는 받지 않고(zod가 버린다) 읽을 때도 뺀다.
 */
export const songLineSchema = z.object({
  ja: z.string().trim().min(1).max(200),
  start: timeSchema.optional(),
  end: timeSchema.optional(),
  note: z.string().max(1000).optional(),
});
export type SongLine = z.infer<typeof songLineSchema>;

/** PUT /api/songs/[slug]의 본문 */
export const songInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  artist: z.string().trim().min(1).max(100),
  audioFile: z.string().regex(AUDIO_FILE_PATTERN),
  lyricsPublic: z.boolean().default(true),
  lines: z.array(songLineSchema).max(MAX_LINES),
});
export type SongInput = z.infer<typeof songInputSchema>;

export interface Song {
  slug: string;
  title: string;
  artist: string;
  audioFile: string;
  /** 가사 학습 화면을 방문자에게 보이는지(노래 재생은 언제나 관리자만) */
  lyricsPublic: boolean;
  lines: SongLine[];
  createdAt: number;
  updatedAt: number;
}

/** 목록에 보일 것 */
export interface SongSummary {
  slug: string;
  title: string;
  artist: string;
  lyricsPublic: boolean;
  lineCount: number;
  /** 시작 시각을 맞춘 줄 수 */
  timedCount: number;
  /** 줄마다 글의 지문(study-state lineKey). 목록에서 익힌 줄을 세는 데 쓴다(가사는 보내지 않는다) */
  lineKeys: string[];
  updatedAt: number;
}

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** 이 사람이 이 노래의 가사 화면을 볼 수 있는지 */
export function canSeeLyrics(
  song: Pick<Song, "lyricsPublic">,
  isAdmin: boolean,
): boolean {
  return isAdmin || song.lyricsPublic;
}

/** 줄 모양만 남긴다(화면이 덧붙였거나 예전에 저장된 다른 필드는 뺀다) */
export function toLineBody(line: SongLine): SongLine {
  const out: SongLine = { ja: line.ja };
  if (line.start !== undefined) out.start = line.start;
  if (line.end !== undefined) out.end = line.end;
  if (line.note !== undefined) out.note = line.note;
  return out;
}
