"use client";

import Link from "next/link";
import { useState } from "react";
import { LESSONS } from "@/lib/kana/lessons";
import { todayPlan } from "@/lib/kana/plan";
import { streak } from "@/lib/kana/state";
import { useKanaStore } from "@/lib/kana/store";
import { BackupPanel } from "./backup-panel";
import s from "./kana.module.css";
import { LessonList } from "./lesson-list";
import { ProgressMap } from "./progress-map";
import { cn, Glyph } from "./ui";

export function KanaHome() {
  const data = useKanaStore();
  const [now] = useState(() => Date.now());
  const plan = todayPlan(data, now);
  const days = streak(data, now);
  const completed = new Set(Object.keys(data.lessons));
  const doneCount = LESSONS.filter((l) => completed.has(l.id)).length;

  const today =
    plan.kind === "bridge"
      ? {
          href: `/kana/read/${plan.bridge.id}`,
          eyebrow: "바로 읽기",
          title: plan.bridge.title,
          glyphs: plan.bridge.glyphs,
          sub: "배운 글자만으로 교재 문장을 읽어 봅니다",
        }
      : plan.kind === "lesson"
        ? {
            href: `/kana/lesson/${plan.lesson.id}`,
            eyebrow:
              doneCount === 0
                ? "첫걸음"
                : `레슨 ${LESSONS.indexOf(plan.lesson) + 1}`,
            title: plan.lesson.title,
            glyphs: plan.lesson.glyphs,
            sub: "소개 → 알아보기 → 쓰기 → 낱말 읽기 → 입력",
          }
        : plan.kind === "review"
          ? {
              href: "/kana/review",
              eyebrow: "오늘 복습",
              title: `${plan.due}글자가 기다려요`,
              glyphs: "復習",
              sub: "틀렸던 글자와 잊을 때가 된 글자부터",
            }
          : {
              href: "/kana/game/rush",
              eyebrow: "다 배웠어요",
              title: "빠르게 읽기로 손 풀기",
              glyphs: "速",
              sub: "60초 동안 최고 기록에 도전",
            };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10 lg:max-w-6xl lg:px-10 lg:pt-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-faint lg:invisible">
          ← にほんご
        </Link>
        {days > 0 && (
          <span className="rounded-full bg-bg-raised px-3 py-1 text-xs text-ink-soft">
            {days}일째 이어서
          </span>
        )}
      </header>
      <div>
        <p
          lang="ja"
          className="font-ja-serif text-4xl font-bold tracking-widest"
        >
          かな
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          레슨 {doneCount} / {LESSONS.length} · 며칠 만에 읽고, 쓰면서 굳힌다
        </p>
      </div>

      {/* PC: 오늘 할 것(크게)과 놀이 입구를 나란히 */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4">
        <Link
          href={today.href}
          className={cn(
            "relative block overflow-hidden rounded-3xl bg-accent p-6 text-white active:scale-[0.99] lg:p-8 lg:hover:brightness-110",
            s.enter,
          )}
        >
          <p className="text-sm opacity-80">{today.eyebrow}</p>
          <p className="mt-1 pr-14 text-2xl font-bold">{today.title}</p>
          <Glyph className="mt-4 block text-3xl leading-snug tracking-wider opacity-95">
            {today.glyphs}
          </Glyph>
          <p className="mt-4 text-sm opacity-80">{today.sub}</p>
          <span className="absolute top-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
            ▶
          </span>
        </Link>

        <div className="grid grid-cols-3 gap-3 text-center lg:grid-cols-1 lg:text-left">
          <GameLink
            href="/kana/review"
            mark={<span className="text-2xl font-bold">{plan.due}</span>}
            label="오늘 복습"
          />
          <GameLink
            href="/kana/game/rush"
            mark={<Glyph className="text-2xl">速</Glyph>}
            label="빠르게 읽기"
          />
          <GameLink
            href="/kana/game/match"
            mark={<Glyph className="text-2xl">あア</Glyph>}
            label="짝 맞추기"
          />
        </div>
      </div>

      <ProgressMap cards={data.cards} />

      <LessonList
        completed={completed}
        nextId={
          plan.kind === "bridge" ? plan.bridge.id : (plan.lesson?.id ?? null)
        }
      />

      <BackupPanel />
    </main>
  );
}

/** 복습·놀이 입구. 폰은 세 칸 작은 상자, PC는 오늘 카드 옆에 세로로 늘어선 줄 */
function GameLink({
  href,
  mark,
  label,
}: {
  href: string;
  mark: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-bg-raised p-3 active:scale-95 lg:flex lg:items-center lg:gap-4 lg:px-5 lg:py-4 lg:hover:ring-1 lg:hover:ring-accent/50"
    >
      <span className="block lg:w-14">{mark}</span>
      <span className="text-xs text-ink-soft lg:text-sm">{label}</span>
    </Link>
  );
}
