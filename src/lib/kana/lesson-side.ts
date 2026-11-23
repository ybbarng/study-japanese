import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";
import { type CardId, CONFUSABLE } from "./data";

// PC 가나 레슨 곁칸이 단계마다 무엇을 보일지, 소개 단계를 키보드로 넘기는 판정.

export type LessonStep = "intro" | "quiz" | "write" | "words" | "type" | "done";

/**
 * 곁칸 글자표를 어떻게 보일지.
 * - 알아보기(퀴즈) 중에는 읽는 법을 가린다(곁칸이 답을 알려 주지 않게)
 * - 쓰기 중에는 아직 쓰지 않은 글자 모양을 가린다(보고 베끼지 않게)
 * - 그 밖에는 글자·읽는 법을 다 보이고, 누르면 소리가 난다
 */
export type ChartView = {
  readings: boolean;
  /** 글자 모양을 보일지: 모두, 이미 쓴 글자만 */
  glyphs: "all" | "written";
  sound: boolean;
};

export function chartViewFor(step: LessonStep): ChartView {
  if (step === "quiz") return { readings: false, glyphs: "all", sound: false };
  if (step === "write")
    return { readings: true, glyphs: "written", sound: true };
  return { readings: true, glyphs: "all", sound: true };
}

/** 비슷한 글자 비교를 보일지(퀴즈 중에는 읽는 법이 드러나므로 감춘다) */
export function showCompare(step: LessonStep): boolean {
  return step !== "quiz";
}

/**
 * 이 레슨 글자가 낀 헷갈리는 짝. 짝의 다른 글자는 이 레슨이나 앞 레슨에서 배운 것만
 * (아직 안 배운 글자와 비교하면 오히려 헷갈린다).
 */
export function lessonConfusables(
  cards: readonly CardId[],
  learned: ReadonlySet<CardId>,
): [CardId, CardId][] {
  const mine = new Set(cards);
  return CONFUSABLE.filter(
    ([a, b]) =>
      (mine.has(a) || mine.has(b)) &&
      (mine.has(a) || learned.has(a)) &&
      (mine.has(b) || learned.has(b)),
  );
}

export type IntroKeyAction = "next" | "prev" | "listen";

/** 도움말에 보일 목록(판정과 같은 곳에 두어 어긋나지 않게) */
export const INTRO_KEY_HELP: { key: string; label: string }[] = [
  { key: "Enter", label: "다음 글자" },
  { key: "Backspace", label: "앞 글자" },
  { key: "1", label: "소리 다시 듣기" },
];

// 스스로 Enter를 받는 요소(단추·링크). 그때는 그 요소가 받게 둔다
const OWNS_ENTER = new Set(["button", "a", "summary", "select"]);

/** 소개 단계 키 판정. 화살표·Space는 재생기 단축키라 쓰지 않는다(가나 첫 읽기와 같은 규칙) */
export function introKeyAction(
  e: Pick<
    KeyInput,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "target"
  >,
): IntroKeyAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  switch (e.key) {
    case "Enter":
      return OWNS_ENTER.has(e.target.tag.toLowerCase()) ? null : "next";
    case "Backspace":
      return "prev";
    case "1":
      return "listen";
    default:
      return null;
  }
}
