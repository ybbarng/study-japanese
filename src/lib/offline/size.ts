// 바이트 수를 사람이 읽는 크기로. 화면에는 MB 단위로 짧게 보인다.

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** 0.4MB · 8.1MB · 23MB · 1.2GB */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0MB";
  if (bytes >= GB) return `${trim(bytes / GB)}GB`;
  const mb = bytes / MB;
  if (mb < 10) return `${Math.max(0.1, Math.round(mb * 10) / 10)}MB`;
  return `${Math.round(mb)}MB`;
}

function trim(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export function sumBytes(list: readonly number[]): number {
  return list.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0);
}

/** 응답 크기: 넣을 때 적어 둔 Content-Length를 먼저 보고, 없으면 null */
export function declaredSize(headers: Headers): number | null {
  const raw = headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}
