// 다른 사이트에서 보낸 쓰기 요청 막기(CSRF).
// 로그인 쿠키는 SameSite=Lax라 다른 사이트의 POST에는 실리지 않지만, 같은 사이트(*.byb.kr의 다른 하위 도메인)의
// 글에서 보낸 POST에는 실린다. 브라우저가 붙이는 Sec-Fetch-Site·Origin을 보고 같은 출처가 아니면 거절한다.
// 둘 다 없는 요청(curl·스크립트·옛 브라우저)은 통과시킨다: 그런 요청은 남의 브라우저 쿠키를 싣지 못한다.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface RequestOrigin {
  method: string;
  /** Sec-Fetch-Site 머리 */
  fetchSite: string | null;
  /** Origin 머리 */
  origin: string | null;
  /** 브라우저가 연 주소의 호스트(프록시 뒤면 X-Forwarded-Host, 아니면 Host) */
  host: string | null;
}

/** 이 요청이 다른 출처에서 보낸 쓰기 요청이라 거절해야 하는지 */
export function isCrossOriginWrite(req: RequestOrigin): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false;
  if (req.fetchSite !== null)
    return req.fetchSite !== "same-origin" && req.fetchSite !== "none";
  if (req.origin === null) return false;
  if (req.origin === "null" || req.host === null) return true;
  try {
    return new URL(req.origin).host !== req.host;
  } catch {
    return true;
  }
}

/** 요청 머리에서 판단에 쓸 값을 꺼낸다 */
export function requestOrigin(method: string, headers: Headers): RequestOrigin {
  const forwarded = headers.get("x-forwarded-host");
  return {
    method,
    fetchSite: headers.get("sec-fetch-site"),
    origin: headers.get("origin"),
    host: forwarded ? forwarded.split(",")[0].trim() : headers.get("host"),
  };
}
