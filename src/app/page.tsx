import { TodayHome } from "@/components/home/today-home";
import { nowParamAllowed, resolveNow } from "@/lib/today/now";
import { loadHomeData } from "@/lib/today/server-data";

interface Props {
  searchParams: Promise<{ now?: string | string[] }>;
}

/** 첫 화면 "오늘". 개발 서버·E2E에서는 `?now=2027-01-01T08:00+09:00`으로 날짜를 넣어 본다 */
export default async function Home({ searchParams }: Props) {
  const nowMs = resolveNow(
    (await searchParams).now,
    Date.now(),
    nowParamAllowed(process.env),
  );
  const data = await loadHomeData(nowMs);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-28">
      <TodayHome data={data} />
    </main>
  );
}
