import Link from "next/link";
import { AutoPrefetch } from "@/components/offline/auto-prefetch";
import { AutoSetting } from "@/components/offline/auto-setting";
import { SavedList } from "@/components/offline/saved-list";
import { StorageSummary } from "@/components/offline/storage-summary";

export const metadata = { title: "받아 둔 강 — にほんご" };

// 받아 둔 강 관리: 목록·크기, 폰 공간, 지우지 않게 요청, 다음 할 강 자동 받기
export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-28">
      <header className="px-2">
        <Link href="/" className="text-sm text-ink-faint">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold">받아 둔 강</h1>
        <p className="mt-1 text-sm text-ink-soft">
          받아 둔 강은 지하철·터널에서 통신이 끊겨도 화면이 열리고 소리가
          나옵니다. 들은 기록은 폰에 모았다가 연결되면 보냅니다.
        </p>
      </header>
      <AutoPrefetch />
      <SavedList />
      <AutoSetting />
      <StorageSummary />
    </main>
  );
}
