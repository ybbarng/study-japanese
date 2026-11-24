import { expect, type Page, test } from "@playwright/test";
import { LONG_LECTURE, LONG_LECTURE_CUES } from "./fixtures/textbook";
import { TAP_WORD } from "./fixtures/word-tap";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 예문 낱말·글자 누르기: 낱말을 누르면 정보 창(폰은 아래 시트, PC는 오른쪽 창)이 뜨고,
// 초반 강이라 글자 하나씩이 펼쳐져 있다. 키보드로 앞뒤 낱말·닫기. 분석이 없는 강은 글자 하나씩 누른다.

const panel = (page: Page) => page.locator("[data-word-panel]");

test("예문 낱말을 누르면 뜻·읽는 법·글자 하나씩이 뜨고, →로 다음 낱말, Esc로 닫으면 누른 낱말로 초점이 돌아간다", async ({
  page,
}) => {
  await page.goto(`/ilmuta/${LONG_LECTURE.no}?step=patterns`);
  const word = page
    .getByRole("button", { name: TAP_WORD.surface, exact: false })
    .and(page.locator("[data-word-tap]"))
    .first();
  await word.click();

  const dialog = panel(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(TAP_WORD.gloss)).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "글자 하나씩" }),
  ).toBeVisible();

  // 글자를 누르면 그 글자 풀이
  await dialog
    .getByRole("list", { name: "글자 하나씩" })
    .getByRole("button")
    .first()
    .click();
  await expect(dialog.getByText("한글로 비슷하게:")).toBeVisible();

  // → 다음 낱말(조사 は): 조사로 읽는 법 알림
  await page.keyboard.press("ArrowRight");
  await expect(
    dialog.getByText("조사로 쓰일 때는 '와'로 읽는다."),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(word).toBeFocused();
});

test("낱말 분석이 없는 초반 강의 예문은 글자 하나씩 눌러 소리·한글 근사치를 본다", async ({
  page,
}) => {
  await page.goto("/ilmuta/1?step=patterns");
  // 히라가나 글자(한자는 한글 근사치 대신 "낱말마다 읽는 법이 다르다"가 나온다)
  await page.locator("[data-word-tap]", { hasText: "は" }).first().click();
  const dialog = panel(page);
  await expect(dialog).toHaveAttribute("aria-label", "글자 설명");
  await expect(dialog.getByText("한글로 비슷하게:")).toBeVisible();
});

test("강의 자막의 소책자 문장 카드에서 낱말을 눌러 정보 창을 연다", async ({
  page,
}) => {
  await login(page, `/ilmuta/${LONG_LECTURE.no}?step=lecture`);
  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, LONG_LECTURE_CUES[1].start + 1);

  const chips = page
    .getByRole("list", { name: "낱말 눌러 보기" })
    .locator("visible=true")
    .first();
  await expect(chips).toBeVisible();
  await chips.getByRole("button").first().click();
  await expect(panel(page).getByText("시험", { exact: true })).toBeVisible();
});
