import { NextResponse } from "next/server";
import { loadIlmuntaMap } from "@/lib/ilmunta/server-data";
import { lectureTally } from "@/lib/ilmuta/progress";
import { loadMapData } from "@/lib/ilmuta/server-data";
import type { NavProgress } from "@/lib/shell/nav";

// PC 왼쪽 탐색에 붙는 책별 진도(강의를 끝까지 들은 강·과 수). 가나는 기기 진도라 화면이 직접 센다.
export async function GET() {
  const [ilmuta, ilmunta] = await Promise.all([
    loadMapData(),
    loadIlmuntaMap(),
  ]);
  const body: NavProgress = {};
  if (ilmuta) body.ilmuta = lectureTally(ilmuta.rows.map((r) => r.progress));
  if (ilmunta)
    body.ilmunta = {
      done: ilmunta.listens.filter((l) => l.total > 0 && l.heard >= l.total)
        .length,
      total: ilmunta.book.lessons.length,
    };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
