import { NextResponse } from "next/server";
import { readAuthConfig } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/safe-next";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  timingSafeEqual,
} from "@/lib/auth/session";

const FAILURE_DELAY_MS = 800;

/** 상대 주소로 넘긴다. 컨테이너 안 주소(0.0.0.0:3000)가 바깥 브라우저로 새지 않게. */
function seeOther(location: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location },
  });
}

export async function POST(request: Request) {
  const config = readAuthConfig();
  if (!config)
    return new NextResponse("서버에 로그인 설정이 없습니다", { status: 503 });

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/"));

  if (!timingSafeEqual(password, config.password)) {
    // 사용자 한 명인 사이트라 IP 제한 대신 실패마다 늦춰 대입 속도만 떨어뜨린다. 주된 방어는 긴 암호다.
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
    return seeOther(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const response = seeOther(next);
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(config.secret, Date.now()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    },
  );
  return response;
}
