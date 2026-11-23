import { type NextRequest, NextResponse } from "next/server";
import { requiresAdmin } from "@/lib/auth/access";
import { readAuthConfig } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// 사이트는 누구나 쓴다. 기록 저장·수정·내보내기와 설정만 관리자(암호로 로그인한 사람).
// 남의 자료(출처별 공개 여부)는 그 자료를 내주는 경로가 직접 판단한다.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!requiresAdmin(request.method, pathname)) return NextResponse.next();

  const config = readAuthConfig();
  const ok =
    config !== null &&
    (await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      config.secret,
      Date.now(),
    ));
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return new NextResponse("기록 저장은 로그인한 사람만 할 수 있습니다", {
      status: 401,
    });

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
