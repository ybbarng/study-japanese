import Link from "next/link";
import { SourceSwitches } from "@/components/sources/source-switches";
import { SOURCES } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";

export const metadata = { title: "설정 — にほんご" };
export const dynamic = "force-dynamic";

// 관리자만 들어온다(src/proxy.ts).
export default function SettingsPage() {
  const settings = readSiteSettings(getDb());
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10">
      <div>
        <Link href="/" className="text-sm text-ink-soft">
          ← 첫 화면
        </Link>
        <h1 className="mt-2 text-2xl font-bold">설정</h1>
      </div>

      <section>
        <h2 className="text-lg font-medium">자료 공개</h2>
        <p className="mt-1 text-sm text-ink-soft">
          사이트는 누구나 쓸 수 있습니다. 남의 자료는 출처마다 공개를 끌 수
          있고, 끄면 로그인한 사람만 보고 듣습니다. 권리자가 원하면 여기서 바로
          닫으세요.
        </p>
        <SourceSwitches
          sources={SOURCES.filter((s) => !s.license).map((s) => ({
            id: s.id,
            title: s.title,
            rightsHolder: s.rightsHolder,
          }))}
          initialClosed={settings.closedSources}
        />
      </section>

      <form method="post" action="/api/logout">
        <button
          type="submit"
          className="rounded-2xl border border-line px-5 py-3 text-ink-soft"
        >
          로그아웃
        </button>
      </form>
    </main>
  );
}
