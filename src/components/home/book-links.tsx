import Link from "next/link";

const BOOKS = [
  { href: "/kana", ja: "かな", label: "가나", sub: "글자 익히기" },
  { href: "/ilmuta", ja: "はなす", label: "일무따", sub: "60강 지도" },
  { href: "/ilmunta", ja: "ぶんぽう", label: "일문따", sub: "56과·활용 드릴" },
];

/** 책마다 들어가는 작은 입구 */
export function BookLinks({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h2 className="pb-2 text-sm text-ink-faint">{title}</h2>
      <ul className="grid grid-cols-3 gap-2">
        {BOOKS.map((b) => (
          <li key={b.href}>
            <Link
              href={b.href}
              className="block rounded-2xl bg-bg-raised p-3 active:bg-bg-sunken"
            >
              <span lang="ja" className="block font-ja-serif text-lg">
                {b.ja}
              </span>
              <span className="block text-sm font-medium">{b.label}</span>
              <span className="block text-xs text-ink-faint">{b.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
