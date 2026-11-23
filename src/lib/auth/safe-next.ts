/** 로그인 뒤 돌아갈 곳. 같은 사이트 안 경로만 받아 다른 사이트로 넘기지 못하게 한다. */
export function safeNextPath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return "/";
  if (next.startsWith("/login") || next.startsWith("/api/")) return "/";
  return next;
}
