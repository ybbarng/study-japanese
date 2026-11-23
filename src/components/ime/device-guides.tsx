"use client";

import { useEffect, useState } from "react";
import { type Device, guessDevice } from "@/lib/ime/device";
import { GUIDES } from "./guides";

/** 기기별 안내. 접속한 기기 안내를 맨 위로 올려 펼친다 */
export function DeviceGuides() {
  const [mine, setMine] = useState<Device | null>(null);
  const [open, setOpen] = useState<Set<Device>>(new Set());

  useEffect(() => {
    const d = guessDevice(navigator.userAgent);
    setMine(d);
    if (d) setOpen(new Set([d]));
  }, []);

  const ordered = mine
    ? [...GUIDES].sort(
        (a, b) => Number(b.device === mine) - Number(a.device === mine),
      )
    : GUIDES;

  return (
    <div className="flex flex-col gap-2">
      {ordered.map((g) => (
        <details
          key={g.device}
          open={open.has(g.device)}
          onToggle={(e) => {
            const isOpen = e.currentTarget.open;
            setOpen((prev) => {
              const next = new Set(prev);
              if (isOpen) next.add(g.device);
              else next.delete(g.device);
              return next;
            });
          }}
          className="rounded-2xl bg-bg-raised px-4 py-3"
          data-device={g.device}
        >
          <summary className="cursor-pointer text-lg font-medium">
            {g.name}
            {g.device === mine ? (
              <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                지금 이 기기
              </span>
            ) : null}
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
            {g.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-3">
            <span className="text-sm text-ink-faint">
              한국어 ↔ 일본어 바꾸기
            </span>
            <br />
            {g.switchKey}
          </p>
          {g.tips?.map((t) => (
            <p key={t} className="mt-2 text-sm text-ink-soft">
              {t}
            </p>
          ))}
        </details>
      ))}
    </div>
  );
}
