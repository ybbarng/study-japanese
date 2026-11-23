"use client";

import Link from "next/link";
import { useShortcutHelp } from "@/components/player/use-shortcut-help";
import { cn } from "@/lib/cn";
import {
  type NavId,
  type NavItem,
  type NavProgress,
  progressLine,
  STUDY_ITEMS,
  TOOL_ITEMS,
} from "@/lib/shell/nav";
import { AccountLink } from "./account-link";

interface Props {
  active: NavId | null;
  progress: NavProgress;
  /** 로그인 여부(모르면 undefined, 그때는 계정 자리를 비운다) */
  isAdmin?: boolean;
}

/** PC(lg 이상) 왼쪽 좁은 탐색: 책 자리마다 진도 한 줄, 아래 도구·계정·단축키 */
export function SideNav({ active, progress, isAdmin }: Props) {
  const openHelp = useShortcutHelp((s) => s.setOpen);
  return (
    <nav
      aria-label="사이트 탐색"
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-bg-sunken/60 px-3 py-6 lg:flex"
    >
      <Link
        href="/"
        lang="ja"
        className="px-3 font-ja-serif text-2xl font-bold tracking-widest"
      >
        にほんご
      </Link>
      <ul className="mt-8 flex flex-col gap-1">
        {STUDY_ITEMS.map((item) => (
          <li key={item.id}>
            <NavLink
              item={item}
              active={active === item.id}
              sub={progressLine(item.id, progress)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-8 px-3 text-xs text-ink-faint">도구</p>
      <ul className="mt-1 flex flex-col gap-1">
        {TOOL_ITEMS.map((item) => (
          <li key={item.id}>
            <NavLink item={item} active={active === item.id} sub={null} />
          </li>
        ))}
      </ul>
      {/* 재생 막대가 아래에 붙으므로 그만큼 띄운다 */}
      <div className="mt-auto flex flex-col gap-1 pb-24">
        <AccountLink isAdmin={isAdmin} />
        <button
          type="button"
          onClick={() => openHelp(true)}
          className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink-soft hover:bg-bg-raised"
        >
          키보드 단축키
          <kbd className="rounded border border-line px-1.5 font-mono text-xs">
            ?
          </kbd>
        </button>
      </div>
    </nav>
  );
}

function NavLink({
  item,
  active,
  sub,
}: {
  item: NavItem;
  active: boolean;
  sub: string | null;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-bg-raised",
        active && "bg-bg-raised text-ink ring-1 ring-accent/50",
      )}
    >
      {item.ja ? (
        <span
          aria-hidden
          lang="ja"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg font-ja-serif text-sm",
            active ? "bg-accent text-white" : "bg-bg-raised text-ink-soft",
          )}
        >
          {item.ja}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{item.label}</span>
        {sub ? (
          <span className="block text-xs text-ink-faint">{sub}</span>
        ) : null}
      </span>
    </Link>
  );
}
