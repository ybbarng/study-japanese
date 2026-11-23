import type { DatabaseSync } from "node:sqlite";
import {
  type Song,
  type SongInput,
  type SongLine,
  type SongSummary,
  toLineBody,
} from "@/lib/songs/schema";
import { lineKey } from "@/lib/songs/study-state";
import { timedCount } from "@/lib/songs/timing";

// 노래 학습 데이터: 한 곡에 한 줄. 가사 줄은 JSON으로 둔다(줄 단위로 따로 찾을 일이 없다).
// 관리자 한 사람이 고치므로 늦게 온 것이 이긴다는 판정 없이 그대로 바꾼다.

type Row = {
  slug: string;
  title: string;
  artist: string;
  audio_file: string;
  lines: string;
  lyrics_public: number;
  created_at: number;
  updated_at: number;
};

const COLUMNS =
  "slug, title, artist, audio_file, lines, lyrics_public, created_at, updated_at";

function fromRow(r: Row): Song {
  return {
    slug: r.slug,
    title: r.title,
    artist: r.artist,
    audioFile: r.audio_file,
    // 예전에 저장된 낱말 조각(tokens)은 버린다. 분석은 content/songs/<slug>.json이 맡는다
    lines: (JSON.parse(r.lines) as SongLine[]).map(toLineBody),
    lyricsPublic: Number(r.lyrics_public) === 1,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export function toSummary(song: Song): SongSummary {
  return {
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    lyricsPublic: song.lyricsPublic,
    lineCount: song.lines.length,
    timedCount: timedCount(song.lines),
    lineKeys: song.lines.map((l) => lineKey(l.ja)),
    updatedAt: song.updatedAt,
  };
}

export function getSong(db: DatabaseSync, slug: string): Song | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM songs WHERE slug = ?`)
    .get(slug) as Row | undefined;
  return row ? fromRow(row) : null;
}

/** 모든 노래(제목 차례) */
export function listSongs(db: DatabaseSync): Song[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM songs ORDER BY title, slug`)
    .all() as Row[];
  return rows.map(fromRow);
}

/** 넣거나 바꾼다. 처음 넣은 시각은 그대로 둔다 */
export function putSong(
  db: DatabaseSync,
  slug: string,
  input: Omit<SongInput, "lines"> & { lines: SongLine[] },
  now: number,
): Song {
  db.prepare(
    `INSERT INTO songs (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET title = excluded.title, artist = excluded.artist,
       audio_file = excluded.audio_file, lines = excluded.lines,
       lyrics_public = excluded.lyrics_public, updated_at = excluded.updated_at`,
  ).run(
    slug,
    input.title,
    input.artist,
    input.audioFile,
    JSON.stringify(input.lines),
    input.lyricsPublic ? 1 : 0,
    now,
    now,
  );
  const saved = getSong(db, slug);
  if (!saved) throw new Error(`노래 저장 뒤 읽기 실패: ${slug}`);
  return saved;
}

/** 지웠으면 true, 없던 노래면 false */
export function deleteSong(db: DatabaseSync, slug: string): boolean {
  return (
    Number(db.prepare("DELETE FROM songs WHERE slug = ?").run(slug).changes) > 0
  );
}
