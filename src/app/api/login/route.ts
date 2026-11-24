import { NextResponse } from "next/server";
import { readAuthConfig } from "@/lib/auth/config";
import { ADMIN_HINT_COOKIE } from "@/lib/auth/hint";
import { loginLockout } from "@/lib/auth/lockout";
import { safeNextPath } from "@/lib/auth/safe-next";
import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_TTL_MS,
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

  // 암호 비교(await)를 먼저 끝낸 뒤, 잠금 확인과 실패 기록은 await 없이 이어서 한다.
  // 사이에 await가 끼면 한꺼번에 보낸 요청이 모두 잠금 확인을 지나 상한보다 많이 시도할 수 있다.
  const matched = await passwordMatches(password, config.password);

  // 실패가 몰려 잠겨 있으면 맞는 암호여도 받지 않는다(잠긴 동안 대입이 통하지 않게).
  // 이미 로그인된 기기는 쿠키로 들어오므로 영향이 없다.
  const now = Date.now();
  const until = loginLockout.lockedUntil(now);
  if (until !== null) {
    return seeOther(
      `/login?locked=${Math.ceil((until - now) / 60_000)}&next=${encodeURIComponent(next)}`,
    );
  }

  if (!matched) {
    loginLockout.fail(now);
    // 실패마다 늦춰 대입 속도도 떨어뜨린다. 주된 방어는 긴 암호와 전체 잠금이다.
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
    return seeOther(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const response = seeOther(next);
  const cookieOptions = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(config.secret, Date.now()),
    { ...cookieOptions, httpOnly: true },
  );
  // 화면용 표시(비밀 아님): 기록을 서버로 보낼지·설정 단추를 보일지에만 쓴다
  response.cookies.set(ADMIN_HINT_COOKIE, "1", cookieOptions);
  return response;
}
