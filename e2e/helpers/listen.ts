import { expect, type Page } from "@playwright/test";

export interface ListenItem {
  item: string;
  plays: number;
  completedPlays: number;
}

/** 서버에 남은 들은 기록 요약에서 한 항목(없으면 null). 브라우저의 로그인 쿠키로 묻는다 */
export async function listenSummary(
  page: Page,
  book: string,
  item: string,
): Promise<ListenItem | null> {
  const res = await page.request.get(`/api/listen?book=${book}`);
  expect(res.status()).toBe(200);
  const { items } = (await res.json()) as { items: ListenItem[] };
  return items.find((i) => i.item === item) ?? null;
}

/** 재생기의 <audio>가 지금 재생 중이고 위치가 0초를 넘었는지 */
export async function audioIsPlaying(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const a = document.querySelector("audio");
    return !!a && !a.paused && a.currentTime > 0;
  });
}
