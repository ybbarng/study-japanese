// 모든 응답에 붙이는 보안 머리(next.config.ts의 headers()가 쓴다). docs/security.md "보안 머리".
//
// CSP의 script-src에는 'unsafe-inline'을 둔다. Next가 화면마다 RSC 자료를 인라인 스크립트로 싣는데,
// nonce를 쓰려면 모든 화면을 요청마다 그려야 해서다. 대신 바깥 스크립트·바깥 연결·다른 사이트의 틀(iframe)
// 넣기·<base> 바꾸기·플러그인을 막는다. 화면은 사용자 글을 React로만 그려(dangerouslySetInnerHTML 없음) 스크립트를
// 넣을 길이 좁다.

export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

/** 화면(HTML)에 붙일 CSP. dev는 Next의 빠른 새로고침이 eval·웹소켓을 써서 조금 넓힌다 */
export function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    // 녹음해 둔 내 목소리(blob:)와 무음 소리를 튼다
    "media-src": ["'self'", "blob:", "data:"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** next.config.ts headers()에 넘길 규칙 */
export function securityHeaderRules(dev: boolean): HeaderRule[] {
  const common = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    // 따라 말하기 녹음만 마이크를 쓴다
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(self), payment=()",
    },
    ...(dev
      ? []
      : [{ key: "Strict-Transport-Security", value: "max-age=15552000" }]),
  ];
  return [
    { source: "/:path*", headers: common },
    // 교재 PDF는 브라우저 PDF 보기 창이 그리므로 CSP를 붙이지 않는다(object-src 'none'이 보기 창을 막을 수 있다)
    {
      source: "/((?!media/).*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
      ],
    },
  ];
}
