"use client";

import { useState } from "react";
import {
  type CardId,
  cardId,
  DAKUTEN_GRID,
  GOJUON_GRID,
  getSound,
  type Script,
  YOON_GRID,
} from "@/lib/kana/data";
import { type CardState, type Mastery, masteryOf } from "@/lib/kana/srs";
import { cn } from "./ui";

const MASTERY_STYLE: Record<Mastery, string> = {
  none: "bg-bg-raised/40 text-ink-faint",
  learning: "bg-warn/20 text-warn",
  familiar: "bg-good/20 text-good",
  solid: "bg-accent text-white",
};

const LEGEND: { m: Mastery; label: string }[] = [
  { m: "none", label: "아직" },
  { m: "learning", label: "익히는 중" },
  { m: "familiar", label: "익숙함" },
  { m: "solid", label: "단단함" },
];

/** 50음도 표에 글자마다 익힌 정도를 색으로 보여 준다. */
export function ProgressMap({
  cards,
}: {
  cards: Partial<Record<CardId, CardState>>;
}) {
  const [script, setScript] = useState<Script>("hira");
  const [section, setSection] = useState<"basic" | "dakuten" | "yoon">("basic");
  const grid =
    section === "basic"
      ? GOJUON_GRID
      : section === "dakuten"
        ? DAKUTEN_GRID
        : YOON_GRID;

  const total = (grid.flat().filter(Boolean) as string[]).length;
  const learned = (grid.flat().filter(Boolean) as string[]).filter(
    (id) => cards[cardId(script, id)],
  ).length;

  return (
    <section className="rounded-3xl bg-bg-sunken p-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-bg-raised p-1 text-sm">
          {(["hira", "kata"] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              lang="ja"
              onClick={() => setScript(sc)}
              className={cn(
                "rounded-full px-3 py-1",
                script === sc ? "bg-accent text-white" : "text-ink-soft",
              )}
            >
              {sc === "hira" ? "ひらがな" : "カタカナ"}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-faint">
          {learned} / {total}
        </span>
      </div>
      <div className="mt-3 flex gap-3 text-xs">
        {(
          [
            ["basic", "기본"],
            ["dakuten", "탁음"],
            ["yoon", "요음"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSection(k)}
            className={cn(
              "pb-0.5",
              section === k
                ? "border-b-2 border-accent text-ink"
                : "text-ink-faint",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "mt-3 grid gap-1.5",
          section === "yoon" ? "grid-cols-3" : "grid-cols-5",
        )}
      >
        {grid.flat().map((id, k) => {
          if (!id)
            // biome-ignore lint/suspicious/noArrayIndexKey: 빈칸은 자리로 구분한다
            return <span key={`empty-${k}`} />;
          const ch = getSound(id)[script];
          const m = masteryOf(cards[cardId(script, id)]);
          return (
            <span
              key={id}
              lang="ja"
              title={getSound(id).ko}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg text-xl transition-colors",
                MASTERY_STYLE[m],
              )}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-faint">
        {LEGEND.map(({ m, label }) => (
          <span key={m} className="flex items-center gap-1">
            <span className={cn("h-3 w-3 rounded", MASTERY_STYLE[m])} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
