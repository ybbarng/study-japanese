"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { linesFromText, lyricsText, splitLyrics } from "@/lib/songs/lyrics";
import {
  AUDIO_FILE_PATTERN,
  MAX_LINES,
  SLUG_PATTERN,
  type Song,
} from "@/lib/songs/schema";
import { saveSong } from "./save-song";

interface Props {
  /** 고칠 노래(없으면 새로 넣기) */
  song?: Song;
}

const field =
  "w-full rounded-xl border border-line bg-bg-sunken px-3 py-2 text-base";

/**
 * 노래 넣기·고치기. 가사는 관리자가 붙여 넣는다(줄 단위, 빈 줄은 버린다).
 * 가사를 고쳐도 글이 그대로인 줄의 박자·메모는 남는다(linesFromText).
 */
export function SongForm({ song }: Props) {
  const router = useRouter();
  const creating = !song;
  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [slug, setSlug] = useState(song?.slug ?? "");
  const [audioFile, setAudioFile] = useState(song?.audioFile ?? "");
  const [lyrics, setLyrics] = useState(song ? lyricsText(song.lines) : "");
  const [lyricsPublic, setLyricsPublic] = useState(song?.lyricsPublic ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lineCount = splitLyrics(lyrics).length;
  const fileName = audioFile || (slug ? `${slug}.mp3` : "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!SLUG_PATTERN.test(slug))
      return setError("주소 이름은 영문 소문자·숫자·하이픈으로 쓰세요.");
    if (!AUDIO_FILE_PATTERN.test(fileName))
      return setError(
        "오디오 파일 이름은 영문·숫자·.-_ 로 쓰고 .mp3나 .m4a로 끝나야 합니다.",
      );
    if (lineCount === 0) return setError("가사를 붙여 넣으세요.");
    if (lineCount > MAX_LINES)
      return setError(`가사는 ${MAX_LINES}줄까지 넣을 수 있습니다.`);
    setError(null);
    setBusy(true);
    const lines = linesFromText(lyrics, song?.lines ?? []);
    const result = await saveSong(
      slug,
      { title, artist, audioFile: fileName, lyricsPublic, lines },
      { create: creating },
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    router.push(`/songs/${result.song.slug}`);
    router.refresh();
  };

  const remove = async () => {
    if (!song || !window.confirm(`「${song.title}」을 지울까요?`)) return;
    setBusy(true);
    const res = await fetch(`/api/songs/${song.slug}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(`지우지 못했습니다(${res.status}).`);
    router.push("/songs");
    router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="song-lyrics" className="text-sm text-ink-soft">
          가사 붙여 넣기 · 한 줄이 한 줄({lineCount}줄)
        </label>
        <textarea
          id="song-lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={18}
          lang="ja"
          placeholder="가사를 줄마다 붙여 넣으세요. 빈 줄은 버립니다."
          className={`${field} font-ja-serif text-lg leading-relaxed lg:min-h-[60dvh]`}
        />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-10">
        <Field label="제목" id="song-title">
          <input
            id="song-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            lang="ja"
            className={field}
          />
        </Field>
        <Field label="가수" id="song-artist">
          <input
            id="song-artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
            maxLength={100}
            className={field}
          />
        </Field>
        <Field
          label="주소 이름(slug)"
          id="song-slug"
          hint={
            creating
              ? "영문 소문자·숫자·하이픈. 주소가 /songs/이름 이 됩니다."
              : "주소 이름은 바꿀 수 없습니다."
          }
        >
          <input
            id="song-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            readOnly={!creating}
            maxLength={48}
            className={field}
          />
        </Field>
        <Field
          label="오디오 파일 이름"
          id="song-audio"
          hint={`서버 media/songs/ 폴더에 둔 파일 이름. 비우면 ${slug || "이름"}.mp3`}
        >
          <input
            id="song-audio"
            value={audioFile}
            onChange={(e) => setAudioFile(e.target.value)}
            placeholder={slug ? `${slug}.mp3` : "lemon.mp3"}
            maxLength={84}
            className={field}
          />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
          <input
            type="checkbox"
            checked={lyricsPublic}
            onChange={(e) => setLyricsPublic(e.target.checked)}
            className="mt-1"
          />
          <span>
            가사 공개
            <span className="block text-xs text-ink-faint">
              끄면 가사 화면도 로그인한 사람만 봅니다. 노래 재생은 언제나
              로그인한 사람만.
            </span>
          </span>
        </label>

        {error ? (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-accent px-5 py-3 font-medium text-white disabled:opacity-60"
          >
            저장
          </button>
          {song ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-xl px-4 py-3 text-sm text-warn hover:bg-bg-raised"
            >
              노래 지우기
            </button>
          ) : null}
        </div>
        <p role="status" className="min-h-5 text-sm text-ink-soft">
          {busy ? "저장 중…" : ""}
        </p>
        <p className="text-xs leading-relaxed text-ink-faint">
          읽는 법·낱말 뜻·문법 메모는 저장한 뒤 세션에 "이 노래 분석해 줘"라고
          하면 세션이 분석해 서버에 올립니다. 가사를 고치면 바뀐 줄은 다시
          분석해야 합니다.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink-soft">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
