// 누가 무엇을 할 수 있나(docs/standing-rules.md "자료 출처와 공개 범위").
// 사이트는 누구나 쓴다. 암호를 아는 사람(관리자)만 학습 기록을 저장·수정·내보내고 설정을 바꾼다.
// 남이 만든 자료(출처별)는 설정에서 출처마다 닫을 수 있어, 그 자료를 내주는 경로가 직접 판단한다.

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ADMIN_PAGES = ["/settings"];
const ADMIN_READ_APIS = ["/api/export"];
const OPEN_WRITE_APIS = ["/api/login", "/api/logout"];

function matches(pathname: string, bases: readonly string[]): boolean {
  return bases.some((b) => pathname === b || pathname.startsWith(`${b}/`));
}

/** 이 요청에 관리자 로그인이 필요한지 */
export function requiresAdmin(method: string, pathname: string): boolean {
  if (matches(pathname, ADMIN_PAGES)) return true;
  if (!pathname.startsWith("/api/")) return false;
  if (matches(pathname, OPEN_WRITE_APIS)) return false;
  if (!READ_METHODS.has(method.toUpperCase())) return true;
  return matches(pathname, ADMIN_READ_APIS);
}
