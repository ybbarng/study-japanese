"use client";

import { useEffect, useRef } from "react";
import { toKeyInput } from "@/components/keyboard/key-input";
import { tapKeyAction } from "@/lib/songs/tap-keys";

interface Handlers {
  onTap: () => void;
  onUndo: () => void;
}

/**
 * 박자 맞추기 키(Space·Backspace, 판정은 tapKeyAction).
 * 재생기 단축키(Space=멈춤)보다 먼저 받으려고 잡기 단계(capture)에서 듣고 기본 동작을 막는다
 * (재생기는 defaultPrevented인 키를 건너뛴다). 단추에 초점이 있어도 Space가 단추를 누르지 않게 keyup도 막는다.
 */
export function useTapKeys(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const action = tapKeyAction(toKeyInput(e));
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return;
      if (action === "tap") ref.current.onTap();
      else ref.current.onUndo();
    };
    const onUp = (e: KeyboardEvent) => {
      if (tapKeyAction(toKeyInput(e))) e.preventDefault();
    };
    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    // 키를 듣기 시작했다는 표시(E2E가 화면이 뜨자마자 눌러 놓치지 않게)
    document.documentElement.dataset.tapKeys = "on";
    return () => {
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
      delete document.documentElement.dataset.tapKeys;
    };
  }, []);
}
