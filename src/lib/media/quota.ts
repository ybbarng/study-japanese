import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

// 교재 오디오 전송량 상한. 서버 요금이 월 전송량으로 매겨져서(1,200GB 넘으면 GB당 과금),
// 로그인이 뚫리거나 무언가가 교재(약 2GB)를 되풀이해 받는 일을 하루 단위로 막는다.
// 두 책 오디오를 다 받아도 약 2GB라 정상 사용은 세션 상한에 닿지 않는다.
// 같은 파일을 되풀이해 받는 것도 실제로 내보낸 바이트로 세므로 함께 걸린다.

export interface MediaLimits {
  /** 로그인 세션 하나가 하루에 받을 수 있는 양 */
  perSessionBytes: number;
  /** 모든 세션을 합친 하루 상한(쿠키가 여러 개 생겨도 막히게) */
  globalBytes: number;
}

const GB = 1024 ** 3;
export const DEFAULT_LIMITS: MediaLimits = {
  perSessionBytes: 3 * GB,
  globalBytes: 6 * GB,
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 날짜(YYYY-MM-DD). 서버 시간대와 상관없이 */
export function kstDay(now: number): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 다음 한국 자정까지 남은 초 */
export function secondsUntilKstMidnight(now: number): number {
  const kst = now + KST_OFFSET_MS;
  const nextMidnight = Math.floor(kst / 86_400_000 + 1) * 86_400_000;
  return Math.ceil((nextMidnight - kst) / 1000);
}

/** 쿠키 값을 저장하지 않으려고 해시로 세션을 구분한다 */
export function sessionKey(token: string | undefined): string {
  if (!token) return "anonymous";
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

export type QuotaVerdict = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * 이번에 내보낼 바이트를 더해도 상한 안이면 기록하고 허락한다.
 * 넘으면 기록하지 않고 거절한다(다음 한국 자정에 풀린다).
 */
export function takeMediaQuota(
  db: DatabaseSync,
  req: { session: string; bytes: number; now: number },
  limits: MediaLimits = DEFAULT_LIMITS,
): QuotaVerdict {
  const day = kstDay(req.now);
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN session = ? THEN bytes END), 0) AS mine,
         COALESCE(SUM(bytes), 0) AS total
       FROM media_usage WHERE day = ?`,
    )
    .get(req.session, day) as { mine: number; total: number };

  if (
    Number(row.mine) + req.bytes > limits.perSessionBytes ||
    Number(row.total) + req.bytes > limits.globalBytes
  ) {
    return { ok: false, retryAfterSec: secondsUntilKstMidnight(req.now) };
  }
  db.prepare(
    `INSERT INTO media_usage (day, session, bytes) VALUES (?, ?, ?)
     ON CONFLICT(day, session) DO UPDATE SET bytes = bytes + excluded.bytes`,
  ).run(day, req.session, req.bytes);
  return { ok: true };
}
