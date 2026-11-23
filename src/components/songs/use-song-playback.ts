"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePlaybackClock, usePositionOf } from "@/lib/player/clock";
import { currentTrack, usePlayer } from "@/lib/player/store";
import { type LoopChoice, loopRange } from "@/lib/songs/loop";
import type { Song } from "@/lib/songs/schema";
import { loopBackTo } from "@/lib/songs/timing";
import { SONG_BOOK, songTrack } from "@/lib/songs/track";

export interface SongPlayback {
  /** 이 노래가 재생기에 올라 있을 때의 위치, 아니면 null */
  pos: number | null;
  duration: number;
  /** 이 노래를 틀고 있는지(재생기에 올라 있고 재생 중) */
  playing: boolean;
  /** 틀거나 멈춘다 */
  toggle: () => void;
  /** 그 위치부터 듣는다(아직 안 올라 있으면 먼저 튼다) */
  playFrom: (sec: number) => void;
}

/**
 * 사이트 재생기로 노래를 튼다. 재생 로직은 재생기(GlobalPlayer)에 두고,
 * 여기서는 대기열에 올리기·위치 옮기기·반복 구간 되돌리기만 한다.
 */
export function useSongPlayback(
  song: Pick<Song, "slug" | "title" | "artist" | "audioFile" | "lines">,
  loopChoice: LoopChoice,
): SongPlayback {
  const { slug, title, artist, audioFile } = song;
  const track = useMemo(
    () => songTrack({ slug, title, artist, audioFile }),
    [slug, title, artist, audioFile],
  );
  const pos = usePositionOf(SONG_BOOK, song.slug);
  const duration = usePlaybackClock((s) =>
    s.book === SONG_BOOK && s.item === song.slug ? s.duration : Number.NaN,
  );
  const onThis = usePlayer((s) => {
    const t = currentTrack(s);
    return t?.book === SONG_BOOK && t.item === song.slug;
  });
  const wantPlaying = usePlayer((s) => s.wantPlaying);
  const seekTo = usePlayer((s) => s.seekTo);
  const loop = useMemo(
    () => loopRange(song.lines, loopChoice, duration),
    [song.lines, loopChoice, duration],
  );
  // 다른 트랙이 올라 있을 때 누른 위치: 이 노래가 틀어지면 그 자리로 옮긴다
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (pos === null || pending.current === null) return;
    const sec = pending.current;
    pending.current = null;
    seekTo(sec);
  }, [pos, seekTo]);

  // 반복: 구간 끝에 닿으면 처음으로
  useEffect(() => {
    if (pos === null) return;
    const back = loopBackTo(loop, pos);
    if (back !== null) seekTo(back);
  }, [pos, loop, seekTo]);

  const toggle = useCallback(() => {
    const st = usePlayer.getState();
    if (onThis) st.setPlaying(!st.wantPlaying);
    else st.playQueue([track]);
  }, [onThis, track]);

  const playFrom = useCallback(
    (sec: number) => {
      if (onThis && pos !== null) seekTo(sec);
      else {
        pending.current = sec;
        if (onThis) usePlayer.getState().setPlaying(true);
        else usePlayer.getState().playQueue([track]);
      }
    },
    [onThis, pos, seekTo, track],
  );

  return { pos, duration, playing: onThis && wantPlaying, toggle, playFrom };
}
