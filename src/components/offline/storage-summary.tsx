"use client";

import { useEffect, useState } from "react";
import {
  persistStatus,
  requestPersist,
  type StorageInfo,
  storageEstimate,
} from "@/lib/offline/browser";
import { formatBytes } from "@/lib/offline/size";
import { useOffline } from "@/lib/offline/store";

/** 이 사이트가 쓰는 폰 공간과, 공간이 모자랄 때 브라우저가 지우지 않게 하는 요청 */
export function StorageSummary() {
  const version = useOffline((s) => s.version);
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [asked, setAsked] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 받거나 지운 뒤(version) 다시 잰다
  useEffect(() => {
    void storageEstimate().then(setInfo);
    void persistStatus().then(setPersisted);
  }, [version]);

  return (
    <section className="rounded-2xl bg-bg-raised px-4 py-4">
      <h2 className="text-sm text-ink-faint">폰 저장 공간</h2>
      {info ? (
        <p className="mt-1 text-lg">
          이 사이트가 {formatBytes(info.usage)} 쓰는 중
          <span className="ml-1 text-sm text-ink-soft">
            · 쓸 수 있는 공간 약 {formatBytes(info.quota)}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-ink-soft">
          이 브라우저는 사용량을 알려 주지 않습니다
        </p>
      )}

      {persisted === true ? (
        <p className="mt-2 text-sm text-good">
          공간이 모자라도 브라우저가 받아 둔 강을 지우지 않게 해 두었습니다
        </p>
      ) : persisted === false ? (
        <div className="mt-3 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-ink-soft">
            {asked
              ? "브라우저가 아직 허락하지 않았습니다. 홈 화면에 앱으로 설치하면 대개 허락됩니다"
              : "폰 공간이 모자라면 브라우저가 받아 둔 강을 지울 수 있습니다"}
          </p>
          <button
            type="button"
            onClick={async () => {
              setAsked(true);
              setPersisted(await requestPersist());
            }}
            className="shrink-0 rounded-full border border-line px-3 py-2 text-sm"
          >
            지우지 않게 요청
          </button>
        </div>
      ) : null}
    </section>
  );
}
