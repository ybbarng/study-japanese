import { connection } from "next/server";
import { isAdminRequest } from "@/lib/auth/server";
import { canSeeSource, sourceOfBook } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";
import { getSong, listSongs, toSummary } from "@/lib/store/songs";
import { loadIlmuta } from "@/lib/textbook/load";
import {
  buildLearnedIndex,
  type LearnedIndex,
  learnedForSong,
} from "./learned";
import { canSeeLyrics, type Song, type SongSummary } from "./schema";

// 노래 화면(서버 컴포넌트)이 쓰는 데이터. 요청 때마다 DB를 읽는다.

export async function loadSongList(): Promise<{
  songs: SongSummary[];
  isAdmin: boolean;
}> {
  await connection();
  const isAdmin = await isAdminRequest();
  const songs = listSongs(getDb())
    .filter((s) => canSeeLyrics(s, isAdmin))
    .map(toSummary);
  return { songs, isAdmin };
}

export interface SongPageData {
  song: Song;
  isAdmin: boolean;
  /** 이 노래 낱말 중 일무따에서 배운 것 → 강 */
  learned: LearnedIndex;
}

/** 없거나 볼 수 없으면 null(공개하지 않은 노래는 있는지도 알리지 않는다) */
export async function loadSongPage(slug: string): Promise<SongPageData | null> {
  await connection();
  const isAdmin = await isAdminRequest();
  const db = getDb();
  const song = getSong(db, slug);
  if (!song || !canSeeLyrics(song, isAdmin)) return null;
  // 일무따 교재를 닫아 두었으면(설정) 방문자에게는 배운 강 표시도 하지 않는다
  const ilmutaVisible = canSeeSource(
    sourceOfBook("ilmuta"),
    isAdmin,
    readSiteSettings(db),
  );
  const book = ilmutaVisible ? loadIlmuta() : null;
  const learned = book
    ? learnedForSong(song.lines, buildLearnedIndex(book.lessons))
    : {};
  // 방문자에게는 노래 파일 이름을 보내지 않는다(재생은 관리자만)
  const shown = isAdmin ? song : { ...song, audioFile: "" };
  return { song: shown, isAdmin, learned };
}
