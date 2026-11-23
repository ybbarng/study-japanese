"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface SourceRow {
  id: string;
  title: string;
  rightsHolder: string;
}

/** 출처마다 공개 켜고 끄기. 누르면 바로 저장한다 */
export function SourceSwitches({
  sources,
  initialClosed,
}: {
  sources: SourceRow[];
  initialClosed: string[];
}) {
  const [closed, setClosed] = useState(new Set(initialClosed));
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function toggle(id: string) {
    const next = new Set(closed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setState("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closedSources: [...next] }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const saved = (await res.json()) as { closedSources: string[] };
      setClosed(new Set(saved.closedSources));
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {sources.map((s) => {
        const open = !closed.has(s.id);
        return (
          <div
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-bg-raised p-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-ink-faint">저작권: {s.rightsHolder}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={open}
              aria-label={`${s.title} 공개`}
              disabled={state === "saving"}
              onClick={() => toggle(s.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm",
                open
                  ? "bg-accent text-white"
                  : "border border-line text-ink-soft",
              )}
            >
              {open ? "공개" : "닫힘"}
            </button>
          </div>
        );
      })}
      {state === "error" ? (
        <p className="text-sm text-accent">
          저장하지 못했습니다. 다시 눌러 주세요.
        </p>
      ) : null}
    </div>
  );
}
