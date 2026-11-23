import Link from "next/link";
import { DeviceGuides } from "@/components/ime/device-guides";
import { ImeTester } from "@/components/ime/ime-tester";
import { RomajiTable } from "@/components/ime/romaji-table";

export const metadata = { title: "일본어 입력기 켜기 — にほんご" };

// 일본어 입력기 설치 안내: 기기별 차례 → 시험해 보기 → 로마자 헷갈리는 것
export default function ImePage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-28">
      <header className="px-2">
        <Link href="/" className="text-sm text-ink-faint">
          ← にほんご
        </Link>
        <h1 className="mt-3 text-2xl font-bold">일본어 입력기 켜기</h1>
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
      <DeviceGuides />
      <ImeTester />
      <RomajiTable />
    </main>
  );
}
