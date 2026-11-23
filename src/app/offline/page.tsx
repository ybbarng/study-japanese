import Link from "next/link";
import { AutoPrefetch } from "@/components/offline/auto-prefetch";
import { AutoSetting } from "@/components/offline/auto-setting";
import { SavedList } from "@/components/offline/saved-list";
import { StorageSummary } from "@/components/offline/storage-summary";
import { PageFrame, SplitColumns } from "@/components/shell/page-frame";

export const metadata = { title: "받아 둔 강 — にほんご" };

// 받아 둔 강 관리: 목록·크기, 폰 공간, 지우지 않게 요청, 다음 할 강 자동 받기.
// PC에서는 왼쪽 목록, 오른쪽 자동 받기·저장 공간.
export default function OfflinePage() {
  return (
    <PageFrame className="flex flex-col gap-4 px-4 pb-28 lg:px-10">
      <header className="px-2 lg:px-0">
        <Link href="/" className="text-sm text-ink-faint lg:hidden">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold lg:mt-0">받아 둔 강</h1>
        <p className="mt-1 text-sm text-ink-soft lg:max-w-3xl lg:text-base">
          받아 둔 강은 지하철·터널에서 통신이 끊겨도 화면이 열리고 소리가
          나옵니다. 들은 기록은 기기에 모았다가 연결되면 보냅니다.
        </p>
      </header>
      <AutoPrefetch />
      <SplitColumns
        main={<SavedList />}
        side={
          <>
            <AutoSetting />
            <StorageSummary />
          </>
        }
      />
    </PageFrame>
  );
}
