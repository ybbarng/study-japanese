import type { ItemSummary } from "@/lib/store/listen";
import type { IlmuntaLesson } from "@/lib/textbook/schema";

/**
 * 들은 기록의 열쇠: 강의는 파일 이름(`강의 mp3/L01-02.MP3` → `L01-02`), 예문은 예문 id(`01-1`).
 */
export function lectureItem(file: string): string {
  const base = file.split("/").at(-1) ?? file;
  return base.replace(/\.[^.]+$/, "");
}

export interface LessonListen {
  no: number;
  /** 끝까지 들은 강의 수 / 강의 수 */
  heard: number;
  total: number;
  /** 이 과 강의·예문을 마지막으로 들은 시각(없으면 0) */
  lastAt: number;
}

export function lessonListens(
  lessons: readonly IlmuntaLesson[],
  items: readonly ItemSummary[],
): LessonListen[] {
  const byItem = new Map(items.map((i) => [i.item, i]));
  return lessons.map((l) => {
    const lectureIds = l.lectures.map((x) => lectureItem(x.file));
    const ids = [...lectureIds, ...l.examples.map((e) => e.id)];
    return {
      no: l.no,
      heard: lectureIds.filter(
        (id) => (byItem.get(id)?.completedPlays ?? 0) > 0,
      ).length,
      total: lectureIds.length,
      lastAt: Math.max(0, ...ids.map((id) => byItem.get(id)?.lastAt ?? 0)),
    };
  });
}

/**
 * 이어서 할 과: 마지막으로 들은 과의 강의가 남았으면 그 과, 다 들었으면 다음 과.
 * 아무것도 안 들었으면 첫 과. 다 끝났으면 null.
 */
export function resumeLesson(listens: readonly LessonListen[]): number | null {
  if (listens.length === 0) return null;
  const sorted = [...listens].sort((a, b) => a.no - b.no);
  const last = sorted.reduce<LessonListen | null>(
    (best, l) => (l.lastAt > (best?.lastAt ?? 0) ? l : best),
    null,
  );
  if (!last) return sorted[0].no;
  if (last.heard < last.total) return last.no;
  const next = sorted.find((l) => l.no > last.no && l.heard < l.total);
  return next?.no ?? sorted.find((l) => l.heard < l.total)?.no ?? null;
}
