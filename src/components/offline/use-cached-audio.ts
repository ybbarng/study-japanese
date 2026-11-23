"use client";

import { useEffect, useState } from "react";
import { AUDIO_CACHE } from "@/lib/offline/cache-names";

/** 이 오디오를 폰에 받아 두었는지(통신이 끊겨도 들리는지). 알 수 없으면 false */
export function useCachedAudio(src: string | undefined): boolean {
  const [cached, setCached] = useState(false);
  useEffect(() => {
    setCached(false);
    if (!src || typeof caches === "undefined") return;
    let cancelled = false;
    caches
      .open(AUDIO_CACHE)
      .then((cache) => cache.match(src))
      .then((hit) => {
        if (!cancelled) setCached(Boolean(hit));
      })
      .catch(() => {
        // 캐시를 열 수 없는 환경(비공개 창 등)
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return cached;
}
