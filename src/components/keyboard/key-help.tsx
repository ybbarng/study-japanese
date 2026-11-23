import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// PC 곁칸과 단추에 붙이는 키보드 안내. 폰에서는 곁칸 자체가 없거나 키 표시를 감춘다.

/** PC 곁칸의 판 하나(제목 + 내용) */
export function SidePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line p-5">
      <h2 className="text-sm text-ink-soft">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** PC 곁칸의 "키보드로 하기" 목록 */
export function KeyHelp({
  items,
}: {
  items: { key: string; label: string }[];
}) {
  return (
    <SidePanel title="키보드로 하기">
      <dl className="space-y-2 text-sm">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-3">
            <dt>
              <kbd className="rounded-md border border-line bg-bg-sunken px-2 py-0.5 font-mono text-xs">
                {it.key}
              </kbd>
            </dt>
            <dd className="text-ink-soft">{it.label}</dd>
          </div>
        ))}
      </dl>
    </SidePanel>
  );
}

/** 단추 안에 붙이는 키 표시(PC에서만 보인다). `onAccent`는 강조색 단추 위 */
export function InlineKey({ k, onAccent }: { k: string; onAccent?: boolean }) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "ml-2 hidden rounded border border-line px-1.5 align-middle font-mono text-xs font-normal text-ink-faint lg:inline",
        onAccent && "border-white/50 text-white/85",
      )}
    >
      {k}
    </kbd>
  );
}
