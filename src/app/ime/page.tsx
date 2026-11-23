import Link from "next/link";
import { DeviceGuides } from "@/components/ime/device-guides";
import { ImeTester } from "@/components/ime/ime-tester";
import { RomajiTable } from "@/components/ime/romaji-table";
import { PageFrame, SplitColumns } from "@/components/shell/page-frame";

export const metadata = { title: "일본어 입력기 켜기 — にほんご" };

// 일본어 입력기 설치 안내: 기기별 차례 → 시험해 보기 → 로마자 헷갈리는 것.
// PC에서는 왼쪽에 기기별 차례, 오른쪽에 시험 칸과 로마자 표를 두어 따라 하며 바로 쳐 본다.
export default function ImePage() {
  return (
    <PageFrame className="flex flex-col gap-4 px-4 pb-28 lg:px-10">
      <header className="px-2 lg:px-0">
        <Link href="/" className="text-sm text-ink-faint lg:hidden">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold lg:mt-0">일본어 입력기 켜기</h1>
        <p className="mt-2 text-ink-soft">
          처음엔 <b className="text-ink">로마자 입력</b>을 권합니다.{" "}
          <span className="font-mono">ka</span>를 치면 か로 바뀌는 것을 보는
          것만으로도 가나 연습이 됩니다.
        </p>
        <p className="mt-2 text-sm text-ink-faint">
          메뉴 이름은 OS 판마다 조금 다를 수 있습니다. 비슷한 이름을 찾아
          따라가세요.
        </p>
      </header>
      <SplitColumns
        main={<DeviceGuides />}
        side={
          <>
            <ImeTester />
            <RomajiTable />
          </>
        }
      />
    </PageFrame>
  );
}
