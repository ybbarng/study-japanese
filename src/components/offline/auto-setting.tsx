"use client";

import { useEffect, useState } from "react";
import { AUTO_COUNT, autoVerdict } from "@/lib/offline/auto";
import { getConnection } from "@/lib/offline/browser";
import { useOffline } from "@/lib/offline/store";

const STATUS_TEXT = {
  go: "지금 와이파이라 이어서 할 강을 받습니다",
  notWifi: "지금은 모바일 데이터라 받지 않습니다. 와이파이에 붙으면 받습니다",
  unknown: "이 브라우저는 와이파이인지 알려 주지 않아 자동으로 받지 않습니다",
  off: "",
} as const;

/** 와이파이일 때 이어서 할 강 자동 받기. 연결 정보가 없는 브라우저에서는 그리지 않는다 */
export function AutoSetting() {
  const autoNext = useOffline((s) => s.autoNext);
  const setAutoNext = useOffline((s) => s.setAutoNext);
  const [hasConnection, setHasConnection] = useState(false);
  const [type, setType] = useState<string | undefined>(undefined);

  useEffect(() => {
    const connection = getConnection();
    setHasConnection(connection !== undefined);
    if (!connection) return;
    const read = () => setType(connection.type);
    read();
    connection.addEventListener("change", read);
    return () => connection.removeEventListener("change", read);
  }, []);

  if (!hasConnection) return null;
  const verdict = autoVerdict(autoNext, getConnection());

  return (
    <section className="rounded-2xl bg-bg-raised px-4 py-4">
      <label className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block">와이파이일 때 다음 할 강 미리 받기</span>
          <span className="text-sm text-ink-soft">
            일무따·일문따에서 이어서 할 강을 {AUTO_COUNT}개씩 받아 둡니다
          </span>
        </span>
        <input
          type="checkbox"
          checked={autoNext}
          onChange={(e) => setAutoNext(e.target.checked)}
          className="size-6 accent-accent"
        />
      </label>
      {autoNext ? (
        <p className="mt-2 text-xs text-ink-faint" data-connection={type}>
          {STATUS_TEXT[verdict]}
        </p>
      ) : null}
    </section>
  );
}
