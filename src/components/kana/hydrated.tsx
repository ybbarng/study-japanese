"use client";

import type { ReactNode } from "react";
import { useKanaHydrated } from "@/lib/kana/store";
import { KanaSync } from "./kana-sync";

/** 기기에 저장된 진도를 읽어 온 뒤에만 그리고, 그때부터 서버와 진도를 맞춘다. */
export function Hydrated({ children }: { children: ReactNode }) {
  const ready = useKanaHydrated();
  if (!ready)
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-faint">
        <span lang="ja" className="animate-pulse text-4xl">
          あ
        </span>
      </div>
    );
  return (
    <>
      <KanaSync />
      {children}
    </>
  );
}
