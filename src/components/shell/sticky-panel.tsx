"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { stickyMaxHeight } from "@/lib/shell/sticky";

/** 지금 화면에 보이는 재생 막대(폰 MiniBar·PC DockBar 가운데 보이는 것) */
function visibleBar(): HTMLElement | null {
  // 막대는 position: fixed라 offsetParent로는 못 가린다. 감춘 쪽(display: none)은 높이가 0
  for (const el of document.querySelectorAll<HTMLElement>("[data-player-bar]"))
    if (el.getBoundingClientRect().height > 0) return el;
  return null;
}

/**
 * 화면을 내려도 따라오는 곁칸. 칸 끝이 언제나 화면 아래(재생 막대가 떠 있으면 막대 위)에 오게
 * 지금 칸이 놓인 위치에서 높이를 잰다. 내리기 전에는 칸이 머리글 아래에서 시작하므로
 * 붙은 뒤보다 낮게 잡아야 막대 뒤로 들어가지 않는다.
 * 잴 수 없을 때(첫 그림)는 CSS 기본값(붙은 뒤 기준)을 쓴다.
 */
export function StickyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bar = visibleBar();
      const max = stickyMaxHeight({
        viewport: window.innerHeight,
        panelTop: el.getBoundingClientRect().top,
        stickyTop: Number.parseFloat(getComputedStyle(el).top) || 0,
        barTop: bar ? bar.getBoundingClientRect().top : null,
      });
      el.style.maxHeight = `${max}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // 재생 막대가 새로 뜨거나 사라지거나, 위쪽 글 높이가 바뀌어도 다시 잰다
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-sticky-panel
      className={cn(
        "sticky top-6 flex max-h-[calc(100dvh-9rem)] flex-col gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
