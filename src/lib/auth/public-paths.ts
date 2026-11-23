// 로그인 없이 열리는 경로. 그 밖은 모두 로그인 뒤다(docs/standing-rules.md "저작권").
// manifest·아이콘은 브라우저가 쿠키 없이 받아 가므로 열어 둔다.
const PUBLIC_EXACT = new Set([
  "/login",
  "/api/login",
  "/manifest.webmanifest",
  "/favicon.ico",
]);
const PUBLIC_PREFIX = ["/icons/", "/_next/static/", "/_next/image"];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}
