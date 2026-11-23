import { z } from "zod";
import type { Versioned } from "@/lib/sync/state-sync";

// 노래마다 "익힌 줄". 관리자는 서버 상태 문서(songs-study)와 맞추고, 방문자는 자기 브라우저에만 남는다.
// 줄은 차례가 아니라 글로 센다: 후렴처럼 같은 줄이 여러 번 나오면 한 번 익히면 모두 익힌 것이고,
// 가사를 고쳐 줄이 밀려도 익힌 표시가 따라간다. 다만 글 대신 글의 짧은 지문(lineKey)을 둔다.
// 학습 기록은 `pnpm progress:pull`로 공개 저장소에 들어가는데, 가사를 그곳에 남기지 않으려고.

export const SONGS_STUDY_SYNC_KEY = "songs-study";

export const songsStudySchema = z.object({
  version: z.literal(1),
  updatedAt: z.number().int().nonnegative(),
  /** 노래 slug → 익힌 줄의 지문 */
  known: z.record(z.string(), z.array(z.string().max(16)).max(300)),
});
export type SongsStudy = z.infer<typeof songsStudySchema>;

/** 줄 글의 지문(FNV-1a 32비트, 16진수 8자리). 같은 글이면 같은 지문 */
export function lineKey(ja: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < ja.length; i++) {
    h ^= ja.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function emptySongsStudy(): SongsStudy {
  return { version: 1, updatedAt: 0, known: {} };
}

export function isKnown(data: SongsStudy, slug: string, ja: string): boolean {
  return data.known[slug]?.includes(lineKey(ja)) ?? false;
}

/** 한 줄의 익힘 표시를 뒤집는다 */
export function toggleKnown(
  data: SongsStudy,
  slug: string,
  ja: string,
  now: number,
): SongsStudy {
  const key = lineKey(ja);
  const list = data.known[slug] ?? [];
  const next = list.includes(key)
    ? list.filter((x) => x !== key)
    : [...list, key];
  const known = { ...data.known };
  if (next.length === 0) delete known[slug];
  else known[slug] = next;
  return { ...data, known, updatedAt: now };
}

/** 지금 가사(줄 지문들)에서 익힌 줄 수(같은 글이 여러 번 나오면 나온 만큼 센다) */
export function knownCount(
  data: SongsStudy,
  slug: string,
  lineKeys: readonly string[],
): number {
  const set = new Set(data.known[slug] ?? []);
  return lineKeys.filter((k) => set.has(k)).length;
}

export function toVersioned(data: SongsStudy): Versioned<SongsStudy> | null {
  if (data.updatedAt === 0) return null;
  return { value: data, updatedAt: data.updatedAt };
}

/** 서버 문서가 더 새것이고 모양이 맞을 때만 그 상태를 돌려준다 */
export function adoptFromServer(
  current: SongsStudy,
  synced: Versioned<unknown> | null,
): SongsStudy | null {
  if (!synced || synced.updatedAt <= current.updatedAt) return null;
  const parsed = songsStudySchema.safeParse(synced.value);
  if (!parsed.success) return null;
  return { ...parsed.data, updatedAt: synced.updatedAt };
}
