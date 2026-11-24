import { connection } from "next/server";
import { visibleBooks } from "@/lib/context/server";
import { loadIlmuntaMap } from "@/lib/ilmunta/server-data";
import { pendingWriting, pickContinue } from "@/lib/ilmuta/continue";
import { redactIlmutaLesson } from "@/lib/ilmuta/redact";
import { loadMapData } from "@/lib/ilmuta/server-data";
import { emptyKanaData, type KanaData, parseKanaData } from "@/lib/kana/state";
import { KANA_SYNC_KEY } from "@/lib/kana/sync";
import { getDb } from "@/lib/store/db";
import { listAllListenEvents } from "@/lib/store/listen";
import { getState } from "@/lib/store/state";
import { loadIlmuta } from "@/lib/textbook/load";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { listenDays, listenedSecToday } from "./listening";

// 첫 화면(서버 컴포넌트)이 쓰는 데이터. 클라이언트로 넘기므로 모두 직렬화되는 값으로 둔다.

export interface HomeData {
  nowMs: number;
  /** 서버에 맞춰 둔 가나 진도. 기기 진도를 읽기 전과 새 기기에서 쓴다 */
  serverKana: KanaData;
  ilmuta: {
    pick: ReturnType<typeof pickContinue>;
    lectureDone: number[];
    nextListen: number | null;
    pendingWriting: number[];
    titles: { no: number; title: string; titleKo?: string }[];
    /** 첫 화면에서 바로 틀 수 있게 넘기는 강(이어 들을 강) */
    playable: IlmutaLesson[];
  } | null;
  ilmunta: {
    resume: number | null;
    done: number[];
    titles: { no: number; title: string }[];
  } | null;
  listen: { todaySec: number; days: string[] };
}

function readServerKana(): KanaData {
  const doc = getState(getDb(), KANA_SYNC_KEY);
  if (!doc) return emptyKanaData();
  try {
    return {
      ...parseKanaData(JSON.stringify(doc.value)),
      updatedAt: doc.updatedAt,
    };
  } catch {
    return emptyKanaData();
  }
}

async function loadIlmutaPart(nowMs: number): Promise<HomeData["ilmuta"]> {
  const map = await loadMapData();
  const book = loadIlmuta();
  if (!map || !book) return null;
  const visible = (await visibleBooks())("ilmuta");
  const progress = map.rows.map((r) => r.progress);
  const pick = pickContinue(progress, nowMs);
  const nextListen = progress.find((p) => !p.lectureDone)?.no ?? null;
  const playNos = new Set(
    [pick.kind === "listen" ? pick.no : null, nextListen].filter(
      (n): n is number => n !== null,
    ),
  );
  return {
    pick,
    lectureDone: progress.filter((p) => p.lectureDone).map((p) => p.no),
    nextListen,
    pendingWriting: pendingWriting(progress),
    titles: map.rows.map((r) => ({
      no: r.no,
      title: r.title,
      ...(r.titleKo ? { titleKo: r.titleKo } : {}),
    })),
    // 교재 출처를 닫았으면(설정) 방문자에게는 소책자 글을 뺀 강을 넘긴다(오디오는 /media가 막는다)
    playable: book.lessons
      .filter((l) => playNos.has(l.no))
      .map((l) => (visible ? l : redactIlmutaLesson(l))),
  };
}

async function loadIlmuntaPart(): Promise<HomeData["ilmunta"]> {
  const map = await loadIlmuntaMap();
  if (!map) return null;
  return {
    resume: map.resume,
    done: map.listens
      .filter((l) => l.total > 0 && l.heard >= l.total)
      .map((l) => l.no),
    titles: map.book.lessons.map((l) => ({ no: l.no, title: l.title })),
  };
}

export async function loadHomeData(nowMs: number): Promise<HomeData> {
  await connection();
  const events = listAllListenEvents(getDb());
  return {
    nowMs,
    serverKana: readServerKana(),
    ilmuta: await loadIlmutaPart(nowMs),
    ilmunta: await loadIlmuntaPart(),
    listen: {
      todaySec: listenedSecToday(events, nowMs),
      days: listenDays(events),
    },
  };
}
