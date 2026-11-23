import Link from "next/link";
import { actionHref } from "@/lib/today/actions";
import type { TodayAction } from "@/lib/today/pick";
import type { ActionText } from "./action-text";

/** 오늘의 나머지: 작은 줄로 */
export function RestList({
  items,
}: {
  items: { action: TodayAction; text: ActionText }[];
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label="오늘의 나머지">
      <h2 className="pb-2 text-sm text-ink-faint">오늘의 나머지</h2>
      <ul className="overflow-hidden rounded-2xl bg-bg-raised">
        {items.map(({ action, text }, i) => (
          <li
            key={actionHref(action)}
            className={i > 0 ? "border-t border-line" : ""}
          >
            <Link
              href={actionHref(action)}
              className="flex items-center gap-3 px-5 py-4 active:bg-bg-sunken"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-accent">
                  {text.eyebrow}
                </span>
                <span className="block truncate font-medium">
                  {text.title}
                  {text.ja ? (
                    <span
                      lang="ja"
                      className="ml-2 font-ja-serif text-ink-soft"
                    >
                      {text.ja}
                    </span>
                  ) : null}
                </span>
              </span>
              <span aria-hidden className="text-ink-faint">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
