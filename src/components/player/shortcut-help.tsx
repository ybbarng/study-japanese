"use client";

import { SHORTCUT_HELP } from "@/lib/player/shortcuts";
import { useShortcutHelp } from "./use-shortcut-help";

/** ? 키로 여는 단축키 도움말 */
export function ShortcutHelp() {
  const open = useShortcutHelp((s) => s.open);
  const setOpen = useShortcutHelp((s) => s.setOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-6">
      <button
        type="button"
        aria-label="도움말 닫기"
        className="absolute inset-0 cursor-default"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-label="키보드 단축키"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-bg-raised p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold">키보드 단축키</h2>
        <dl className="mt-4 space-y-3">
          {SHORTCUT_HELP.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-4"
            >
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-8 rounded-md border border-line bg-bg-sunken px-2 py-0.5 text-center font-mono text-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="text-sm text-ink-soft">{s.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-ink-faint">
          글을 쓰는 칸에 있을 때는 단축키가 먹지 않습니다. 가나 4지선다와 드릴
          고르기는 1~4 키로 고릅니다.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-2xl bg-bg-sunken py-3 text-sm"
        >
          닫기 (Esc)
        </button>
      </div>
    </div>
  );
}
