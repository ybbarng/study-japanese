"use client";

import { useEffect, useState } from "react";
import { offlineSupported, openCache } from "@/lib/offline/browser";
import { AUDIO_CACHE } from "@/lib/offline/cache-names";
import { type Inspection, inspectFiles } from "@/lib/offline/download";
import type { OfflinePack } from "@/lib/offline/pack";
import { type Job, useOffline } from "@/lib/offline/store";

export type PackView =
  | { kind: "unsupported" }
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "partial"; seen: Inspection }
  | { kind: "done"; seen: Inspection }
  | { kind: "job"; job: Job };

/** 받는 일이 있으면 그 상태, 없으면 캐시에 실제로 남은 파일로 상태를 정한다 */
export function usePackStatus(pack: OfflinePack): PackView {
  const job = useOffline((s) => s.jobs[pack.id]);
  const version = useOffline((s) => s.version);
  const [seen, setSeen] = useState<Inspection | null>(null);
  const [supported, setSupported] = useState(true);
  const key = pack.audioUrls.join("\n");

  // biome-ignore lint/correctness/useExhaustiveDependencies: 주소 목록(key)과 캐시가 바뀔 때(version)만 다시 센다
  useEffect(() => {
    if (!offlineSupported()) {
      setSupported(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await inspectFiles(
        pack.audioUrls,
        await openCache(AUDIO_CACHE),
      );
      if (!cancelled) setSeen(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  if (!supported) return { kind: "unsupported" };
  if (job) return { kind: "job", job };
  if (!seen) return { kind: "checking" };
  if (seen.present === 0) return { kind: "none" };
  if (seen.present < seen.total) return { kind: "partial", seen };
  return { kind: "done", seen };
}
