"use client";

import { cn } from "@/lib/cn";
import type { RepeatMode } from "@/lib/player/queue";
import { RATES, stepRate } from "@/lib/player/rates";
import { usePlayer } from "@/lib/player/store";

// 재생 설정 단추들(속도·따라 말하기 간격·반복). 폰의 펼친 재생 화면과 PC 아래 막대가 함께 쓴다.

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: "반복 끔",
  all: "전체 반복",
  one: "한 개 반복",
};
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = {
  off: "all",
  all: "one",
  one: "off",
};

/** 속도 단계를 모두 늘어놓은 줄(폰 펼친 화면) */
export function RateChips() {
  const rate = usePlayer((s) => s.rate);
  const setRate = usePlayer((s) => s.setRate);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRate(r)}
          className={cn(
            "rounded-full px-3 py-1.5",
            r === rate ? "bg-accent-soft text-accent" : "text-ink-soft",
          )}
        >
          {r}×
        </button>
      ))}
    </div>
  );
}

/** 속도를 한 단계씩(PC 막대. [ ] 키와 같다) */
export function RateStepper() {
  const rate = usePlayer((s) => s.rate);
  const setRate = usePlayer((s) => s.setRate);
  return (
    <div className="flex items-center rounded-full border border-line text-sm">
      <button
        type="button"
        onClick={() => setRate(stepRate(rate, -1))}
        className="h-9 w-8 rounded-l-full text-ink-soft hover:bg-bg-sunken"
        aria-label="느리게"
        title="느리게 ( [ )"
      >
        −
      </button>
      <span className="w-12 text-center font-mono">
        <span className="sr-only">재생 속도 </span>
        {rate}×
      </span>
      <button
        type="button"
        onClick={() => setRate(stepRate(rate, 1))}
        className="h-9 w-8 rounded-r-full text-ink-soft hover:bg-bg-sunken"
        aria-label="빠르게"
        title="빠르게 ( ] )"
      >
        +
      </button>
    </div>
  );
}

const toggleClass = (on: boolean) =>
  cn(
    "whitespace-nowrap rounded-full border px-4 py-2",
    on ? "border-accent text-accent" : "border-line text-ink-soft",
  );

export function ShadowGapToggle({ className }: { className?: string }) {
  const on = usePlayer((s) => s.shadowGap);
  const set = usePlayer((s) => s.setShadowGap);
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      title="예문이 끝나면 같은 길이만큼 쉬어 따라 말할 틈을 준다"
      className={cn(toggleClass(on), className)}
    >
      따라 말하기 간격 {on ? "켬" : "끔"}
    </button>
  );
}

export function RepeatToggle({ className }: { className?: string }) {
  const repeat = usePlayer((s) => s.repeat);
  const set = usePlayer((s) => s.setRepeat);
  return (
    <button
      type="button"
      onClick={() => set(NEXT_REPEAT[repeat])}
      className={cn(toggleClass(repeat !== "off"), className)}
    >
      {REPEAT_LABEL[repeat]}
    </button>
  );
}
