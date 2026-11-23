"use client";

import { useEffect, useRef } from "react";
import { choiceIndexFor } from "@/lib/keyboard/choice-key";
import type { KeyInput, TargetInfo } from "@/lib/player/shortcuts";

// 브라우저 키 이벤트를 순수 판정 함수(src/lib/player/shortcuts.ts 등)가 읽는 모양으로 바꾼다.

export function targetInfo(el: EventTarget | null): TargetInfo {
  if (!(el instanceof HTMLElement)) return { tag: "BODY", editable: false };
  return {
    tag: el.tagName,
    type: el instanceof HTMLInputElement ? el.type : undefined,
    editable: el.isContentEditable,
  };
}

export function toKeyInput(e: KeyboardEvent): KeyInput {
  return {
    key: e.key,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    target: targetInfo(e.target),
  };
}

/** 숫자 키(1~)로 보기를 고른다. enabled가 거짓이면 듣지 않는다 */
export function useChoiceKeys(
  count: number,
  onPick: (index: number) => void,
  enabled = true,
) {
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const i = choiceIndexFor(toKeyInput(e), count);
      if (i === null) return;
      e.preventDefault();
      pick.current(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, enabled]);
}
