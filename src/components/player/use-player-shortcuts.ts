"use client";

import { useEffect, useRef } from "react";
import { toKeyInput } from "@/components/keyboard/key-input";
import { stepRate } from "@/lib/player/rates";
import { shortcutFor } from "@/lib/player/shortcuts";
import { usePlayer } from "@/lib/player/store";
import { useShortcutHelp } from "./use-shortcut-help";

interface Handlers {
  /** 재생기에 트랙이 올라 있는지(없으면 도움말만 연다) */
  hasTrack: boolean;
  onToggle: () => void;
  onSeekBy: (delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * PC 키보드 단축키. 어떤 키가 무슨 일인지는 순수 함수(shortcutFor)가 정하고,
 * 여기서는 재생기의 손잡이(GlobalPlayer가 넘기는 것)만 부른다.
 * Esc는 도움말 → 펼친 패널 차례로 닫는다.
 */
export function usePlayerShortcuts(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const h = ref.current;
      const help = useShortcutHelp.getState();
      if (e.key === "Escape") {
        if (help.open) help.setOpen(false);
        else if (usePlayer.getState().expanded)
          usePlayer.getState().setExpanded(false);
        return;
      }
      const action = shortcutFor(toKeyInput(e));
      if (!action) return;
      if (action.kind === "help") {
        e.preventDefault();
        help.setOpen(!help.open);
        return;
      }
      if (!h.hasTrack) return;
      e.preventDefault();
      switch (action.kind) {
        case "toggle":
          h.onToggle();
          break;
        case "seek":
          h.onSeekBy(action.delta);
          break;
        case "prev":
          h.onPrev();
          break;
        case "next":
          h.onNext();
          break;
        case "rate": {
          const st = usePlayer.getState();
          st.setRate(stepRate(st.rate, action.dir));
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
