import {
  ADJ_FORM_INFO,
  ADJ_KIND_LABEL,
  type AdjFormId,
  type AdjKind,
} from "./adjective";
import type { VerbFormId, VerbGroup } from "./conjugate";
import { GROUP_LABEL, VERB_FORM_INFO } from "./forms";
import { PATTERN_BY_ID, PATTERNS } from "./patterns";

/**
 * 드릴·시험이 묻는 것 하나(활용형 × 갈래 등)를 "기술(skill)"이라 부른다.
 * 약점 추적은 기술마다 한다. 기술은 그것을 다루는 과(lessons)에서 열린다.
 * 과 번호와 활용형의 짝은 교재 차례를 보고 세션이 정했다(교재 글은 옮기지 않음).
 */
export type Skill =
  | {
      key: string;
      kind: "verb";
      form: VerbFormId;
      group: VerbGroup;
      lessons: number[];
    }
  | {
      key: string;
      kind: "adj";
      form: AdjFormId;
      adjKind: AdjKind;
      lessons: number[];
    }
  | { key: string; kind: "pattern"; patternId: string; lessons: number[] }
  | {
      key: string;
      kind: "transitive";
      direction: "toTransitive" | "toIntransitive";
      lessons: number[];
    }
  | {
      key: string;
      kind: "keigo";
      which: "honorific" | "humble";
      lessons: number[];
    }
  | { key: string; kind: "exist"; lessons: number[] };

const ALL_GROUPS: VerbGroup[] = ["godan", "ichidan", "suru", "kuru"];
const PLAIN: AdjFormId[] = ["plain", "plainNeg", "plainPast", "plainPastNeg"];
const POLITE: AdjFormId[] = [
  "polite",
  "politeNeg",
  "politePast",
  "politePastNeg",
];

/** [과, 활용형들, 갈래들] */
const VERB_LESSONS: [number, VerbFormId[], VerbGroup[]][] = [
  [8, ["nai", "ta", "nakatta"], ["godan"]],
  [9, ["masu", "masen", "mashita", "masendeshita"], ["godan"]],
  [10, ["nai", "ta", "nakatta"], ["ichidan"]],
  [11, ["masu", "masen", "mashita", "masendeshita"], ["ichidan"]],
  [12, ["nai", "ta", "nakatta"], ["suru", "kuru"]],
  [13, ["masu", "masen", "mashita", "masendeshita"], ["suru", "kuru"]],
  [14, ["nai"], ALL_GROUPS],
  [15, ["causative"], ALL_GROUPS],
  [16, ["passive"], ALL_GROUPS],
  [17, ["causativePassive"], ALL_GROUPS],
  [18, ["masu"], ALL_GROUPS],
  [19, ["dict"], ALL_GROUPS],
  [20, ["prohibitive"], ALL_GROUPS],
  [21, ["imperative"], ALL_GROUPS],
  [22, ["potential"], ALL_GROUPS],
  [23, ["ba"], ALL_GROUPS],
  [24, ["volitional"], ALL_GROUPS],
  [25, ["te", "ta"], ALL_GROUPS],
  [55, ["tara"], ALL_GROUPS],
];

const ADJ_LESSONS: [number, AdjFormId[], AdjKind[]][] = [
  [1, PLAIN, ["noun"]],
  [2, POLITE, ["noun"]],
  [3, PLAIN, ["na"]],
  [4, POLITE, ["na"]],
  [6, PLAIN, ["i"]],
  [7, POLITE, ["i"]],
  [35, ["te"], ["i", "na", "noun"]],
  [36, ["adverb"], ["i", "na"]],
  [37, ["naru"], ["i", "na", "noun"]],
  [38, ["sa"], ["i"]],
];

function build(): Skill[] {
  const byKey = new Map<string, Skill>();
  const add = (s: Skill) => {
    const had = byKey.get(s.key);
    if (had) had.lessons = [...new Set([...had.lessons, ...s.lessons])];
    else byKey.set(s.key, s);
  };
  for (const [lesson, forms, kinds] of ADJ_LESSONS)
    for (const adjKind of kinds)
      for (const form of forms)
        add({
          key: `adj:${form}:${adjKind}`,
          kind: "adj",
          form,
          adjKind,
          lessons: [lesson],
        });
  for (const [lesson, forms, groups] of VERB_LESSONS)
    for (const group of groups)
      for (const form of forms)
        add({
          key: `verb:${form}:${group}`,
          kind: "verb",
          form,
          group,
          lessons: [lesson],
        });
  add({ key: "exist", kind: "exist", lessons: [40] });
  for (const direction of ["toTransitive", "toIntransitive"] as const)
    add({
      key: `transitive:${direction}`,
      kind: "transitive",
      direction,
      lessons: [42],
    });
  for (const p of PATTERNS)
    add({
      key: `pattern:${p.id}`,
      kind: "pattern",
      patternId: p.id,
      lessons: [p.lesson],
    });
  for (const which of ["honorific", "humble"] as const)
    add({ key: `keigo:${which}`, kind: "keigo", which, lessons: [56] });
  return [...byKey.values()].sort(
    (a, b) => firstLesson(a) - firstLesson(b) || (a.key < b.key ? -1 : 1),
  );
}

export function firstLesson(s: Skill): number {
  return Math.min(...s.lessons);
}

export const SKILLS: readonly Skill[] = build();
export const SKILL_BY_KEY: ReadonlyMap<string, Skill> = new Map(
  SKILLS.map((s) => [s.key, s]),
);

/** 이 과 범위(from~to) 안에서 다루는 기술 */
export function skillsInLessons(from: number, to: number): Skill[] {
  return SKILLS.filter((s) => s.lessons.some((l) => l >= from && l <= to));
}

/** 이 과에서 다루는 기술 */
export function skillsOfLesson(no: number): Skill[] {
  return SKILLS.filter((s) => s.lessons.includes(no));
}

/**
 * 과 화면 끝 드릴 바로 가기. 이 과에서 다루는 활용이 있으면 그 과만, 없으면(조사·부사·쓰임을
 * 배우는 과) 이 과까지 나온 활용을 섞어 복습한다. skills는 보일 이름표용으로 가까운 과 것부터.
 */
export function lessonDrillTarget(
  no: number,
): { kind: "lesson" | "review"; href: string; skills: Skill[] } | null {
  const own = skillsOfLesson(no);
  if (own.length > 0)
    return { kind: "lesson", href: `/ilmunta/drill?lesson=${no}`, skills: own };
  const lastBefore = (s: Skill) => Math.max(...s.lessons.filter((l) => l < no));
  const earlier = skillsInLessons(1, no - 1).sort(
    (a, b) => lastBefore(b) - lastBefore(a),
  );
  if (earlier.length === 0) return null;
  return {
    kind: "review",
    href: `/ilmunta/drill?upto=${no}`,
    skills: earlier,
  };
}

/** 기술이 있는 과 번호(오름차순) */
export const DRILL_LESSONS: readonly number[] = [
  ...new Set(SKILLS.flatMap((s) => s.lessons)),
].sort((a, b) => a - b);

/** 화면에 보일 이름(예: "て형 · 1그룹") */
export function skillLabel(s: Skill): string {
  switch (s.kind) {
    case "verb":
      return `${VERB_FORM_INFO[s.form].label} · ${GROUP_LABEL[s.group]}`;
    case "adj":
      return `${ADJ_FORM_INFO[s.form].label} · ${ADJ_KIND_LABEL[s.adjKind]}`;
    case "pattern":
      return PATTERN_BY_ID.get(s.patternId)?.label ?? s.patternId;
    case "transitive":
      return s.direction === "toTransitive"
        ? "자동사 → 타동사"
        : "타동사 → 자동사";
    case "keigo":
      return s.which === "honorific" ? "존경어" : "겸양어";
    case "exist":
      return "있다(ある·いる)";
  }
}
