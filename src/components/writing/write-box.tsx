import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 정사각형 쓰기 칸. 가운데 십자 보조선(점선)을 깔고 그 위에 본보기·캔버스를 겹친다 */
export function WriteBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full cursor-crosshair overflow-hidden rounded-3xl bg-bg-sunken",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 right-0 left-0 border-t border-dashed border-line" />
        <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-line" />
      </div>
      {children}
    </div>
  );
}
