"use client";

import { useEffect } from "react";
import { loadPictureTable } from "@/components/pictures/use-picture-table";
import { loadExpandedPlayer } from "@/components/player/load-expanded";
import { registerWarmup } from "@/lib/offline/manager";

/** 첫 화면을 그린 뒤 이만큼 지나 한가할 때 나중에 쓸 코드 덩어리를 미리 받는다 */
const WARM_DELAY_MS = 3000;

/** 펼친 재생 화면·그림 표는 쓸 때 불러오는 덩어리다. 불러 두면 service worker가 빌드 파일 캐시에 담는다 */
const warmChunks = () =>
  Promise.all([loadExpandedPlayer(), loadPictureTable()]);

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
    // 강을 받을 때 함께 불러 두고(통신이 끊긴 뒤에도 펼쳐지게), 받지 않아도 첫 화면 뒤 한가할 때 불러 둔다
    registerWarmup(warmChunks);
    const timer = setTimeout(() => {
      const idle =
        window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
      idle(() => void warmChunks().catch(() => {}));
    }, WARM_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
