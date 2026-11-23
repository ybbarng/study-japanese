import type { Script } from "@/lib/kana/data";

// 가나 → 일무따 다리: 가나 레슨 몇 개를 마치면 열리는 "첫 읽기" 레슨.
// 고립 암기는 잊으니, 글자를 익히자마자 일무따 예문을 배운 글자로 바로 읽게 한다.

export interface Bridge {
  /** 가나 진도(`KanaData.lessons`)에 끝낸 표시로 남는 id */
  id: string;
  /** 이 가나 레슨을 마치면 열린다 */
  after: string;
  title: string;
  /** 레슨 목록에 짧게 보일 말 */
  glyphs: string;
  script: Script;
  /** 문장을 고를 일무따 강 */
  lessonNos: readonly number[];
  maxPerLesson: number;
  /** 이 글자가 든 문장만(가타카나 다리는 외래어 문장만) */
  mustInclude?: Script;
}

export const BRIDGES: readonly Bridge[] = [
  {
    id: "read-h",
    after: "h5",
    title: "첫 읽기 · 일무따 1~3강 문장",
    glyphs: "よむ",
    script: "hira",
    lessonNos: [1, 2, 3],
    maxPerLesson: 8,
  },
  {
    id: "read-k",
    after: "k5",
    title: "가타카나 읽기 · 일무따 외래어 문장",
    glyphs: "ヨム",
    script: "kata",
    lessonNos: [2, 3, 4, 5, 6],
    maxPerLesson: 3,
    mustInclude: "kata",
  },
];

export const BRIDGE_BY_ID: ReadonlyMap<string, Bridge> = new Map(
  BRIDGES.map((b) => [b.id, b]),
);

/** 이 다리가 열렸는지(앞 가나 레슨을 마쳤는지) */
export function isBridgeOpen(
  bridge: Bridge,
  completed: ReadonlySet<string>,
): boolean {
  return completed.has(bridge.after);
}

export type ListEntry<L extends { id: string }> =
  | { kind: "lesson"; lesson: L }
  | { kind: "bridge"; bridge: Bridge };

/** 가나 레슨 목록 사이에 다리를 끼운다(다리가 열리는 레슨 바로 뒤) */
export function withBridges<L extends { id: string }>(
  lessons: readonly L[],
): ListEntry<L>[] {
  return lessons.flatMap((lesson) => [
    { kind: "lesson" as const, lesson },
    ...BRIDGES.filter((b) => b.after === lesson.id).map((bridge) => ({
      kind: "bridge" as const,
      bridge,
    })),
  ]);
}

/** 열렸는데 아직 안 한 다리(앞의 것부터). 없으면 null */
export function nextBridge(completed: ReadonlySet<string>): Bridge | null {
  return (
    BRIDGES.find((b) => isBridgeOpen(b, completed) && !completed.has(b.id)) ??
    null
  );
}
