import { cookies } from "next/headers";
import { readAuthConfig } from "./config";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** 서버 컴포넌트·라우트에서: 이 요청이 관리자(암호로 로그인한 사람)인지 */
export async function isAdminRequest(): Promise<boolean> {
  return isAdminToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function isAdminToken(
  token: string | undefined,
): Promise<boolean> {
  const config = readAuthConfig();
  if (!config) return false;
  return verifySessionToken(token, config.secret, Date.now());
}
