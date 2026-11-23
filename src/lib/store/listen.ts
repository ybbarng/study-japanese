import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

// 들은 기록: 한 번 재생할 때마다 한 줄. 폰이 오프라인일 때 모아 두었다가 다시 보내도
// client_id로 한 번만 들어간다. 버즈챌린지 인증 데이터다.

export const listenEventSchema = z.object({
  clientId: z.string().min(8).max(64),
  book: z.enum(["ilmuta", "ilmunta", "kana"]),
  item: z.string().min(1).max(64), // 예: "L00", "01-1", "L01-01"
  kind: z.enum(["lecture", "example", "extra"]),
  startedAt: z.number().int().positive(),
  listenedSec: z
    .number()
    .min(0)
    .max(60 * 60 * 3),
  completed: z.boolean(),
});
export type ListenEvent = z.infer<typeof listenEventSchema>;

export function addListenEvents(
  db: DatabaseSync,
  events: ListenEvent[],
): number {
  const insert = db.prepare(
    `INSERT INTO listen_events (client_id, book, item, kind, started_at, listened_sec, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO NOTHING`,
  );
  let added = 0;
  db.exec("BEGIN");
  try {
    for (const e of events) {
      added += Number(
        insert.run(
          e.clientId,
          e.book,
          e.item,
          e.kind,
          e.startedAt,
          e.listenedSec,
          e.completed ? 1 : 0,
        ).changes,
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return added;
}

export interface ItemSummary {
  item: string;
  kind: string;
  plays: number;
  completedPlays: number;
  listenedSec: number;
  lastAt: number;
}

export function summarizeListening(
  db: DatabaseSync,
  book: string,
): ItemSummary[] {
  return (
    db
      .prepare(
        `SELECT item, kind, COUNT(*) AS plays, SUM(completed) AS completedPlays,
                SUM(listened_sec) AS listenedSec, MAX(started_at) AS lastAt
         FROM listen_events WHERE book = ? GROUP BY item, kind ORDER BY item`,
      )
      .all(book) as unknown as ItemSummary[]
  ).map((r) => ({
    ...r,
    plays: Number(r.plays),
    completedPlays: Number(r.completedPlays),
  }));
}

export function listAllListenEvents(db: DatabaseSync): ListenEvent[] {
  const rows = db
    .prepare(
      "SELECT client_id, book, item, kind, started_at, listened_sec, completed FROM listen_events ORDER BY started_at, id",
    )
    .all() as {
    client_id: string;
    book: ListenEvent["book"];
    item: string;
    kind: ListenEvent["kind"];
    started_at: number;
    listened_sec: number;
    completed: number;
  }[];
  return rows.map((r) => ({
    clientId: r.client_id,
    book: r.book,
    item: r.item,
    kind: r.kind,
    startedAt: r.started_at,
    listenedSec: r.listened_sec,
    completed: r.completed === 1,
  }));
}
