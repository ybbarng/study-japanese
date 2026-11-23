"use client";

import type { KanaData } from "@/lib/kana/state";
import { useKanaHydrated, useKanaStore } from "@/lib/kana/store";

/**
 * 첫 화면이 쓸 가나 진도. 기기에 저장된 진도를 읽기 전에는 서버 것으로 그리고(깜빡이지 않게),
 * 읽은 뒤에는 둘 가운데 더 최근 것을 쓴다(새 기기에서는 서버 것이 더 최근이다).
 */
export function useHomeKana(serverKana: KanaData): {
  kana: KanaData;
  ready: boolean;
} {
  const ready = useKanaHydrated();
  const local = useKanaStore();
  const kana =
    ready && local.updatedAt >= serverKana.updatedAt ? local : serverKana;
  return { kana, ready };
}
