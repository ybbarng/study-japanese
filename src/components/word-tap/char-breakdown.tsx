"use client";

import { useState } from "react";
import { playSound } from "@/components/kana/audio";
import { cn } from "@/lib/cn";
import {
  type CharInfo,
  charInfos,
  isTappableChar,
  MARK_EXPLAIN,
  MARK_LABEL,
  scriptLabel,
} from "@/lib/word-tap/kana-info";

/**
 * 낱말을 글자 하나씩: 글자마다 한글 근사치, 한글로 정확히 못 적는 소리 표시(!).
 * 글자를 누르면 그 글자 소리를 듣고 아래에 종류·표시·풀이가 나온다.
 */
export function CharBreakdown({
  text,
  initial = null,
}: {
  text: string;
  /** 처음부터 고른 글자 차례(글자 하나만 누른 때) */
  initial?: number | null;
}) {
  const chars = charInfos(text);
  const [at, setAt] = useState<number | null>(initial);
  const picked = at === null ? null : chars[at];
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="글자 하나씩" className="flex flex-wrap gap-2">
        {chars.map((c, i) =>
          isTappableChar(c) ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 글자가 두 번 나올 수 있다
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setAt(i);
                  if (c.audio && c.soundId) void playSound(c.soundId);
                }}
                aria-pressed={at === i}
                aria-label={`${c.text} ${c.ko ?? scriptLabel(c.script)}${c.inexact ? ", 한글로는 정확히 못 적음" : ""}`}
                className={cn(
                  "relative flex min-w-14 flex-col items-center rounded-xl border px-2 py-1.5",
                  at === i
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:bg-bg-sunken",
                )}
              >
                <span
                  lang="ja"
                  className="font-ja-serif text-2xl leading-tight"
                >
                  {c.text}
                </span>
                <span className="text-xs text-ink-soft">
                  {c.ko ?? scriptLabel(c.script)}
                </span>
                {c.inexact ? (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-warn text-[0.7rem] font-bold text-white"
                  >
                    !
                  </span>
                ) : null}
              </button>
            </li>
          ) : null,
        )}
      </ul>
      {picked ? (
        <CharDetail info={picked} />
      ) : (
        <p className="text-xs text-ink-faint">
          글자를 누르면 그 글자 소리와 풀이가 나옵니다. ! 표시는 한글로 정확히
          못 적는 소리입니다.
        </p>
      )}
    </div>
  );
}

function CharDetail({ info }: { info: CharInfo }) {
  return (
    <section
      aria-label={`글자 ${info.text}`}
      className="flex flex-col gap-2 rounded-2xl bg-bg-sunken p-3 text-sm"
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span lang="ja" className="font-ja-serif text-3xl">
          {info.text}
        </span>
        <span>{scriptLabel(info.script)}</span>
        {info.marks.map((m) => (
          <span
            key={m}
            className="rounded-full border border-line px-2 text-xs text-ink-soft"
          >
            {MARK_LABEL[m]}
          </span>
        ))}
      </p>
      {info.ko ? (
        <p>
          한글로 비슷하게: <strong>{info.ko}</strong>
          {info.romaji ? (
            <span className="ml-2 text-ink-faint">({info.romaji})</span>
          ) : null}
        </p>
      ) : null}
      {info.inexact ? (
        <p role="note" className="rounded-xl bg-warn/15 p-2 leading-relaxed">
          <strong>한글로는 정확히 못 적음.</strong>{" "}
          {info.inexact.replace(/\s*한글로는 정확히 못 적음\.?$/, "")} 소리를 꼭
          귀로 듣고 따라 하세요.
        </p>
      ) : null}
      {info.marks.map((m) => (
        <p key={m} className="text-ink-soft">
          {MARK_EXPLAIN[m]}
        </p>
      ))}
      {info.script === "kanji" ? (
        <p className="text-ink-soft">
          한자는 낱말마다 읽는 법이 달라요. 위 읽는 법(히라가나)을 보세요.
        </p>
      ) : null}
      {info.soundId ? (
        info.audio ? (
          <button
            type="button"
            onClick={() => info.soundId && void playSound(info.soundId)}
            className="w-fit rounded-xl border border-line px-3 py-1.5 hover:bg-bg-raised"
          >
            ▶ 이 글자 소리 듣기
          </button>
        ) : (
          <p className="text-xs text-ink-faint">
            이 소리는 가나 레슨에 녹음이 없어요. 강의·예문 소리로 들어 보세요.
          </p>
        )
      ) : null}
    </section>
  );
}
