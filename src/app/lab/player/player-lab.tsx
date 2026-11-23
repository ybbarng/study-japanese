"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Track {
  src: string;
  title: string;
  album: string;
}

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

export function PlayerLab({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const hiddenAt = useRef<{ at: number; t: number } | null>(null);

  const add = useCallback(
    (line: string) => setLog((l) => [`${now()} ${line}`, ...l].slice(0, 40)),
    [],
  );
  const track = tracks[index];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + tracks.length) % tracks.length);
    },
    [tracks.length],
  );

  // 잠금 화면·알림·이어폰 버튼 조작(Media Session)
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      add("이 브라우저는 Media Session을 지원하지 않음");
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "にほんご",
      album: track.album,
      artwork: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
    const a = audioRef.current;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        "play",
        () => {
          add("잠금 화면: 재생");
          a?.play();
        },
      ],
      [
        "pause",
        () => {
          add("잠금 화면: 멈춤");
          a?.pause();
        },
      ],
      [
        "previoustrack",
        () => {
          add("잠금 화면: 이전");
          go(-1);
        },
      ],
      [
        "nexttrack",
        () => {
          add("잠금 화면: 다음");
          go(1);
        },
      ],
      [
        "seekbackward",
        (d) => {
          add("잠금 화면: 뒤로");
          if (a)
            a.currentTime = Math.max(0, a.currentTime - (d.seekOffset ?? 5));
        },
      ],
      [
        "seekforward",
        (d) => {
          add("잠금 화면: 앞으로");
          if (a) a.currentTime += d.seekOffset ?? 5;
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        add(`지원 안 함: ${action}`);
      }
    }
  }, [track, add, go]);

  // 트랙이 바뀌면 이어서 재생(백그라운드에서도 다음 곡으로 넘어가는지 시험)
  const autoplayNext = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: index가 바뀔 때마다 새 트랙을 불러와야 한다
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.load();
    if (autoplayNext.current)
      a.play().catch((e) => add(`재생 실패: ${e.name}`));
  }, [index, add]);

  // 화면을 끄거나 다른 앱으로 갔다가 돌아왔을 때 재생이 계속됐는지 기록
  useEffect(() => {
    const onVisibility = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        hiddenAt.current = { at: Date.now(), t: a.currentTime };
        add(`화면 숨김 (재생 위치 ${a.currentTime.toFixed(1)}초)`);
      } else if (hiddenAt.current) {
        const away = (Date.now() - hiddenAt.current.at) / 1000;
        const moved = a.currentTime - hiddenAt.current.t;
        add(
          `화면 돌아옴: ${away.toFixed(0)}초 동안 재생 위치가 ${moved.toFixed(0)}초 움직임 (트랙 바뀌면 음수)`,
        );
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [add]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <h1 className="text-sm text-ink-faint">
        재생 시험 · 잠금 화면 조작과 화면 끈 채 재생
      </h1>
      <section className="mt-8 rounded-3xl bg-bg-raised p-6">
        <p className="text-ink-soft text-sm">{track.album}</p>
        <p className="mt-1 text-2xl font-bold">{track.title}</p>
        <p className="mt-4 font-mono text-ink-soft">{time.toFixed(1)}초</p>
        {/* biome-ignore lint/a11y/useMediaCaption: 교재 오디오, 자막은 예문 글로 따로 보인다 */}
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onPlay={() => {
            setPlaying(true);
            autoplayNext.current = true;
            add(`재생: ${track.title}`);
          }}
          onPause={() => {
            setPlaying(false);
            add("멈춤");
          }}
          onEnded={() => {
            add("끝 → 다음 트랙");
            autoplayNext.current = true;
            go(1);
          }}
          onError={() =>
            add(`오디오 오류 (코드 ${audioRef.current?.error?.code})`)
          }
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(-1)}
            className="h-14 w-14 rounded-full bg-bg-sunken text-xl"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() =>
              playing ? audioRef.current?.pause() : audioRef.current?.play()
            }
            className="h-20 w-20 rounded-full bg-accent text-3xl text-white"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="h-14 w-14 rounded-full bg-bg-sunken text-xl"
          >
            ⏭
          </button>
        </div>
      </section>
      <ol className="mt-6 space-y-1 text-sm">
        {tracks.map((t, i) => (
          <li key={t.src}>
            <button
              type="button"
              onClick={() => {
                autoplayNext.current = true;
                setIndex(i);
              }}
              className={i === index ? "text-accent" : "text-ink-soft"}
            >
              {t.title}
            </button>
          </li>
        ))}
      </ol>
      <section className="mt-6">
        <h2 className="text-sm text-ink-faint">기록</h2>
        <ul className="mt-2 space-y-1 font-mono text-xs text-ink-soft">
          {log.map((l, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 쌓이기만 하는 기록
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
