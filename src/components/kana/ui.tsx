"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { canPlay, playSound, playWord } from "./audio";

export function cn(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args));
}

/** 가나 화면 한 장: 위에 돌아가기·제목, 가운데 내용, 아래 엄지 버튼 자리 */
export function Screen({
  title,
  back = "/kana",
  progress,
  children,
  footer,
}: {
  title?: string;
  back?: string;
  progress?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col lg:max-w-3xl lg:pt-6">
      <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link
          href={back}
          aria-label="돌아가기"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink-soft active:bg-bg-raised"
        >
          ←
        </Link>
        {progress !== undefined ? (
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-raised">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : (
          <h1 className="flex-1 truncate text-sm text-ink-soft">{title}</h1>
        )}
      </header>
      <main className="flex flex-1 flex-col px-5 pb-4">{children}</main>
      {footer && (
        <footer className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {footer}
        </footer>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "h-14 w-full rounded-2xl bg-accent text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "h-14 w-full rounded-2xl bg-bg-raised text-lg font-medium text-ink transition active:scale-[0.98] disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** 글자·낱말 소리 버튼. 소리 파일이 없으면 흐려지고 `onUnavailable`을 부른다. */
export function SoundButton({
  soundId,
  word,
  autoPlay = false,
  size = "md",
  onUnavailable,
}: {
  soundId?: string;
  word?: string;
  autoPlay?: boolean;
  size?: "md" | "lg";
  onUnavailable?: () => void;
}) {
  const [state, setState] = useState<"idle" | "playing" | "none">(
    soundId && !canPlay(soundId) ? "none" : "idle",
  );

  const play = async () => {
    setState("playing");
    const r = soundId
      ? await playSound(soundId)
      : word
        ? await playWord(word)
        : "missing";
    // 다른 소리에 끊긴 것(skipped)은 다시 누르면 되니 그대로 둔다
    setState(r === "missing" ? "none" : "idle");
    if (r === "missing") onUnavailable?.();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: 글자가 바뀔 때만 자동 재생한다
  useEffect(() => {
    if (soundId && !canPlay(soundId)) {
      setState("none");
      onUnavailable?.();
      return;
    }
    setState("idle");
    if (autoPlay) void play();
  }, [soundId, word]);

  return (
    <button
      type="button"
      onClick={play}
      aria-label="소리 듣기"
      className={cn(
        "flex items-center justify-center rounded-full bg-bg-raised text-ink transition active:scale-95",
        size === "lg" ? "h-24 w-24 text-4xl" : "h-12 w-12 text-xl",
        state === "playing" && "bg-accent-soft text-accent",
        state === "none" && "opacity-40",
      )}
    >
      {state === "none" ? "🔇" : "🔊"}
    </button>
  );
}

/** PC에서 보기 왼쪽 위에 붙이는 숫자 키 표시(1~4 키로 고른다). 폰에서는 감춘다 */
export function ChoiceKey({ n }: { n: number }) {
  return (
    <kbd
      aria-hidden
      className="absolute top-2 left-2 hidden rounded-md border border-line px-1.5 font-mono text-xs text-ink-faint lg:block"
    >
      {n}
    </kbd>
  );
}

/** 큰 일본어 글자 */
export function Glyph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      lang="ja"
      className={cn("font-ja-serif font-bold leading-none", className)}
    >
      {children}
    </span>
  );
}
