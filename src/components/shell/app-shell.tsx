"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useIsAdmin } from "@/lib/auth/client";
import { activeNav, showsNav } from "@/lib/shell/nav";
import { SideNav } from "./side-nav";
import { useNavProgress } from "./use-nav-progress";

/**
 * 사이트 틀. PC(lg 이상)에서는 왼쪽에 좁은 탐색을 두고 본문이 나머지 넓이를 쓴다.
 * 폰에서는 탐색 없이 본문만(지금처럼 화면마다 위의 ← 링크로 오간다).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const progress = useNavProgress(pathname);
  const isAdmin = useIsAdmin();
  if (!showsNav(pathname)) return <>{children}</>;
  return (
    <div className="lg:flex">
      <SideNav
        active={activeNav(pathname)}
        progress={progress}
        isAdmin={isAdmin}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
