"use client";

import { useEffect, useRef } from "react";

/** 손으로 화면을 굴린 뒤 이만큼은 지금 줄을 따라 굴리지 않는다 */
const HOLD_MS = 4000;

/**
 * 노래가 흐르는 동안 지금 줄이 화면 가운데에 오게 굴린다.
 * 사용자가 직접 굴리면 잠시 따라가지 않는다(앞뒤 줄을 보는 중이니까).
 */
export function useFollowLine(current: number) {
  const heldUntil = useRef(0);

  useEffect(() => {
    const hold = () => {
      heldUntil.current = Date.now() + HOLD_MS;
    };
    window.addEventListener("wheel", hold, { passive: true });
    window.addEventListener("touchmove", hold, { passive: true });
    return () => {
      window.removeEventListener("wheel", hold);
      window.removeEventListener("touchmove", hold);
    };
  }, []);

  useEffect(() => {
    if (current < 0 || Date.now() < heldUntil.current) return;
    document
      .querySelector(`[data-line="${current}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current]);
}
