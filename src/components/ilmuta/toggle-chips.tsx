"use client";

import { cn } from "@/lib/cn";

export interface Toggle {
  id: string;
  label: string;
  on: boolean;
  /** 꺼졌을 때 취소선(보이기 스위치). "가리기"처럼 켜면 숨기는 스위치는 false */
  strike?: boolean;
}

/** 일본어·읽는 법·뜻 같은 보이기 스위치 */
export function ToggleChips({
  toggles,
  onChange,
}: {
  toggles: Toggle[];
  onChange: (id: string, on: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {toggles.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={t.on}
          onClick={() => onChange(t.id, !t.on)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm",
            t.on
              ? "border-accent bg-accent-soft text-accent"
              : cn(
                  "border-line text-ink-faint",
                  t.strike !== false && "line-through",
                ),
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
