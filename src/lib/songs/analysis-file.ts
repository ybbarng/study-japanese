import path from "node:path";
import { contentDir, readJson } from "@/lib/textbook/load";
import { type SongAnalysis, songAnalysisSchema } from "./analysis";
import { isSlug } from "./schema";

// 노래 분석 파일(CONTENT_DIR/songs/<slug>.json)을 읽는다. 서버 컴포넌트만 부른다.

export type AnalysisLoad =
  | { status: "ok"; analysis: SongAnalysis }
  | { status: "none" }
  /** 파일은 있는데 모양이 틀렸거나 다른 노래의 분석이다(관리자에게 알린다) */
  | { status: "broken" };

export function songAnalysisPath(slug: string, dir = contentDir()): string {
  return path.join(dir, "songs", `${slug}.json`);
}

export function loadSongAnalysis(
  slug: string,
  dir: string = contentDir(),
): AnalysisLoad {
  if (!isSlug(slug)) return { status: "none" };
  try {
    const analysis = readJson(songAnalysisPath(slug, dir), songAnalysisSchema);
    if (!analysis) return { status: "none" };
    if (analysis.slug !== slug) return { status: "broken" };
    return { status: "ok", analysis };
  } catch {
    return { status: "broken" };
  }
}
