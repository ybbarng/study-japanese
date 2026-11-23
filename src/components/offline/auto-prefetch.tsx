"use client";

import { useEffect } from "react";
import { maybeAutoDownload } from "@/lib/offline/auto-run";
import { getConnection } from "@/lib/offline/browser";
import { useOffline } from "@/lib/offline/store";

/** 화면에 보이지 않는다. 열릴 때·연결이 바뀔 때·설정을 켤 때 다음 할 강 자동 받기를 시도한다 */
export function AutoPrefetch() {
  const autoNext = useOffline((s) => s.autoNext);
  useEffect(() => {
    if (!autoNext) return;
    void maybeAutoDownload();
    const connection = getConnection();
    const onChange = () => void maybeAutoDownload();
    connection?.addEventListener("change", onChange);
    return () => connection?.removeEventListener("change", onChange);
  }, [autoNext]);
  return null;
}
