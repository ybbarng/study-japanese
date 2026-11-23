// 다음 할 강 자동 받기: 와이파이일 때 이어서 할 강을 미리 받아 둔다.

export const AUTO_COUNT = 2;

/** Network Information API 가운데 쓰는 부분(안드로이드 Chrome에만 `type`이 있다) */
export interface ConnectionLike {
  type?: string;
  saveData?: boolean;
}

export type AutoVerdict =
  | "go" // 지금 받는다
  | "off" // 설정을 꺼 둠
  | "notWifi" // 모바일 데이터
  | "unknown"; // 브라우저가 연결 종류를 알려 주지 않음

export function autoVerdict(
  enabled: boolean,
  connection: ConnectionLike | undefined,
): AutoVerdict {
  if (!enabled) return "off";
  if (!connection || connection.type === undefined) return "unknown";
  if (connection.saveData) return "notWifi";
  return connection.type === "wifi" || connection.type === "ethernet"
    ? "go"
    : "notWifi";
}

/**
 * 이어서 할 강: `from`부터 차례대로, 아직 끝내지 않은 강을 `count`개.
 * `from`이 없으면 처음부터 찾는다.
 */
export function upcomingLessons(
  nos: readonly number[],
  isDone: (no: number) => boolean,
  from: number | null,
  count: number = AUTO_COUNT,
): number[] {
  const sorted = [...nos].sort((a, b) => a - b);
  const start = from === null ? sorted[0] : from;
  return sorted.filter((no) => no >= start && !isDone(no)).slice(0, count);
}

/** 받을 묶음: 이미 다 받아 둔 묶음과 받는 중인 묶음은 뺀다 */
export function packsToFetch<T extends { id: string }>(
  candidates: readonly T[],
  skip: ReadonlySet<string>,
): T[] {
  return candidates.filter((p) => !skip.has(p.id));
}
