"use client";

import { useEffect, useState } from "react";
import { useKanaHydrated, useKanaStore } from "@/lib/kana/store";
import type { NavProgress } from "@/lib/shell/nav";
import { kanaProgress } from "@/lib/today/progress";

/**
 * 탐색에 붙일 진도. 책 진도는 화면을 옮길 때마다 서버에서 다시 받고(강의를 듣고 돌아오면 늘어 있게),
 * 가나는 기기에 저장된 진도를 센다.
 */
export function useNavProgress(pathname: string): NavProgress {
  const [books, setBooks] = useState<NavProgress>({});
  const ready = useKanaHydrated();
  const cards = useKanaStore((s) => s.cards);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 화면을 옮길 때마다 다시 받으려고 주소를 둔다
  useEffect(() => {
    let cancelled = false;
    fetch("/api/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: NavProgress | null) => {
        if (body && !cancelled) setBooks(body);
      })
      .catch(() => {
        // 오프라인이면 있던 값을 둔다
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return ready ? { ...books, kana: kanaProgress(cards) } : books;
}
