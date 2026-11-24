import { ADJ_KIND_LABEL } from "@/lib/ilmunta/adjective";
import { GROUP_LABEL } from "@/lib/ilmunta/forms";
import type { CardState } from "@/lib/kana/srs";
import type { DrillKind } from "./entries";

// 낱말 화면의 "내 드릴 기록": 드릴 기록은 활용 갈래마다(verb:<꼴>:<그룹>, adj:<꼴>:<갈래>) 남는다.
// 낱말이 드는 갈래의 기록을 모두 더한다.

export function drillRecordOf(
  skills: Readonly<Record<string, CardState>>,
  drill: DrillKind,
): { label: string; reps: number; lapses: number } {
  const [prefix, suffix, label] =
    drill.kind === "verb"
      ? ["verb:", `:${drill.group}`, `${GROUP_LABEL[drill.group]} 동사`]
      : ["adj:", `:${drill.adjKind}`, ADJ_KIND_LABEL[drill.adjKind]];
  let reps = 0;
  let lapses = 0;
  for (const [key, card] of Object.entries(skills))
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      reps += card.reps;
      lapses += card.lapses;
    }
  return { label, reps, lapses };
}
