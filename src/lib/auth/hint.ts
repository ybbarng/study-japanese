// 화면용 "관리자로 로그인함" 표시(비밀 아님). 실제 권한은 httpOnly 로그인 쿠키(sj_session)로만 판단한다.
export const ADMIN_HINT_COOKIE = "sj_admin";

export function hasAdminHint(cookie: string): boolean {
  return cookie
    .split(";")
    .some((part) => part.trim() === `${ADMIN_HINT_COOKIE}=1`);
}
