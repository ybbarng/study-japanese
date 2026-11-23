"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { setPlaybackClock } from "@/lib/player/clock";
import {
  isCompleted,
  type ListenMeter,
  newMeter,
  resetPosition,
  tick,
} from "@/lib/player/listen-meter";
import { nextIndex, prevAction, shadowGapSec } from "@/lib/player/queue";
import { silenceWav } from "@/lib/player/silence";
import { currentTrack, usePlayer } from "@/lib/player/store";
import { enqueue, flushQueue } from "@/lib/sync/listen-queue";
import { NowPlaying } from "./now-playing";
import { ShortcutHelp } from "./shortcut-help";
import { usePlayerShortcuts } from "./use-player-shortcuts";

type Phase = { kind: "track" } | { kind: "gap"; total: number };

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const s = usePlayer();
  const track = currentTrack(s);
  // 로그인 전에는 오디오를 받을 수 없으니 막대를 보이지 않는다
  const onLoginPage = usePathname() === "/login";
  const [phase, setPhase] = useState<Phase>({ kind: "track" });
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [paused, setPaused] = useState(true);
  const meter = useRef<ListenMeter>(newMeter());
  const startedAt = useRef<number>(0);
  const silenceUrl = useRef<string | null>(null);
  // src를 바꾸는 동안 브라우저가 보내는 멈춤 이벤트를 사용자 멈춤으로 보지 않는다
  const switching = useRef(false);
  const setSrc = useCallback((a: HTMLAudioElement, src: string) => {
    switching.current = true;
    a.src = src;
  }, []);

  // 지금 트랙의 들은 시간을 기록 대기열에 넣는다
  const finalize = useCallback(() => {
    const t = currentTrack(usePlayer.getState());
    const a = audioRef.current;
    const listened = meter.current.listenedSec;
    meter.current = newMeter();
    if (!t || listened < 1) return;
    enqueue({
      clientId: crypto.randomUUID(),
      book: t.book,
      item: t.item,
      kind: t.kind,
      startedAt: startedAt.current,
      listenedSec: Math.round(listened * 10) / 10,
      completed: isCompleted(listened, a?.duration ?? Number.NaN),
    });
    void flushQueue();
  }, []);

  // 트랙 불러오기 (loadToken이 바뀔 때마다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadToken·index가 바뀔 때만 새로 불러온다
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;
    finalize();
    setPhase({ kind: "track" });
    setSrc(a, track.src);
    a.playbackRate = s.rate;
    startedAt.current = Date.now();
    if (s.wantPlaying)
      a.play().catch(() => usePlayer.getState().setPlaying(false));
  }, [s.loadToken, s.index]);

  // 재생/멈춤 요청 맞추기
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;
    if (s.wantPlaying && a.paused) {
      if (!a.src) setSrc(a, track.src);
      a.play().catch(() => usePlayer.getState().setPlaying(false));
    } else if (!s.wantPlaying && !a.paused) {
      a.pause();
    }
  }, [s.wantPlaying, track, setSrc]);

  useEffect(() => {
    if (audioRef.current && phase.kind === "track")
      audioRef.current.playbackRate = s.rate;
  }, [s.rate, phase.kind]);

  // 자막 줄을 눌렀을 때: 지금 트랙의 그 위치로(따라 말하기 간격 중이면 무시)
  const seekRequest = s.seekRequest;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 요청이 새로 올 때만 따른다(간격 상태가 바뀌었다고 다시 옮기지 않게)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !seekRequest || phase.kind !== "track") return;
    a.currentTime = seekRequest.sec;
    if (a.paused) a.play().catch(() => usePlayer.getState().setPlaying(false));
  }, [seekRequest]);

  const advance = useCallback(() => {
    const st = usePlayer.getState();
    const n = nextIndex(st.index, st.queue.length, st.repeat);
    if (n === null) {
      st.setPlaying(false);
      setPhase({ kind: "track" });
      return;
    }
    if (n === st.index) st.restart();
    else st.jump(n);
  }, []);

  const onEnded = useCallback(() => {
    const a = audioRef.current;
    const st = usePlayer.getState();
    const t = currentTrack(st);
    if (!a || !t) return;
    if (phase.kind === "gap") {
      advance();
      return;
    }
    finalize();
    const gap = shadowGapSec(t, a.duration, st.shadowGap);
    if (gap > 0) {
      if (silenceUrl.current) URL.revokeObjectURL(silenceUrl.current);
      silenceUrl.current = URL.createObjectURL(
        new Blob([silenceWav(gap)], { type: "audio/wav" }),
      );
      setPhase({ kind: "gap", total: gap });
      a.playbackRate = 1;
      setSrc(a, silenceUrl.current);
      a.play().catch(() => advance());
      return;
    }
    advance();
  }, [phase.kind, advance, finalize, setSrc]);

  /** 자막·맥락 화면이 읽는 재생 위치. 따라 말하기 간격 중에는 트랙을 비운다 */
  const publishClock = useCallback(
    (pos: number) => {
      const t = phase.kind === "track" ? track : undefined;
      setPlaybackClock({
        book: t?.book ?? null,
        item: t?.item ?? null,
        pos,
      });
    },
    [phase.kind, track],
  );

  const prev = useCallback(() => {
    const a = audioRef.current;
    const st = usePlayer.getState();
    const action = prevAction(
      st.index,
      phase.kind === "gap" ? 0 : (a?.currentTime ?? 0),
    );
    if ("restart" in action) st.restart();
    else st.jump(action.index);
  }, [phase.kind]);

  const seekBy = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(
      0,
      Math.min((a.duration || 0) - 0.1, a.currentTime + delta),
    );
  }, []);

  // 잠금 화면·알림·이어폰 버튼
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:
        phase.kind === "gap" ? `따라 말하기 — ${track.title}` : track.title,
      artist: track.subtitle ?? "にほんご",
      album: "にほんご",
      artwork: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
    const st = usePlayer.getState();
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => st.setPlaying(true)],
      ["pause", () => st.setPlaying(false)],
      ["previoustrack", prev],
      ["nexttrack", advance],
      ["seekbackward", (d) => seekBy(-(d.seekOffset ?? 5))],
      ["seekforward", (d) => seekBy(d.seekOffset ?? 5)],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // 지원하지 않는 동작
      }
    }
  }, [track, phase.kind, prev, advance, seekBy]);

  // 앱을 닫거나 다른 앱으로 넘어갈 때 기록을 보낸다
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        if (audioRef.current?.paused) finalize();
        void flushQueue();
      } else {
        // 화면이 꺼진 채 다시 연결되면 online 이벤트를 놓칠 수 있어, 돌아올 때도 보낸다
        void flushQueue();
      }
    };
    const onOnline = () => void flushQueue();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", finalize);
    window.addEventListener("online", onOnline);
    void flushQueue();
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", finalize);
      window.removeEventListener("online", onOnline);
    };
  }, [finalize]);

  // PC 키보드 단축키(재생 로직은 위 손잡이를 그대로 부른다)
  usePlayerShortcuts({
    hasTrack: !!track && !onLoginPage,
    onToggle: () => s.setPlaying(paused),
    onSeekBy: seekBy,
    onPrev: prev,
    onNext: advance,
  });

  return (
    <>
      <ShortcutHelp />
      {/* biome-ignore lint/a11y/useMediaCaption: 예문 글은 재생 화면에 따로 보인다 */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlaying={() => {
          switching.current = false;
        }}
        onPlay={() => {
          setPaused(false);
          if (!usePlayer.getState().wantPlaying)
            usePlayer.getState().setPlaying(true);
        }}
        onPause={() => {
          setPaused(true);
          meter.current = resetPosition(meter.current);
          if (switching.current) return;
          if (usePlayer.getState().wantPlaying && !audioRef.current?.ended)
            usePlayer.getState().setPlaying(false);
        }}
        onSeeking={() => {
          meter.current = resetPosition(meter.current);
        }}
        onEnded={onEnded}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (phase.kind === "track")
            setPlaybackClock({ duration: e.currentTarget.duration });
        }}
        onSeeked={(e) => publishClock(e.currentTarget.currentTime)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setPos(t);
          publishClock(t);
          if (phase.kind === "track") meter.current = tick(meter.current, t);
        }}
      />
      {track && !onLoginPage ? (
        <NowPlaying
          track={track}
          index={s.index}
          queueLength={s.queue.length}
          paused={paused}
          pos={pos}
          duration={duration}
          gap={phase.kind === "gap" ? phase.total : null}
          onToggle={() => s.setPlaying(paused)}
          onPrev={prev}
          onNext={advance}
          onSeek={(t) => {
            if (audioRef.current) audioRef.current.currentTime = t;
          }}
          onSeekBy={seekBy}
        />
      ) : null}
    </>
  );
}
