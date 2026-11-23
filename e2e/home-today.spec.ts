import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 첫 화면 "오늘"은 날짜에 따라 달라진다. E2E 서버는 ?now=로 시각을 넣어 볼 수 있다.

const at = (iso: string) => `/?now=${encodeURIComponent(iso)}`;

test("1월 1일 전에는 D-day와 시작일, 준비 안내를 보이고 공부 단추는 크게 두지 않는다", async ({
  page,
}) => {
  await login(page);
  await page.goto(at("2026-12-01T09:00+09:00"));
  await expect(page.getByText("D-31", { exact: true })).toBeVisible();
  await expect(page.getByText("2027년 1월 1일에 시작합니다")).toBeVisible();
  await expect(page.getByText("1. 폰 홈 화면에 설치")).toBeVisible();
  await expect(page.getByRole("button", { name: /0강 듣기/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /재생 시험/ })).toBeVisible();
});

test("1월 1일 아침에는 맨 위 0강 듣기를 한 번 눌러 바로 재생하고, 가나 첫 레슨도 크게 보인다", async ({
  page,
}) => {
  await login(page);
  await page.goto(at("2027-01-01T08:00+09:00"));
  const today = page.getByRole("region", { name: "오늘 할 것" });
  await expect(today.getByRole("link", { name: /가나/ })).toBeVisible();
  await expect(page.getByText(/1월 목표 일무따 0~18강/)).toBeVisible();

  await today.getByRole("button", { name: /0강 듣기/ }).click();
  const bar = page.getByRole("button", { name: "재생 화면 펼치기" });
  await expect(bar).toContainText("오리엔테이션 강의");
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
});

test("4월에는 일문따 이어 듣기가 가장 크고 이번 달 목표가 일문따로 바뀐다", async ({
  page,
}) => {
  await login(page);
  await page.goto(at("2027-04-07T08:00+09:00"));
  const today = page.getByRole("region", { name: "오늘 할 것" });
  await expect(
    today.getByRole("link", { name: /일문따 · 이어 듣기/ }),
  ).toBeVisible();
  await expect(page.getByText(/4월 목표 일문따 1~24과/)).toBeVisible();
});
