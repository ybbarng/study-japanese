"use client";

import { cn } from "@/lib/cn";

export interface Toggle {
  id: string;
  label: string;
  on: boolean;
  /** 보이기 스위치라 꺼지면 "숨김"을 붙인다. "가리기"처럼 켜면 숨기는 스위치는 false */
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
          aria-label={t.label}
          onClick={() => onChange(t.id, !t.on)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm",
            t.on
              ? "border-accent bg-accent-soft text-accent"
              : "border-dashed border-line text-ink-faint",
          )}
        >
          {/* 켜짐·꺼짐을 색만이 아니라 글로도: 켜면 ✓, 보이기 스위치를 끄면 "숨김"(취소선은 꺼진 줄 알아보기 어려웠다) */}
          {t.on
            ? `✓ ${t.label}`
            : t.strike !== false
              ? `${t.label} 숨김`
              : t.label}
        </button>
      ))}
    </div>
  );
}
