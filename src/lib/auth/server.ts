import { cookies } from "next/headers";
import { readAuthConfig } from "./config";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** 서버 컴포넌트·라우트에서: 이 요청이 관리자(암호로 로그인한 사람)인지 */
export async function isAdminRequest(): Promise<boolean> {
  return isAdminToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * 관리자만 쓰는 라우트의 첫 줄. 관리자가 아니면 401 응답을, 맞으면 null을 돌려준다.
 * src/proxy.ts가 먼저 막지만, 주소 모양을 바꿔 proxy 판단을 비켜 가는 길이 생겨도 라우트가 다시 막게 한다.
 */
export async function rejectUnlessAdmin(): Promise<Response | null> {
  if (await isAdminRequest()) return null;
  return Response.json(
    { error: "로그인한 사람만 할 수 있습니다" },
    { status: 401 },
  );
}

export async function isAdminToken(
  token: string | undefined,
): Promise<boolean> {
  const config = readAuthConfig();
  if (!config) return false;
  return verifySessionToken(token, config.secret, Date.now());
}
