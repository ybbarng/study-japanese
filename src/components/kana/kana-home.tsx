"use client";

import Link from "next/link";
import { useState } from "react";
import { LESSONS } from "@/lib/kana/lessons";
import { todayPlan } from "@/lib/kana/plan";
import { streak } from "@/lib/kana/state";
import { useKanaStore } from "@/lib/kana/store";
import { BackupPanel } from "./backup-panel";
import s from "./kana.module.css";
import { ProgressMap } from "./progress-map";
import { cn, Glyph } from "./ui";

export function KanaHome() {
  const data = useKanaStore();
  const [now] = useState(() => Date.now());
  const plan = todayPlan(data, now);
  const days = streak(data, now);
  const doneCount = Object.keys(data.lessons).length;

  const today =
    plan.kind === "lesson"
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-faint">
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

      <Link
        href={today.href}
        className={cn(
          "relative block overflow-hidden rounded-3xl bg-accent p-6 text-white active:scale-[0.99]",
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

      <div className="grid grid-cols-3 gap-3 text-center">
        <Link
          href="/kana/review"
          className="rounded-2xl bg-bg-raised p-3 active:scale-95"
        >
          <span className="block text-2xl font-bold">{plan.due}</span>
          <span className="text-xs text-ink-soft">오늘 복습</span>
        </Link>
        <Link
          href="/kana/game/rush"
          className="rounded-2xl bg-bg-raised p-3 active:scale-95"
        >
          <Glyph className="block text-2xl">速</Glyph>
          <span className="text-xs text-ink-soft">빠르게 읽기</span>
        </Link>
        <Link
          href="/kana/game/match"
          className="rounded-2xl bg-bg-raised p-3 active:scale-95"
        >
          <Glyph className="block text-2xl">あア</Glyph>
          <span className="text-xs text-ink-soft">짝 맞추기</span>
        </Link>
      </div>

      <ProgressMap cards={data.cards} />

      <section>
        <h2 className="pb-2 text-sm text-ink-faint">레슨</h2>
        <ol className="flex flex-col gap-2">
          {LESSONS.map((l, k) => {
            const done = Boolean(data.lessons[l.id]);
            const isNext = plan.lesson?.id === l.id;
            return (
              <li key={l.id}>
                <Link
                  href={`/kana/lesson/${l.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl bg-bg-raised px-4 py-3",
                    isNext && "ring-2 ring-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                      done
                        ? "bg-good/20 text-good"
                        : "bg-bg-sunken text-ink-faint",
                    )}
                  >
                    {done ? "✓" : k + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{l.title}</span>
                    <span
                      lang="ja"
                      className="block truncate text-xs text-ink-soft"
                    >
                      {l.glyphs}
                    </span>
                  </span>
                  <span className="text-xs text-ink-faint">
                    {l.script === "hira" ? "ひ" : "カ"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <BackupPanel />
    </main>
  );
}
