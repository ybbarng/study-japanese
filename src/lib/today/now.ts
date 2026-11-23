// 날짜에 따라 달라지는 첫 화면을 미리 보려고 `?now=2027-01-01T08:00+09:00`으로 시각을 넣는다.
// 개발 서버와 E2E(ALLOW_NOW_PARAM=1)에서만 받고, 운영에서는 언제나 실제 시각을 쓴다.

export function nowParamAllowed(env: {
  NODE_ENV?: string;
  ALLOW_NOW_PARAM?: string;
}): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_NOW_PARAM === "1";
}

/** 받을 수 있고 읽을 수 있는 시각이면 그 시각, 아니면 실제 시각 */
export function resolveNow(
  param: string | string[] | undefined,
  realNowMs: number,
  allowed: boolean,
): number {
  if (!allowed || typeof param !== "string") return realNowMs;
  // 주소창에 친 `+09:00`의 +는 쿼리에서 빈칸으로 풀린다
  const ms = Date.parse(param.replace(/ (\d{2}:?\d{2})$/, "+$1"));
  return Number.isFinite(ms) ? ms : realNowMs;
}
