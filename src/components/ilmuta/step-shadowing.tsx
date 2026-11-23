"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { KIND_LABEL } from "@/lib/ilmuta/labels";
import { ilmutaMediaUrl } from "@/lib/ilmuta/media";
import type { MicError } from "@/lib/ilmuta/recording";
import {
  addTake,
  deleteTake,
  listTakes,
  type Take,
} from "@/lib/ilmuta/recordings-db";
import { shadowingExamples } from "@/lib/ilmuta/steps";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import { usePlayer } from "@/lib/player/store";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import { RubyText } from "./ruby-text";
import { useNowPlaying, usePlay } from "./use-player-bridge";
import { useRecorder } from "./use-recorder";

const MIC_HELP: Record<MicError, string> = {
  denied:
    "마이크 권한이 꺼져 있습니다. 주소창 왼쪽 자물쇠(또는 앱 정보) → 권한 → 마이크를 허용한 뒤 다시 눌러 주세요.",
  unsupported: "이 브라우저는 녹음을 지원하지 않습니다.",
  "no-device": "마이크를 찾지 못했습니다.",
  other: "녹음을 시작하지 못했습니다. 다시 눌러 주세요.",
};

/** 따라 말하기: 내 목소리를 녹음해 원음과 번갈아 듣는다. 녹음은 폰 안에만 둔다 */
export function StepShadowing({ data, listens }: StepProps) {
  const { lesson, glossary } = data;
  const materials = shadowingExamples(lesson);
  const [selectedId, setSelectedId] = useState(
    () =>
      materials.find((e) => e.kind === "conversationAdvanced")?.id ??
      materials[0]?.id,
  );
  const material = materials.find((e) => e.id === selectedId) ?? materials[0];
  const play = usePlay();
  const now = useNowPlaying();
  const recorder = useRecorder();
  const [withOriginal, setWithOriginal] = useState(false);
  const [takes, setTakes] = useState<Take[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const reload = useCallback(
    () => listTakes(lesson.no).then(setTakes),
    [lesson.no],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  // 녹음 시간 표시
  useEffect(() => {
    if (recorder.state.kind !== "recording") return;
    const from = recorder.state.startedAt;
    const id = setInterval(() => setElapsed((Date.now() - from) / 1000), 250);
    return () => clearInterval(id);
  }, [recorder.state]);

  if (!material) return null;
  const track = exampleTrack(lesson, material);
  const recording = recorder.state.kind === "recording";
  const mine = takes.filter((t) => t.exampleId === material.id);

  const toggleRecord = async () => {
    if (recording) {
      const result = await recorder.stop();
      if (withOriginal) usePlayer.getState().setPlaying(false);
      if (result) {
        await addTake({
          id: crypto.randomUUID(),
          lesson: lesson.no,
          exampleId: material.id,
          createdAt: Date.now(),
          durationSec: result.durationSec,
          blob: result.blob,
        });
        await reload();
      }
      return;
    }
    setElapsed(0);
    if (!withOriginal) usePlayer.getState().setPlaying(false);
    const ok = await recorder.start();
    if (ok && withOriginal) usePlayer.getState().playQueue([track]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {materials.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setSelectedId(e.id)}
            disabled={recording}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              e.id === material.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-soft",
            )}
          >
            {KIND_LABEL[e.kind]}
          </button>
        ))}
      </div>

      <PlayCard
        title="원음 듣기"
        note={KIND_LABEL[material.kind]}
        durationSec={material.durationSec}
        count={listens[material.id]}
        playing={now.item === material.id && now.playing}
        onPress={() => play([track])}
      />

      <ol className="max-h-52 space-y-3 overflow-y-auto rounded-2xl bg-bg-sunken p-4">
        {material.sentences.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 대본 차례가 곧 열쇠다
          <li key={i}>
            <RubyText
              text={s.ja}
              reading={material.kind === "words" ? s.reading : undefined}
              glossary={glossary}
              className="block text-xl leading-loose"
            />
            <span className="block text-sm text-ink-faint">{s.ko}</span>
          </li>
        ))}
      </ol>

      {recorder.state.kind === "error" ? (
        <p role="alert" className="rounded-2xl bg-accent-soft p-4 text-sm">
          {MIC_HELP[recorder.state.error]}
        </p>
      ) : null}

      <button
        type="button"
        onClick={toggleRecord}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-lg font-medium",
          recording ? "bg-accent text-white" : "bg-bg-raised text-accent",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-current",
            recording && "animate-pulse rounded-sm",
          )}
        />
        {recording ? `녹음 끝내기 · ${Math.floor(elapsed)}초` : "녹음하기"}
      </button>

      <label className="flex items-center gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={withOriginal}
          onChange={(e) => setWithOriginal(e.target.checked)}
          disabled={recording}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        원음을 틀면서 녹음(이어폰을 끼고 겹쳐 말하기)
      </label>

      {mine.length > 0 ? (
        <section>
          <h2 className="text-sm text-ink-faint">
            내 녹음(이 폰에만 있습니다)
          </h2>
          <ul className="mt-2 space-y-2">
            {mine.map((t) => (
              <TakeRow
                key={t.id}
                take={t}
                originalSrc={ilmutaMediaUrl(material.file)}
                onDelete={async () => {
                  await deleteTake(t.id);
                  await reload();
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** 녹음 하나: 내 목소리만, 또는 원음 다음에 내 목소리 */
function TakeRow({
  take,
  originalSrc,
  onDelete,
}: {
  take: Take;
  originalSrc: string;
  onDelete: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState<"mine" | "both" | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(take.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [take.blob]);

  const playSeq = (srcs: string[], mode: "mine" | "both") => {
    const a = audio.current;
    if (!a) return;
    if (playing === mode) {
      a.pause();
      setPlaying(null);
      return;
    }
    usePlayer.getState().setPlaying(false);
    let i = 0;
    const next = () => {
      if (i >= srcs.length) {
        setPlaying(null);
        return;
      }
      a.src = srcs[i++];
      a.play().catch(() => setPlaying(null));
    };
    a.onended = next;
    setPlaying(mode);
    next();
  };

  const time = new Date(take.createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center gap-2 rounded-2xl bg-bg-raised p-3">
      {/* biome-ignore lint/a11y/useMediaCaption: 내 목소리 녹음이라 자막이 없다 */}
      <audio ref={audio} />
      <span className="min-w-0 flex-1 text-sm">
        {time}
        <span className="ml-2 text-ink-faint">
          {Math.round(take.durationSec)}초
        </span>
      </span>
      <button
        type="button"
        disabled={!url}
        onClick={() => url && playSeq([url], "mine")}
        className="rounded-full bg-accent-soft px-3 py-2 text-sm text-accent"
      >
        {playing === "mine" ? "멈춤" : "내 목소리"}
      </button>
      <button
        type="button"
        disabled={!url}
        onClick={() => url && playSeq([originalSrc, url], "both")}
        className="rounded-full bg-accent-soft px-3 py-2 text-sm text-accent"
      >
        {playing === "both" ? "멈춤" : "원음→나"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="px-2 py-2 text-sm text-ink-faint"
        aria-label="녹음 지우기"
      >
        ✕
      </button>
    </li>
  );
}
