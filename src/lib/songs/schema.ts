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

/** 한 줄에 둘 수 있는 낱말 조각 수. 줄 글이 200자까지라 조각도 그 이상 나올 수 없다 */
export const MAX_TOKENS_PER_LINE = 200;

/**
 * 형태소 분석기가 나눈 낱말 조각 하나. 관리자 브라우저가 저장할 때 분석해 보낸다
 * (분석기가 메모리를 많이 써 서버에서 돌리지 않는다, src/lib/songs/browser-analyzer.ts)
 */
export const songTokenSchema = z.object({
  /** 가사에 나온 그대로 */
  surface: z.string().min(1).max(100),
  /** 히라가나 읽는 법(한자가 들어 있을 때만) */
  reading: z.string().max(200).optional(),
  /** 기본형(겉모양과 다를 때만, 예: 降っ → 降る) */
  base: z.string().max(100).optional(),
  /** 품사(분석기 표기 그대로, 예: 名詞) */
  pos: z.string().max(20).optional(),
  /** 품사 세부(예: 非自立, 接続助詞) */
  posDetail: z.string().max(20).optional(),
});
export type SongToken = z.infer<typeof songTokenSchema>;

const timeSchema = z.number().min(0).max(MAX_SEC);

/**
 * 가사 한 줄. 낱말 조각(tokens)은 브라우저가 분석해 붙여 보낸다.
 * 조각을 이으면 줄 글과 같아야 한다(다른 줄의 조각이 섞이거나 글자가 빠진 것을 막는다).
 * 조각 없이 오면 서버가 같은 글로 저장돼 있던 조각을 이어 쓴다(src/lib/songs/annotate.ts).
 */
export const songLineSchema = z
  .object({
    ja: z.string().trim().min(1).max(200),
    start: timeSchema.optional(),
    end: timeSchema.optional(),
    note: z.string().max(1000).optional(),
    tokens: z.array(songTokenSchema).max(MAX_TOKENS_PER_LINE).optional(),
  })
  .refine(
    (line) =>
      !line.tokens || line.tokens.map((t) => t.surface).join("") === line.ja,
    { message: "낱말 조각을 이은 글이 줄 글과 다름", path: ["tokens"] },
  );
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

/** 서버에 보낼 줄 모양만 남긴다(화면이 덧붙인 다른 필드는 뺀다) */
export function toLineBody(line: SongLine): SongLine {
  const out: SongLine = { ja: line.ja };
  if (line.start !== undefined) out.start = line.start;
  if (line.end !== undefined) out.end = line.end;
  if (line.note !== undefined) out.note = line.note;
  if (line.tokens !== undefined) out.tokens = line.tokens;
  return out;
}
