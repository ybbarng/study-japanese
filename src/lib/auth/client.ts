"use client";

import { useEffect, useState } from "react";
import { hasAdminHint } from "./hint";

// 화면이 "관리자로 로그인했는지" 아는 방법. 표시 쿠키(src/lib/auth/hint.ts)는 기록을 서버로
// 보낼지·로그인 단추를 보일지에만 쓰고, 권한은 서버가 httpOnly 쿠키로 따로 확인한다.

/** 지금 브라우저가 관리자 표시를 가졌는지(서버 렌더 중에는 false) */
export function isAdminClient(): boolean {
  return typeof document !== "undefined" && hasAdminHint(document.cookie);
}

export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => setAdmin(isAdminClient()), []);
  return admin;
}
