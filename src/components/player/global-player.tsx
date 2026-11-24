"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { recentSeek } from "@/components/context/use-cue-actions";
import { fetchTranscript } from "@/components/context/use-transcript";
import { isAdminClient } from "@/lib/auth/client";
import { transcriptCues } from "@/lib/context/cues";
import { abLoopStep, nextAbLoop } from "@/lib/player/ab-loop";
import { setPlaybackClock } from "@/lib/player/clock";
import { type PlayerHandles, usePlayerControls } from "@/lib/player/controls";
import { cueLoopStep, resolveLoopCue } from "@/lib/player/cue-loop";
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
    // 들은 기록은 관리자(암호로 로그인한 사람)의 학습 기록이다. 방문자 재생은 남기지 않는다
    if (!t || listened < 1 || !isAdminClient()) return;
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

  // 한 문장 반복: 문장 끝에서 쉬는 동안의 타이머
  const loopTimer = useRef<number | null>(null);
  const endLoopPause = useCallback(() => {
    if (loopTimer.current !== null) window.clearTimeout(loopTimer.current);
    loopTimer.current = null;
    setPlaybackClock({ loopPause: null });
  }, []);

  // 트랙 불러오기 (loadToken이 바뀔 때마다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadToken·index가 바뀔 때만 새로 불러온다
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;
    endLoopPause();
    finalize();
    setPhase({ kind: "track" });
    setSrc(a, track.src);
    a.playbackRate = s.rate;
    startedAt.current = Date.now();
    // 처음 자리가 있으면 새 파일의 길이를 안 뒤 옮긴다(불러오기 전에 옮기면 무시될 수 있다)
    const startAt = usePlayer.getState().startAt;
    const from = startAt?.token === s.loadToken ? startAt.sec : null;
    const seekStart = () => {
      if (from !== null) a.currentTime = from;
    };
    if (from !== null)
      a.addEventListener("loadedmetadata", seekStart, { once: true });
    if (s.wantPlaying)
      a.play().catch(() => usePlayer.getState().setPlaying(false));
    return () => a.removeEventListener("loadedmetadata", seekStart);
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

  // 자막 줄을 눌렀을 때: 지금 트랙의 그 위치로(따라 말하기 간격 중이면 무시).
  // 다시 그린 뒤(useEffect)가 아니라 요청이 store에 들어온 그 자리에서 옮긴다. 줄을 누르고 곧바로
  // L을 누르면 그 사이에 옮기기 전 위치로 반복을 골라, 옮긴 뒤 구간 밖이라며 반복이 풀렸다
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(
    () =>
      usePlayer.subscribe((st, prev) => {
        const req = st.seekRequest;
        const a = audioRef.current;
        const t = currentTrack(st);
        if (!req || req === prev.seekRequest || !a || !t) return;
        if (phaseRef.current.kind !== "track") return;
        if (!a.src) setSrc(a, t.src);
        a.currentTime = req.sec;
        if (a.paused)
          a.play().catch(() => usePlayer.getState().setPlaying(false));
      }),
    [setSrc],
  );

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

  /** 재생 위치가 바뀔 때마다: 문장 반복 중이면 끝에서 (쉬었다가) 처음으로 */
  const followLoop = useCallback(
    (a: HTMLAudioElement, pos: number) => {
      if (phase.kind !== "track" || !track || loopTimer.current !== null)
        return;
      const st = usePlayer.getState();
      const ab = abLoopStep(st.abLoop, {
        book: track.book,
        item: track.item,
        pos,
      });
      if (ab.kind === "clear") st.setAbLoop(null);
      if (ab.kind === "back") {
        a.currentTime = ab.to;
        return;
      }
      const step = cueLoopStep(
        st.cueLoop,
        { book: track.book, item: track.item, pos },
        st.shadowGap,
      );
      if (step.kind === "clear") st.setCueLoop(null);
      if (step.kind !== "back" || !st.cueLoop) return;
      const start = st.cueLoop.start;
      if (step.pauseSec === 0) {
        a.currentTime = start;
        return;
      }
      // 따라 말할 틈: 잠깐 멈췄다가 문장 처음부터. 이 멈춤은 사용자가 멈춘 것이 아니다
      switching.current = true;
      a.pause();
      setPlaybackClock({ loopPause: step.pauseSec });
      loopTimer.current = window.setTimeout(() => {
        loopTimer.current = null;
        setPlaybackClock({ loopPause: null });
        a.currentTime = start;
        if (usePlayer.getState().wantPlaying)
          a.play().catch(() => usePlayer.getState().setPlaying(false));
        else switching.current = false;
      }, step.pauseSec * 1000);
    },
    [phase.kind, track],
  );

  // 쉬는 중에 반복을 풀거나 다른 문장으로 옮기면: 쉬기를 그만두고 바로 이어 듣는다
  const cueLoop = s.cueLoop;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 반복 구간이 바뀔 때만 따른다
  useEffect(() => {
    if (loopTimer.current === null) return;
    endLoopPause();
    const a = audioRef.current;
    if (cueLoop && a) a.currentTime = cueLoop.start;
    if (a && usePlayer.getState().wantPlaying)
      a.play().catch(() => usePlayer.getState().setPlaying(false));
  }, [cueLoop]);

  /** L 키: 지금(또는 방금) 듣는 자막 문장을 되풀이하거나 푼다 */
  const toggleLoopHere = useCallback(async () => {
    const st = usePlayer.getState();
    const t = currentTrack(st);
    const a = audioRef.current;
    if (!t || !a || phase.kind !== "track") return;
    if (st.cueLoop) {
      endLoopPause();
      st.setCueLoop(null);
      return;
    }
    const transcript = await fetchTranscript(t.book, t.item);
    if (!transcript) return;
    const cues = transcriptCues(transcript);
    // 자막 줄을 누른 직후(mp3가 줄 시작보다 조금 앞에 내려앉아도)는 그 줄을,
    // 막 다음 문장으로 넘어간 순간이면 화면에 보이던 앞 문장을 잡는다
    const i = resolveLoopCue(cues, a.currentTime, { seek: recentSeek() });
    if (i < 0) return;
    st.setCueLoop({
      book: t.book,
      item: t.item,
      start: cues[i].start,
      end: cues[i].end,
    });
  }, [phase.kind, endLoopPause]);

  /** A–B 구간: 지금 위치로 시작 찍기 → 끝 찍기 → 풀기 */
  const markAb = useCallback(() => {
    const st = usePlayer.getState();
    const t = currentTrack(st);
    const a = audioRef.current;
    if (!t || !a || phase.kind !== "track") return;
    endLoopPause();
    st.setAbLoop(
      nextAbLoop(st.abLoop, { book: t.book, item: t.item, pos: a.currentTime }),
    );
  }, [phase.kind, endLoopPause]);

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

  // 화면 안 재생기(강 화면 위에 붙은 것)에 손잡이를 빌려준다. 손잡이는 한 번만 내주고
  // 부를 때마다 지금 그린 차례의 함수로 이어 준다(재생 위치가 바뀔 때마다 새로 내주지 않게)
  const live = useRef<PlayerHandles | null>(null);
  live.current = {
    toggle: () => {
      const st = usePlayer.getState();
      st.setPlaying(!st.wantPlaying);
    },
    prev,
    next: advance,
    seek: (t) => {
      if (audioRef.current) audioRef.current.currentTime = t;
    },
    seekBy,
    loop: () => void toggleLoopHere(),
    markAb,
  };
  useEffect(() => {
    usePlayerControls.setState({
      handles: {
        toggle: () => live.current?.toggle(),
        prev: () => live.current?.prev(),
        next: () => live.current?.next(),
        seek: (t) => live.current?.seek(t),
        seekBy: (d) => live.current?.seekBy(d),
        loop: () => live.current?.loop(),
        markAb: () => live.current?.markAb(),
      },
    });
    return () => usePlayerControls.setState({ handles: null });
  }, []);
  const gapTotal = phase.kind === "gap" ? phase.total : null;
  useEffect(() => {
    usePlayerControls.setState({ paused, gap: gapTotal });
  }, [paused, gapTotal]);

  // PC 키보드 단축키(재생 로직은 위 손잡이를 그대로 부른다)
  usePlayerShortcuts({
    hasTrack: !!track && !onLoginPage,
    // 화면의 paused는 다시 그린 뒤에야 바뀌어, 키를 빨리 두 번 누르면 놓친다. 원하는 상태를 바로 뒤집는다
    onToggle: () => {
      const st = usePlayer.getState();
      st.setPlaying(!st.wantPlaying);
    },
    onSeekBy: seekBy,
    onPrev: prev,
    onNext: advance,
    onLoop: () => void toggleLoopHere(),
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
          followLoop(e.currentTarget, t);
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
