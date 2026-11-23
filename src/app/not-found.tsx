import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata = { title: "찾을 수 없음 — にほんご" };

// 없는 주소. Next 기본 화면(흰 바탕·영어) 대신 사이트와 같은 모양으로 보인다
export default function NotFound() {
  return (
    <PageFrame width="reading" className="flex flex-col gap-4 pb-28">
      <p lang="ja" className="font-ja-serif text-5xl text-ink-faint">
        404
      </p>
      <h1 className="text-2xl font-bold">이 화면은 없어요</h1>
      <p className="text-ink-soft">
        주소가 바뀌었거나 잘못 들어왔을 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-2 grid h-14 place-items-center rounded-2xl bg-accent text-lg font-bold text-white"
      >
        오늘 화면으로
      </Link>
    </PageFrame>
  );
}
