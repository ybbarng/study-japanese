"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageFrame, TwoColumn } from "@/components/shell/page-frame";
import { type LearnedIndex, learnedLessonOf } from "@/lib/songs/learned";
import { inLoop, LOOP_OFF, type LoopChoice } from "@/lib/songs/loop";
import type { Song } from "@/lib/songs/schema";
import { isKnown, knownCount, lineKey } from "@/lib/songs/study-state";
import { useSongsStudyStore } from "@/lib/songs/study-store";
import { lineIndexAt } from "@/lib/songs/timing";
import { groupTokens } from "@/lib/songs/words";
import { LyricLine } from "./lyric-line";
import { inputOf, saveSong } from "./save-song";
import { SongControls } from "./song-controls";
import { SongCredit } from "./song-credit";
import { useFollowLine } from "./use-follow-line";
import { useSongPlayback } from "./use-song-playback";
import { useSongsStudyReady } from "./use-songs-study";
import { WordDetail } from "./word-detail";

interface Props {
  song: Song;
  isAdmin: boolean;
  learned: LearnedIndex;
}

type Selected = { line: number; word: number } | null;

/**
 * 노래 가사 학습. 줄마다 일본어(후리가나)·낱말 누르기·익힘·메모.
 * 관리자는 노래를 틀면 지금 줄이 강조되며 따라 굴러가고, 줄을 누르면 그 줄부터, 반복을 쓴다.
 * PC: 왼쪽 가사, 오른쪽 곁칸에 재생 조절과 낱말 설명. 폰: 조절은 가사 위, 낱말 설명은 아래에서 올라온다.
 */
export function SongStudy({ song: initial, isAdmin, learned }: Props) {
  const [song, setSong] = useState(initial);
  const [showReading, setShowReading] = useState(true);
  const [covered, setCovered] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Selected>(null);
  const [loop, setLoop] = useState<LoopChoice>(LOOP_OFF);
  const [noteError, setNoteError] = useState<string | null>(null);

  const ready = useSongsStudyReady();
  const study = useSongsStudyStore((s) => s.data);
  const toggleKnown = useSongsStudyStore((s) => s.toggle);

  const words = useMemo(
    () => song.lines.map((l) => groupTokens(l.tokens ?? [])),
    [song.lines],
  );
  const lineKeys = useMemo(
    () => song.lines.map((l) => lineKey(l.ja)),
    [song.lines],
  );

  const playback = useSongPlayback(song, isAdmin ? loop : LOOP_OFF);
  const current =
    playback.pos === null ? -1 : lineIndexAt(song.lines, playback.pos);
  useFollowLine(current);

  const selectedWord = selected
    ? (words[selected.line]?.[selected.word] ?? null)
    : null;
  const learnedNo = selectedWord
    ? learnedLessonOf(selectedWord, learned)
    : null;
  const known = ready ? knownCount(study, song.slug, lineKeys) : 0;

  const saveNote = async (index: number, note: string) => {
    const lines = song.lines.map((l, i) => {
      if (i !== index) return l;
      const { note: _old, ...rest } = l;
      return note ? { ...rest, note } : rest;
    });
    const result = await saveSong(song.slug, { ...inputOf(song), lines });
    if (!result.ok) {
      setNoteError(result.error);
      return false;
    }
    setNoteError(null);
    setSong(result.song);
    return true;
  };

  const controls = (
    <SongControls
      slug={song.slug}
      lines={song.lines}
      isAdmin={isAdmin}
      playback={playback}
      current={current}
      showReading={showReading}
      onShowReading={setShowReading}
      covered={covered}
      onCovered={(on) => {
        setCovered(on);
        setRevealed(new Set());
        if (on) setSelected(null);
      }}
      loop={loop}
      onLoop={setLoop}
    />
  );
  const detail = <WordDetail word={selectedWord} learnedNo={learnedNo} />;

  const main = (
    <>
      <header>
        <Link href="/songs" className="text-sm text-ink-faint">
          ← 노래 목록
        </Link>
        <h1
          lang="ja"
          className="mt-3 font-ja-serif text-3xl font-bold lg:text-4xl"
        >
          {song.title}
        </h1>
        <p className="mt-1 text-ink-soft">
          {song.artist}
          <span className="ml-3 text-sm text-ink-faint">
            익힌 줄 {known}/{song.lines.length}
          </span>
          {isAdmin && !song.lyricsPublic ? (
            <span className="ml-3 text-sm text-warn">가사 비공개</span>
          ) : null}
        </p>
      </header>

      <div className="rounded-2xl bg-bg-sunken p-4 lg:hidden">{controls}</div>

      {noteError ? (
        <p role="alert" className="text-sm text-warn">
          {noteError}
        </p>
      ) : null}

      <ol aria-label="가사" className="flex flex-col gap-1">
        {song.lines.map((line, i) => (
          <LyricLine
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 글의 줄(후렴)이 여러 번 나와 차례를 열쇠로 쓴다
            key={i}
            line={line}
            index={i}
            words={words[i]}
            current={i === current}
            inLoop={inLoop(loop, i)}
            showReading={showReading}
            covered={covered && !revealed.has(i)}
            onReveal={() => setRevealed((r) => new Set(r).add(i))}
            selectedWord={selected?.line === i ? selected.word : -1}
            onSelectWord={(w) => setSelected({ line: i, word: w })}
            known={ready && isKnown(study, song.slug, line.ja)}
            onToggleKnown={() => toggleKnown(song.slug, line.ja)}
            onPlayFrom={
              isAdmin
                ? () => {
                    if (line.start !== undefined) playback.playFrom(line.start);
                  }
                : undefined
            }
            onSaveNote={isAdmin ? (note) => saveNote(i, note) : undefined}
          />
        ))}
      </ol>

      <SongCredit artist={song.artist} />
    </>
  );

  return (
    <PageFrame className="pb-40 lg:pb-28">
      <TwoColumn
        main={main}
        asideLabel="재생 조절과 낱말"
        aside={
          <>
            <div className="rounded-2xl bg-bg-sunken p-5">{controls}</div>
            <div className="min-h-0 overflow-y-auto rounded-2xl bg-bg-sunken p-5">
              {detail}
            </div>
          </>
        }
      />
      {selectedWord ? (
        <div className="fixed inset-x-0 bottom-24 z-30 px-3 lg:hidden">
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-bg-raised p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="float-right rounded-lg px-2 py-1 text-sm text-ink-faint"
              aria-label="낱말 설명 닫기"
            >
              닫기
            </button>
            {detail}
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
