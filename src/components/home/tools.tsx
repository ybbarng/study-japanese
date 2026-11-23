import Link from "next/link";

const TOOLS = [
  {
    href: "/ime",
    label: "일본어 입력기 켜는 법",
    sub: "폰·맥에서 일본어 치기",
  },
  { href: "/offline", label: "받아 둔 강", sub: "데이터 없이 걸으며 듣기" },
  { href: "/lab/player", label: "재생 시험", sub: "잠금 화면 조작 확인" },
];

/** 아래 "도구" 묶음 */
export function Tools() {
  return (
    <section aria-label="도구">
      <h2 className="pb-2 text-sm text-ink-faint">도구</h2>
      <ul className="grid grid-cols-3 gap-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block h-full rounded-2xl bg-bg-raised p-3 active:bg-bg-sunken"
            >
              <span className="block text-sm font-medium">{t.label}</span>
              <span className="mt-1 block text-xs text-ink-faint">{t.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
