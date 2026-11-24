"use client";

import { useEffect, useState } from "react";
import { offlineSupported } from "@/lib/offline/browser";
import {
  effectivePack,
  type PackInspection as Inspection,
  inspectPack,
} from "@/lib/offline/inspect";
import { cacheOfKind } from "@/lib/offline/manager";
import { type OfflinePack, packFiles } from "@/lib/offline/pack";
import { type Job, useOffline } from "@/lib/offline/store";

export type PackView =
  | { kind: "unsupported" }
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "partial"; seen: Inspection }
  | { kind: "done"; seen: Inspection }
  | { kind: "job"; job: Job };

/**
 * 받는 일이 있으면 그 상태, 없으면 캐시에 실제로 남은 파일(강 화면·오디오·자막·그림)로 상태를 정한다.
 * 서버가 자막·그림까지 채워 저장해 둔 묶음이 있으면 그것으로 센다(inspect.ts).
 */
export function usePackStatus(pack: OfflinePack): PackView {
  const job = useOffline((s) => s.jobs[pack.id]);
  const version = useOffline((s) => s.version);
  const saved = useOffline((s) => s.packs[pack.id]?.pack);
  const target = effectivePack(pack, saved);
  const [seen, setSeen] = useState<Inspection | null>(null);
  const [supported, setSupported] = useState(true);
  const key = `${target.full ? 1 : 0}\n${packFiles(target)
    .flatMap((g) => g.urls)
    .join("\n")}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 주소 목록(key)과 캐시가 바뀔 때(version)만 다시 센다
  useEffect(() => {
    if (!offlineSupported()) {
      setSupported(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await inspectPack(target, cacheOfKind);
      if (!cancelled) setSeen(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  if (!supported) return { kind: "unsupported" };
  if (job) return { kind: "job", job };
  if (!seen) return { kind: "checking" };
  if (seen.audioPresent === 0) return { kind: "none" };
  if (seen.present < seen.total) return { kind: "partial", seen };
  return { kind: "done", seen };
}
