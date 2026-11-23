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

type Section = "basic" | "dakuten" | "yoon";
const SECTIONS: { id: Section; label: string; grid: (string | null)[][] }[] = [
  { id: "basic", label: "기본", grid: GOJUON_GRID },
  { id: "dakuten", label: "탁음", grid: DAKUTEN_GRID },
  { id: "yoon", label: "요음", grid: YOON_GRID },
];

type Cards = Partial<Record<CardId, CardState>>;

function idsOf(grid: (string | null)[][]): string[] {
  return grid.flat().filter((id): id is string => !!id);
}

/**
 * 50음도 표에 글자마다 익힌 정도를 색으로 보여 준다.
 * 폰은 기본·탁음·요음을 하나씩 고르고, PC(lg)는 셋을 나란히 펼쳐 한눈에 본다.
 */
export function ProgressMap({ cards }: { cards: Cards }) {
  const [script, setScript] = useState<Script>("hira");
  const [section, setSection] = useState<Section>("basic");
  const allIds = SECTIONS.flatMap((s) => idsOf(s.grid));
  const shown = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const shownIds = idsOf(shown.grid);
  const count = (ids: string[]) =>
    ids.filter((id) => cards[cardId(script, id)]).length;

  return (
    <section className="rounded-3xl bg-bg-sunken p-4 lg:p-6">
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
          <span className="lg:hidden">
            {count(shownIds)} / {shownIds.length}
          </span>
          <span className="hidden lg:inline">
            {count(allIds)} / {allIds.length}
          </span>
        </span>
      </div>

      {/* 폰: 칸 고르기 */}
      <div className="mt-3 flex gap-3 text-xs lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "pb-0.5",
              section === s.id
                ? "border-b-2 border-accent text-ink"
                : "text-ink-faint",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="lg:hidden">
        <KanaGrid section={shown} script={script} cards={cards} />
      </div>

      {/* PC: 세 표를 나란히 */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[5fr_5fr_3fr]">
        {SECTIONS.map((s) => (
          <div key={s.id}>
            <p className="mt-4 flex justify-between text-xs text-ink-faint">
              <span>{s.label}</span>
              <span>
                {count(idsOf(s.grid))} / {idsOf(s.grid).length}
              </span>
            </p>
            <KanaGrid section={s} script={script} cards={cards} />
          </div>
        ))}
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

function KanaGrid({
  section,
  script,
  cards,
}: {
  section: (typeof SECTIONS)[number];
  script: Script;
  cards: Cards;
}) {
  return (
    <div
      className={cn(
        "mt-3 grid gap-1.5",
        section.id === "yoon" ? "grid-cols-3" : "grid-cols-5",
      )}
    >
      {section.grid.flat().map((id, k) => {
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
  );
}
