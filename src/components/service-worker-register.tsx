"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (
      process.env.NODE_ENV !== "production" &&
      !location.search.includes("sw=1")
    )
      return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // 로그인 전에는 sw.js가 401이라 실패한다. 로그인 뒤 다음 화면에서 다시 시도된다.
    });
  }, []);
  return null;
}
