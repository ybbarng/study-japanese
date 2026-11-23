import { connection } from "next/server";
import { loadIlmunta } from "@/lib/ilmunta/load";
import { loadIlmuntaMap } from "@/lib/ilmunta/server-data";
import { loadMapData } from "@/lib/ilmuta/server-data";
import { loadIlmuta } from "@/lib/textbook/load";
import { upcomingLessons } from "./auto";
import { ilmuntaPack, ilmutaPack, type OfflinePack } from "./pack";

// 자동 받기용: 책마다 이어서 할 강(과) 2개의 묶음. 들은 기록(서버 DB)으로 고른다.

export async function loadUpcomingPacks(): Promise<OfflinePack[]> {
  await connection();
  const out: OfflinePack[] = [];

  const ilmuta = loadIlmuta();
  const map = await loadMapData();
  if (ilmuta && map) {
    const done = new Set(
      map.rows.filter((r) => r.progress.lectureDone).map((r) => r.no),
    );
    const nos = upcomingLessons(
      map.rows.map((r) => r.no),
      (no) => done.has(no),
      null,
    );
    for (const no of nos) {
      const lesson = ilmuta.lessons.find((l) => l.no === no);
      if (lesson) out.push(ilmutaPack(lesson));
    }
  }

  const ilmunta = loadIlmunta();
  const imap = await loadIlmuntaMap();
  if (ilmunta && imap) {
    const done = new Set(
      imap.listens.filter((l) => l.heard >= l.total).map((l) => l.no),
    );
    const nos = upcomingLessons(
      imap.listens.map((l) => l.no),
      (no) => done.has(no),
      imap.resume,
    );
    for (const no of nos) {
      const lesson = ilmunta.lessons.find((l) => l.no === no);
      if (lesson) out.push(ilmuntaPack(lesson));
    }
  }
  return out;
}
