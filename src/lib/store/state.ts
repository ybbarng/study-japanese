import type { DatabaseSync } from "node:sqlite";

// 키마다 JSON 문서 하나(가나 간격 반복 상태 등). 기기가 여럿이라 updatedAt이 더 늦은 쪽이 이긴다.

export interface StateDoc {
  key: string;
  value: unknown;
  updatedAt: number;
}

export function getState(db: DatabaseSync, key: string): StateDoc | null {
  const row = db
    .prepare("SELECT key, value, updated_at FROM state WHERE key = ?")
    .get(key) as { key: string; value: string; updated_at: number } | undefined;
  if (!row) return null;
  return {
    key: row.key,
    value: JSON.parse(row.value),
    updatedAt: row.updated_at,
  };
}

/** 들어온 문서가 저장된 것보다 늦을 때만 바꾼다. 결과로 지금 저장된 문서를 돌려준다. */
export function putState(
  db: DatabaseSync,
  doc: StateDoc,
): { applied: boolean; current: StateDoc } {
  const result = db
    .prepare(
      `INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
       WHERE excluded.updated_at > state.updated_at`,
    )
    .run(doc.key, JSON.stringify(doc.value), doc.updatedAt);
  const current = getState(db, doc.key);
  if (!current) throw new Error(`상태 저장 뒤 읽기 실패: ${doc.key}`);
  return { applied: result.changes > 0, current };
}

export function listStates(db: DatabaseSync): StateDoc[] {
  const rows = db
    .prepare("SELECT key, value, updated_at FROM state ORDER BY key")
    .all() as {
    key: string;
    value: string;
    updated_at: number;
  }[];
  return rows.map((r) => ({
    key: r.key,
    value: JSON.parse(r.value),
    updatedAt: r.updated_at,
  }));
}
