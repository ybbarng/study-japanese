import { connection } from "next/server";
import { isAdminRequest } from "@/lib/auth/server";
import { canSeeSource, sourceOfBook } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";
import { getSong, listSongs, toSummary } from "@/lib/store/songs";
import { loadIlmuta } from "@/lib/textbook/load";
import { type MergedAnalysis, mergeAnalysis } from "./analysis";
import { loadSongAnalysis } from "./analysis-file";
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
  /** 세션이 쓴 분석(content/songs/<slug>.json)을 가사 줄과 합친 것 */
  analysis: MergedAnalysis;
  /** 분석 파일이 있는데 모양이 틀림(관리자에게 알린다) */
  analysisBroken: boolean;
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
  // 분석은 가사 줄과 합쳐(가사 글을 잘라 낸 조각) 가사를 볼 수 있는 사람에게만 보낸다(위에서 canSeeLyrics로 걸렀다).
  // 지문(sha256)을 서버에서 계산하므로 합치기도 여기서 한다
  const loaded = loadSongAnalysis(slug);
  const analysis = mergeAnalysis(
    song.lines,
    loaded.status === "ok" ? loaded.analysis : null,
  );
  const book = ilmutaVisible && analysis.analyzed ? loadIlmuta() : null;
  const learned = book
    ? learnedForSong(analysis.byLine, buildLearnedIndex(book.lessons))
    : {};
  // 방문자에게는 노래 파일 이름을 보내지 않는다(재생은 관리자만)
  const shown = isAdmin ? song : { ...song, audioFile: "" };
  return {
    song: shown,
    isAdmin,
    learned,
    analysis,
    analysisBroken: loaded.status === "broken",
  };
}
