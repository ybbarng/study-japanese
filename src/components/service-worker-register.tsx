"use client";

import { useEffect } from "react";
import { loadPictureTable } from "@/components/pictures/use-picture-table";
import { loadExpandedPlayer } from "@/components/player/load-expanded";

/** 첫 화면을 그린 뒤 이만큼 지나 한가할 때 나중에 쓸 코드 덩어리를 미리 받는다 */
const WARM_DELAY_MS = 3000;

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
    // 펼친 재생 화면·그림 표는 쓸 때 불러오는 덩어리다. 통신이 끊긴 뒤에도 나오게, 한가할 때 미리 받아
    // service worker의 빌드 파일 캐시에 담아 둔다(첫 화면 표시를 늦추지 않게 기다렸다가).
    const timer = setTimeout(() => {
      const idle =
        window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
      idle(() => {
        void loadExpandedPlayer().catch(() => {});
        void loadPictureTable().catch(() => {});
      });
    }, WARM_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
