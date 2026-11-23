import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// 학습 기록 DB. 서버에서는 DATA_DIR(컨테이너 볼륨)에 study.db 하나.
// 스키마 변경은 지금처럼 IF NOT EXISTS·ADD COLUMN 같은 무해한 SQL만 더한다(배포 때마다 다시 돌아도 안전하게).
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS listen_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL UNIQUE,
    book TEXT NOT NULL,
    item TEXT NOT NULL,
    kind TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    listened_sec REAL NOT NULL,
    completed INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS listen_events_book_item ON listen_events(book, item)",
  // 강마다 쓴 문장: sentences는 [{ text, correction?, note? }] JSON
  `CREATE TABLE IF NOT EXISTS writings (
    book TEXT NOT NULL,
    lesson INTEGER NOT NULL,
    sentences TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (book, lesson)
  )`,
  // 교재 오디오 전송량(한국 날짜·로그인 세션별). 세션은 쿠키 값이 아니라 그 해시
  `CREATE TABLE IF NOT EXISTS media_usage (
    day TEXT NOT NULL,
    session TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    PRIMARY KEY (day, session)
  )`,
  // 노래 학습(src/lib/store/songs.ts). lines는 [{ ja, start?, end?, note? }] JSON.
  // 예전 줄에 남은 tokens는 읽을 때 버린다(분석은 content/songs/<slug>.json)
  `CREATE TABLE IF NOT EXISTS songs (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    audio_file TEXT NOT NULL,
    lines TEXT NOT NULL,
    lyrics_public INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

export function openDb(file: string): DatabaseSync {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 3000");
  for (const sql of MIGRATIONS) db.exec(sql);
  return db;
}

let shared: DatabaseSync | null = null;

/** 앱 전체가 함께 쓰는 연결. */
export function getDb(): DatabaseSync {
  if (!shared) {
    const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
    shared = openDb(path.join(dir, "study.db"));
  }
  return shared;
}
