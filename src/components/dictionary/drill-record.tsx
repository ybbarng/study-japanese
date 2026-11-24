"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { drillRecordOf } from "@/lib/dictionary/drill-record";
import type { DrillKind } from "@/lib/dictionary/entries";
import { useDrillStore } from "@/lib/ilmunta/stores";

function useDrillHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsub = useDrillStore.persist.onFinishHydration(onChange);
      if (!useDrillStore.persist.hasHydrated())
        void useDrillStore.persist.rehydrate();
      return unsub;
    },
    () => useDrillStore.persist.hasHydrated(),
    () => false,
  );
}

/**
 * 이 낱말이 드는 활용 드릴 갈래의 내 기록(이 기기). 드릴 기록은 낱말이 아니라
 * 활용 갈래(1그룹 동사의 て형 등)마다 남으므로 갈래 전체를 보인다. 기록이 없으면 그리지 않는다.
 */
export function DrillRecord({ drill }: { drill: DrillKind }) {
  const ready = useDrillHydrated();
  const skills = useDrillStore((s) => s.data.skills);
  if (!ready) return null;
  const record = drillRecordOf(skills, drill);
  if (record.reps === 0) return null;
  return (
    <p className="rounded-xl bg-bg-raised px-4 py-3 text-sm">
      내 활용 드릴({record.label}): {record.reps}번 풀었고 {record.lapses}번
      틀렸습니다.{" "}
      <Link
        href="/ilmunta/drill"
        className="text-accent underline underline-offset-4"
      >
        드릴하기 →
      </Link>
    </p>
  );
}
