"use client";

import Link from "next/link";
import { useNowPlaying, usePlay } from "@/components/ilmuta/use-player-bridge";
import { cn } from "@/lib/cn";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { actionHref } from "@/lib/today/actions";
import type { TodayAction } from "@/lib/today/pick";
import type { ActionText } from "./action-text";

interface Props {
  action: TodayAction;
  text: ActionText;
  /** 첫 카드는 가장 진하게 */
  primary: boolean;
  /** 일무따 강의면 첫 화면에서 바로 틀 강 */
  lesson?: IlmutaLesson;
}

function minutes(sec: number): string {
  return `${Math.max(1, Math.round(sec / 60))}분`;
}

/** 오늘 할 것 가운데 가장 크게 보이는 카드. 강의는 한 번 누르면 바로 재생된다 */
export function MainCard({ action, text, primary, lesson }: Props) {
  const play = usePlay();
  const now = useNowPlaying();
  const tone = primary ? "bg-accent text-white" : "bg-bg-raised";
  const head = (
    <>
      <span
        className={cn(
          "text-sm lg:text-base",
          primary ? "opacity-90" : "text-accent",
        )}
      >
        {text.eyebrow}
      </span>
      <span
        className={cn(
          "mt-1 block text-2xl font-bold lg:text-3xl",
          primary && "lg:text-4xl",
        )}
      >
        {text.title}
      </span>
      {text.ja ? (
        <span
          lang="ja"
          className={cn(
            "mt-1 block truncate font-ja-serif text-2xl",
            primary && "lg:mt-3 lg:text-5xl lg:leading-tight",
          )}
        >
          {text.ja}
        </span>
      ) : null}
      {text.sub ? (
        <span
          className={cn(
            "mt-1 block text-sm lg:text-base",
            primary ? "opacity-90" : "text-ink-soft",
          )}
        >
          {text.sub}
        </span>
      ) : null}
    </>
  );

  if (action.kind === "ilmuta-listen" && lesson) {
    const playing = now.item === lectureItem(lesson.no) && now.playing;
    return (
      <div className={cn("rounded-3xl p-6", primary && "lg:p-10", tone)}>
        {head}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => play(lessonQueue(lesson), 0)}
            className={cn(
              "h-14 flex-1 rounded-2xl text-lg font-bold active:scale-[0.98]",
              primary ? "bg-white text-accent" : "bg-accent text-white",
            )}
          >
            {playing ? "❚❚ 멈추기" : `▶ ${lesson.no}강 듣기`}
          </button>
          <Link
            href={actionHref(action)}
            className={cn(
              "grid h-14 place-items-center rounded-2xl px-4 text-sm",
              primary ? "bg-white/20" : "bg-bg-sunken",
            )}
          >
            강 화면 · {minutes(lesson.lecture.durationSec)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={actionHref(action)}
      className={cn(
        "relative block rounded-3xl p-6 pr-20 active:scale-[0.99] lg:hover:brightness-110",
        primary && "lg:p-10 lg:pr-28",
        tone,
      )}
    >
      {head}
      <span
        aria-hidden
        className={cn(
          "absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full text-xl",
          primary ? "bg-white/20" : "bg-accent text-white",
        )}
      >
        ▶
      </span>
    </Link>
  );
}
