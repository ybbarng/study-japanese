import type { ContinuePick } from "@/lib/ilmuta/continue";
import type { TodayPlan as KanaPlan } from "@/lib/kana/plan";
import { isWeekend, kstDate } from "./kst";
import {
  daysUntilStart,
  focusBook,
  type MonthQuota,
  monthGoal,
  monthQuota,
} from "./schedule";

// 첫 화면 "오늘": 가장 크게 보일 것(1~2개)과 오늘의 나머지, 이번 달 목표.

export type TodayAction =
  | { kind: "ilmuta-listen"; no: number }
  | { kind: "ilmuta-write"; no: number }
  | { kind: "kana-lesson"; lessonId: string; first: boolean }
  | { kind: "kana-bridge"; bridgeId: string }
  | { kind: "kana-review"; due: number }
  | { kind: "ilmunta"; no: number }
  | { kind: "ilmunta-drill" };

export interface TodayInput {
  nowMs: number;
  kana: {
    plan: KanaPlan;
    /** 끝낸 가나 레슨 수(다리 빼고) */
    lessonsDone: number;
  };
  /** 교재가 없으면 null */
  ilmuta: {
    pick: ContinuePick;
    /** 강의를 끝까지 들은 강 */
    lectureDone: ReadonlySet<number>;
    /** 강의를 아직 안 들은 첫 강(다 들었으면 null) */
    nextListen: number | null;
    /** 강의는 들었는데 문장을 덜 쓴 강 */
    pendingWriting: readonly number[];
  } | null;
  ilmunta: {
    resume: number | null;
    /** 강의를 다 들은 과 */
    done: ReadonlySet<number>;
  } | null;
}

export type Today =
  | { phase: "before"; daysLeft: number }
  | {
      phase: "study";
      weekend: boolean;
      /** 가장 크게 보일 것. 1월 1일 아침처럼 둘일 때도 있다 */
      main: TodayAction[];
      rest: TodayAction[];
      quota: MonthQuota | null;
    };

function ilmutaAction(pick: ContinuePick): TodayAction | null {
  if (pick.kind === "listen") return { kind: "ilmuta-listen", no: pick.no };
  if (pick.kind === "write") return { kind: "ilmuta-write", no: pick.no };
  return null;
}

function kanaAction(plan: KanaPlan, lessonsDone: number): TodayAction | null {
  switch (plan.kind) {
    case "lesson":
      return {
        kind: "kana-lesson",
        lessonId: plan.lesson.id,
        first: lessonsDone === 0,
      };
    case "bridge":
      return { kind: "kana-bridge", bridgeId: plan.bridge.id };
    case "review":
      return { kind: "kana-review", due: plan.due };
    case "game":
      return null;
  }
}

function sameAction(a: TodayAction, b: TodayAction): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pickToday(input: TodayInput): Today {
  const { nowMs, kana, ilmuta, ilmunta } = input;
  const daysLeft = daysUntilStart(nowMs);
  if (daysLeft > 0) return { phase: "before", daysLeft };

  const date = kstDate(nowMs);
  const weekend = isWeekend(date);
  const ilmutaNext = ilmuta ? ilmutaAction(ilmuta.pick) : null;
  const ilmuntaNext: TodayAction | null =
    ilmunta?.resume != null ? { kind: "ilmunta", no: ilmunta.resume } : null;

  // 주로 할 책: 1분기 일무따, 2분기부터 일문따. 한쪽을 다 끝냈으면 다른 쪽.
  const primary =
    focusBook(nowMs) === "ilmuta"
      ? (ilmutaNext ?? ilmuntaNext)
      : (ilmuntaNext ?? ilmutaNext);

  // 가나 레슨이 남아 있는 동안은 가나도 크게: 며칠 안에 한 번 익히는 것이 처방이다
  const kanaNext = kanaAction(kana.plan, kana.lessonsDone);
  const kanaInProgress =
    kana.plan.lesson !== null || kana.plan.kind === "bridge";
  const main: TodayAction[] = [];
  if (primary) main.push(primary);
  if (kanaNext && (kanaInProgress || main.length === 0)) main.push(kanaNext);

  const rest: TodayAction[] = [];
  const add = (a: TodayAction | null) => {
    if (a && ![...main, ...rest].some((x) => sameAction(x, a))) rest.push(a);
  };
  if (kanaNext?.kind === "kana-review") add(kanaNext);
  if (ilmuta) {
    // 주말에 문장을 쓰는 날이면 다음 강 듣기도 곁에, 주말엔 밀린 문장 쓰기를 곁에
    if (ilmuta.nextListen !== null && primary?.kind === "ilmuta-write")
      add({ kind: "ilmuta-listen", no: ilmuta.nextListen });
    if (weekend && ilmuta.pendingWriting.length > 0)
      add({ kind: "ilmuta-write", no: ilmuta.pendingWriting[0] });
    if (focusBook(nowMs) === "ilmunta") add(ilmutaNext);
  }
  if (ilmunta && focusBook(nowMs) === "ilmunta") add({ kind: "ilmunta-drill" });

  const goal = monthGoal(date.year, date.month);
  const doneNos = goal?.book === "ilmuta" ? ilmuta?.lectureDone : ilmunta?.done;
  return {
    phase: "study",
    weekend,
    main,
    rest,
    quota: goal && doneNos ? monthQuota(goal, doneNos, nowMs) : null,
  };
}
