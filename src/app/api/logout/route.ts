import { NextResponse } from "next/server";
import { ADMIN_HINT_COOKIE } from "@/lib/auth/hint";
import { SESSION_COOKIE } from "@/lib/auth/session";

// 로그인 쿠키와 화면용 표시를 지우고 첫 화면으로.
export async function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ADMIN_HINT_COOKIE);
  return response;
}
