"use client";

import { autoVerdict, packsToFetch } from "./auto";
import { getConnection, offlineSupported, openCache } from "./browser";
import { AUDIO_CACHE } from "./cache-names";
import { inspectFiles } from "./download";
import { isBusy, queueDownload } from "./manager";
import type { OfflinePack } from "./pack";
import { useOffline } from "./store";

// 자동 받기: 강 화면·받아 둔 강 화면이 열릴 때와 연결이 바뀔 때 부른다.
// 같은 탭에서 10분에 한 번만 서버에 묻는다.

const MIN_GAP_MS = 10 * 60 * 1000;
let lastAskedAt = 0;

export async function maybeAutoDownload(now = Date.now()): Promise<void> {
  if (!offlineSupported()) return;
  if (autoVerdict(useOffline.getState().autoNext, getConnection()) !== "go")
    return;
  if (now - lastAskedAt < MIN_GAP_MS) return;
  lastAskedAt = now;

  let packs: OfflinePack[];
  try {
    const res = await fetch("/offline/upcoming");
    if (!res.ok) return;
    packs = (await res.json()).packs;
  } catch {
    return;
  }
  const cache = await openCache(AUDIO_CACHE);
  const skip = new Set<string>();
  for (const p of packs) {
    if (isBusy(p.id)) {
      skip.add(p.id);
      continue;
    }
    const seen = await inspectFiles(p.audioUrls, cache);
    if (seen.present === seen.total) skip.add(p.id);
  }
  for (const p of packsToFetch(packs, skip)) queueDownload(p);
}
