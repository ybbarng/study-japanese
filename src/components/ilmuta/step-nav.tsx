"use client";

import { cn } from "@/lib/cn";
import { STEP_LABEL, type StepId } from "@/lib/ilmuta/steps";

/** 학습 단계 표. 폰·좁은 PC는 가로로 흐르는 줄, 넓은 PC(xl)는 세로 목차(고정) */
export function StepNav({
  steps,
  current,
  onGo,
  className,
}: {
  steps: StepId[];
  current: StepId;
  onGo: (s: StepId) => void;
  className?: string;
}) {
  const at = steps.indexOf(current);
  return (
    <nav
      aria-label="학습 단계"
      className={cn(
        "-mx-5 mt-5 flex gap-1 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:mt-6 lg:px-0 xl:sticky xl:top-8 xl:mt-0 xl:flex-col xl:self-start xl:overflow-visible",
        className,
      )}
    >
      <p className="hidden pb-2 text-xs text-ink-faint xl:block">
        학습 단계 · {at + 1}/{steps.length}
      </p>
      {steps.map((s, i) => (
        <button
          key={s}
          data-step={s}
          type="button"
          onClick={() => onGo(s)}
          aria-current={s === current ? "step" : undefined}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm xl:rounded-xl xl:py-2 xl:text-left",
            s === current
              ? "bg-accent text-white"
              : cn(
                  "text-ink-soft lg:hover:bg-bg-raised",
                  i < at && "xl:text-ink-faint",
                ),
          )}
        >
          {i + 1}. {STEP_LABEL[s]}
        </button>
      ))}
    </nav>
  );
}
