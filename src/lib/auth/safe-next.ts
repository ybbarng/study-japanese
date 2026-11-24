/** 로그인 뒤 돌아갈 곳. 같은 사이트 안 경로만 받아 다른 사이트로 넘기지 못하게 한다. */
export function safeNextPath(next: string): string {
  // 브라우저는 주소의 탭·줄바꿈을 지우고 읽어 "/\t/evil"이 "//evil"(다른 사이트)이 된다. 제어 문자는 받지 않는다
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 제어 문자를 찾으려고 일부러 쓴다
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return "/";
  if (next.startsWith("/login") || next.startsWith("/api/")) return "/";
  return next;
}
