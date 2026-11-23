import { type NextRequest, NextResponse } from "next/server";
import { readAuthConfig } from "@/lib/auth/config";
import { isPublicPath } from "@/lib/auth/public-paths";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const config = readAuthConfig();
  const ok =
    config !== null &&
    (await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      config.secret,
      Date.now(),
    ));
  if (ok) return NextResponse.next();

  // 화면이 아닌 요청(API·오디오·service worker)은 돌려보내지 않고 401로 끝낸다.
  const wantsPage =
    request.method === "GET" &&
    (request.headers.get("accept") ?? "").includes("text/html");
  if (!wantsPage)
    return new NextResponse("로그인이 필요합니다", { status: 401 });

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
