import type { Versioned } from "@/lib/sync/state-sync";
import { type KanaData, parseKanaData, serializeKanaData } from "./state";

/** 서버 상태 문서 키 */
export const KANA_SYNC_KEY = "kana";

/** 서버에 보낼 문서. 한 번도 공부하지 않은 빈 상태(updatedAt 0)는 보내지 않는다. */
export function toVersioned(data: KanaData): Versioned<KanaData> | null {
  if (data.updatedAt === 0) return null;
  return {
    value: JSON.parse(serializeKanaData(data)) as KanaData,
    updatedAt: data.updatedAt,
  };
}

/**
 * 서버에서 받은 문서를 이 기기 상태로 쓸지. 지금 것보다 새것이고 모양이 맞을 때만 상태를 돌려준다.
 * 모양이 틀린 문서는 버린다(이 기기 기록을 지키려고).
 */
export function adoptFromServer(
  current: KanaData,
  synced: Versioned<unknown> | null,
): KanaData | null {
  if (!synced || synced.updatedAt <= current.updatedAt) return null;
  try {
    const data = parseKanaData(JSON.stringify(synced.value));
    return { ...data, updatedAt: synced.updatedAt };
  } catch {
    return null;
  }
}
