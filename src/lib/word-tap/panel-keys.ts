// 낱말 정보 창이 열려 있을 때 키가 창의 일인지 정한다. 화면(DOM)을 모르는 순수 함수다.
// 창이 열려 있으면 ←·→는 앞뒤 낱말이고 재생기의 5초 옮기기로 넘기지 않는다(창이 닫히면 다시 재생기 몫).
// Shift+←·→(앞뒤 트랙), Space, L 같은 다른 재생기 키는 창이 열려 있어도 재생기가 받는다.

import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";

export type PanelKeyAction = "close" | "prev" | "next";

export function panelKeyFor(e: KeyInput): PanelKeyAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Escape") return "close";
  if (e.shiftKey || isTypingTarget(e.target)) return null;
  // 슬라이더(재생 위치)·라디오에 초점이 있으면 화살표는 그 요소의 몫
  const tag = e.target.tag.toLowerCase();
  const type = (e.target.type ?? "").toLowerCase();
  if (tag === "input" && (type === "range" || type === "radio")) return null;
  if (e.key === "ArrowLeft") return "prev";
  if (e.key === "ArrowRight") return "next";
  return null;
}
