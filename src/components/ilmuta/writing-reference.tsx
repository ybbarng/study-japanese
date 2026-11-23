"use client";

import { useState } from "react";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { examplesOf } from "@/lib/ilmuta/steps";
import { RubyText } from "./ruby-text";
import { ToggleChips } from "./toggle-chips";

/**
 * 문장 쓰기 옆에 두는 참고: 그 강 문형, 막히면 볼 예문·단어.
 * 폰은 예문·단어를 접어 두고, PC 곁칸은 펼쳐 두되 "예문·단어 가리기"로 베끼지 않고 떠올리게 한다.
 */
export function WritingReference({
  data,
  layout,
}: {
  data: LessonData;
  layout: "fold" | "panel";
}) {
  const { lesson, glossary } = data;
  const [hidden, setHidden] = useState(false);
  const patterns = examplesOf(lesson, "patterns");
  const heads = patterns.flatMap((e) => e.patterns ?? []);
  const sentences = patterns.flatMap((e) => e.sentences).slice(0, 8);
  const words = examplesOf(lesson, "words").flatMap((e) => e.sentences);
  if (heads.length === 0 && words.length === 0) return null;
  const big = layout === "panel";

  const extra = (
    <>
      <ul className={big ? "space-y-3" : "mt-2 space-y-1"}>
        {sentences.map((s) => (
          <li key={s.ja}>
            <RubyText
              text={s.ja}
              glossary={glossary}
              className={big ? "block text-xl leading-loose" : undefined}
            />
            <span
              className={
                big ? "block text-sm text-ink-faint" : "ml-2 text-ink-faint"
              }
            >
              {s.ko}
            </span>
          </li>
        ))}
      </ul>
      {words.length > 0 ? (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {words.map((w) => (
            <span key={w.ja}>
              <RubyText
                text={w.ja}
                reading={w.reading}
                className={big ? "text-lg" : undefined}
              />
              <span className="ml-1 text-ink-faint">{w.ko}</span>
            </span>
          ))}
        </p>
      ) : null}
    </>
  );

  return (
    <section
      aria-label="쓰기 참고"
      className={
        big ? "flex min-h-0 flex-col gap-4" : "rounded-2xl bg-bg-raised p-4"
      }
    >
      {heads.length > 0 ? (
        <div className={big ? "rounded-2xl bg-bg-raised p-5" : undefined}>
          <h2 className="text-sm text-ink-faint">이 강의 문형</h2>
          <ul className="mt-2 space-y-2">
            {heads.map((p) => (
              <li key={p.no}>
                <span
                  lang="ja"
                  className={
                    big
                      ? "block font-ja-serif text-xl"
                      : "font-ja-serif text-xl"
                  }
                >
                  {p.ja}
                </span>
                <span
                  className={
                    big
                      ? "block text-sm text-ink-soft"
                      : "ml-2 text-sm text-ink-soft"
                  }
                >
                  {p.ko}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {big ? (
        <div className="flex min-h-0 flex-col rounded-2xl bg-bg-sunken p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm text-ink-faint">예문·단어</h2>
            <ToggleChips
              toggles={[
                { id: "hide", label: "가리기", on: hidden, strike: false },
              ]}
              onChange={(_, on) => setHidden(on)}
            />
          </div>
          {hidden ? (
            <p className="mt-4 text-sm text-ink-faint">
              가려 두었습니다. 문형만 보고 먼저 떠올려 써 본 뒤, 막히면 가리기를
              끄세요.
            </p>
          ) : (
            <div className="mt-3 min-h-0 overflow-y-auto">{extra}</div>
          )}
        </div>
      ) : (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-faint">
            막히면 예문·단어 보기
          </summary>
          {extra}
        </details>
      )}
    </section>
  );
}
