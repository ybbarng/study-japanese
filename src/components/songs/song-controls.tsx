"use client";

import Link from "next/link";
import { ToggleChips } from "@/components/ilmuta/toggle-chips";
import { cn } from "@/lib/cn";
import { LOOP_OFF, type LoopChoice } from "@/lib/songs/loop";
import type { SongLine } from "@/lib/songs/schema";
import type { SongPlayback } from "./use-song-playback";

interface Props {
  slug: string;
  lines: SongLine[];
  isAdmin: boolean;
  playback: SongPlayback;
  /** 지금 부르는 줄(재생 중이 아니면 -1) */
  current: number;
  showReading: boolean;
  onShowReading: (on: boolean) => void;
  covered: boolean;
  onCovered: (on: boolean) => void;
  loop: LoopChoice;
  onLoop: (loop: LoopChoice) => void;
}

/** 재생·반복(관리자)과 보이기 스위치. PC는 곁칸, 폰은 가사 위 */
export function SongControls({
  slug,
  lines,
  isAdmin,
  playback,
  current,
  showReading,
  onShowReading,
  covered,
  onCovered,
  loop,
  onLoop,
}: Props) {
  const timed = lines.some((l) => l.start !== undefined);
  return (
    <section aria-label="노래 조절" className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={playback.toggle}
            className="rounded-xl bg-accent px-5 py-3 font-medium text-white"
          >
            {playback.playing ? "멈추기" : "노래 틀기"}
          </button>
          <Link
            href={`/songs/${slug}/sync`}
            className="rounded-xl border border-line px-4 py-3 text-sm hover:bg-bg-raised"
          >
            박자 맞추기
          </Link>
          <Link
            href={`/songs/${slug}/edit`}
            className="rounded-xl px-3 py-3 text-sm text-ink-soft hover:bg-bg-raised"
          >
            고치기
          </Link>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-3 text-sm text-ink-soft">
          노래 재생은 로그인한 사람만 할 수 있습니다. 가사·읽는 법·낱말은 누구나
          볼 수 있어요.{" "}
          <Link
            href={`/login?next=${encodeURIComponent(`/songs/${slug}`)}`}
            className="text-accent underline underline-offset-2"
          >
            로그인
          </Link>
        </p>
      )}

      <ToggleChips
        toggles={[
          { id: "reading", label: "읽는 법", on: showReading },
          { id: "cover", label: "가리고 듣기", on: covered, strike: false },
        ]}
        onChange={(id, on) =>
          id === "reading" ? onShowReading(on) : onCovered(on)
        }
      />

      {isAdmin && timed ? (
        <LoopPicker
          lines={lines}
          current={current}
          loop={loop}
          onLoop={onLoop}
        />
      ) : null}
      {isAdmin && !timed ? (
        <p className="text-xs text-ink-faint">
          박자 맞추기로 줄마다 시작을 정하면, 지금 줄 따라가기·줄 누르기·반복을
          쓸 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function LoopPicker({
  lines,
  current,
  loop,
  onLoop,
}: {
  lines: SongLine[];
  current: number;
  loop: LoopChoice;
  onLoop: (loop: LoopChoice) => void;
}) {
  const base = current >= 0 ? current : 0;
  const option = (i: number) => (
    <option key={i} value={i} disabled={lines[i].start === undefined}>
      {i + 1}. {lines[i].ja.slice(0, 12)}
    </option>
  );
  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm",
      on
        ? "border-accent bg-accent-soft text-accent"
        : "border-line text-ink-soft",
    );
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-1 text-xs text-ink-faint">반복</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={chip(loop.kind === "off")}
          onClick={() => onLoop(LOOP_OFF)}
        >
          끄기
        </button>
        <button
          type="button"
          className={chip(loop.kind === "line")}
          onClick={() => onLoop({ kind: "line", index: base })}
        >
          지금 줄
        </button>
        <button
          type="button"
          className={chip(loop.kind === "range")}
          onClick={() =>
            onLoop({
              kind: "range",
              from: base,
              to: Math.min(lines.length - 1, base + 3),
            })
          }
        >
          구간
        </button>
      </div>
      {loop.kind === "line" ? (
        <p className="text-xs text-ink-faint">
          {loop.index + 1}번째 줄을 되풀이합니다.
        </p>
      ) : null}
      {loop.kind === "range" ? (
        <div className="flex items-center gap-2 text-sm">
          <select
            aria-label="반복 시작 줄"
            value={loop.from}
            onChange={(e) => onLoop({ ...loop, from: Number(e.target.value) })}
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg-sunken p-2"
            lang="ja"
          >
            {lines.map((_, i) => option(i))}
          </select>
          <span className="text-ink-faint">~</span>
          <select
            aria-label="반복 끝 줄"
            value={loop.to}
            onChange={(e) => onLoop({ ...loop, to: Number(e.target.value) })}
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg-sunken p-2"
            lang="ja"
          >
            {lines.map((_, i) => option(i))}
          </select>
        </div>
      ) : null}
    </fieldset>
  );
}
