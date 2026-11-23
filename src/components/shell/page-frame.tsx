import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const WIDTH = {
  /** 글 읽는 화면(안내·설정): 한 줄이 너무 길지 않게 */
  reading: "lg:max-w-3xl",
  /** 지도·두 칸 화면: 넓이를 다 쓴다 */
  wide: "lg:max-w-6xl",
  /** 강 화면처럼 세 칸까지 쓰는 화면 */
  full: "lg:max-w-[96rem]",
};

/**
 * 화면 한 장의 바깥 틀. 폰에서는 지금처럼 가운데 좁은 띠(max-w-md),
 * PC(lg 이상)에서는 정한 넓이까지 펴고 옆 여백을 넉넉히 둔다.
 */
export function PageFrame({
  width = "wide",
  className,
  children,
}: {
  width?: keyof typeof WIDTH;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-md px-5 pt-[max(env(safe-area-inset-top),1.5rem)] lg:px-10 lg:pt-10",
        WIDTH[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

/** PC에서 두 칸(왼쪽 본문, 오른쪽 고정 곁칸). 폰에서는 곁칸을 그리지 않고 본문만 */
export function TwoColumn({
  main,
  aside,
  asideLabel,
  asideWidth = "24rem",
}: {
  main: ReactNode;
  aside: ReactNode;
  asideLabel: string;
  asideWidth?: "20rem" | "24rem" | "28rem";
}) {
  return (
    <div
      className={cn(
        "lg:grid lg:gap-10",
        asideWidth === "20rem" && "lg:grid-cols-[minmax(0,1fr)_20rem]",
        asideWidth === "24rem" && "lg:grid-cols-[minmax(0,1fr)_24rem]",
        asideWidth === "28rem" && "lg:grid-cols-[minmax(0,1fr)_28rem]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <aside aria-label={asideLabel} className="hidden lg:block">
        <StickyPanel>{aside}</StickyPanel>
      </aside>
    </div>
  );
}

/** 화면을 내려도 따라오는 곁칸. 아래 재생 막대 자리만큼 높이를 줄인다 */
export function StickyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-6 flex max-h-[calc(100dvh-9rem)] flex-col gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
