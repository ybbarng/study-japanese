import { expect, type Page, test } from "@playwright/test";
import { LONG_LECTURE, LONG_LECTURE_CUES } from "./fixtures/textbook";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// PC(1440×900)에서만 보이는 것: 왼쪽 탐색, 아래 도킹 막대, 키보드 단축키, 강 화면 오른쪽 자막 목록.
test.skip(
  ({ isMobile }) => isMobile,
  "PC 화면 전용 시험(폰 프로젝트는 건너뛴다)",
);

const LESSON = `/ilmuta/${LONG_LECTURE.no}`;

function audioTime(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
}

function audioPaused(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector("audio")?.paused ?? true);
}

/** 단추를 누른 뒤 초점을 빼서, Space가 그 단추를 다시 누르지 않고 단축키로 가게 한다 */
async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
}

/** 화면이 뜨고 단축키를 듣기 시작할 때까지(그 전에 누른 키는 아무도 받지 않는다) */
async function shortcutsReady(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-shortcuts", "on");
}

async function startLecture(page: Page) {
  await login(page, LESSON);
  await shortcutsReady(page);
  const aside = page.getByRole("complementary", { name: "강의와 자막" });
  await aside.getByRole("button", { name: /강의 듣기/ }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await blur(page);
}

test("PC 왼쪽 탐색은 지금 있는 책을 표시하고, 누르면 다른 책으로 옮겨 간다", async ({
  page,
}) => {
  await login(page, LESSON);
  const nav = page.getByRole("navigation", { name: "사이트 탐색" });
  await expect(nav.getByRole("link", { name: /일무따/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: /일문따/ }).click();
  await expect(page).toHaveURL("/ilmunta");
  await expect(nav.getByRole("link", { name: /일문따/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("PC에서 Space로 강의를 멈추고 다시 틀며, →는 5초 앞으로, Shift+→는 다음 트랙으로 넘어간다", async ({
  page,
}) => {
  await startLecture(page);

  await page.keyboard.press("Space");
  await expect.poll(() => audioPaused(page)).toBe(true);
  await page.keyboard.press("Space");
  await expect.poll(() => audioIsPlaying(page)).toBe(true);

  const before = await audioTime(page);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(before + 4);

  await page.keyboard.press("Shift+ArrowRight");
  await expect(
    page.getByRole("button", { name: "재생 화면 펼치기" }),
  ).toContainText(`${LONG_LECTURE.no}강 기본 회화 듣기`);
});

test("PC에서 입력칸에 글을 쓰는 동안에는 Space가 재생을 멈추지 않는다", async ({
  page,
}) => {
  await startLecture(page);
  await page.goto(`${LESSON}?step=writing`);
  // 화면을 옮겨도 재생기는 이어진다
  await page.getByRole("button", { name: "재생", exact: true }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);

  const box = page.getByLabel("문장 1");
  await box.click();
  await page.keyboard.type("a b");
  await expect(box).toHaveValue("a b");
  expect(await audioPaused(page)).toBe(false);
});

test("PC 강 화면 오른쪽 자막 목록에서 줄을 누르면 강의가 그 말부터 재생되고 그 줄이 지금 줄로 강조된다", async ({
  page,
}) => {
  await login(page, LESSON);
  const cue = LONG_LECTURE_CUES[2];
  const list = page
    .getByRole("complementary", { name: "강의와 자막" })
    .getByRole("region", { name: "강의 자막" });
  const line = list.getByRole("button", { name: cue.text });

  // 아직 강의를 틀지 않았어도 줄을 누르면 강의를 틀고 그 자리로 옮긴다
  await line.click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(cue.start);
  expect(await audioTime(page)).toBeLessThan(cue.end + 2);
  await expect(line).toHaveAttribute("aria-current", "true");
});

test("PC에서 ? 키로 단축키 도움말을 열고 Esc로 닫는다", async ({ page }) => {
  await login(page, LESSON);
  await shortcutsReady(page);
  await page.keyboard.press("?");
  const help = page.getByRole("dialog", { name: "키보드 단축키" });
  await expect(help).toBeVisible();
  await expect(help).toContainText("이전 / 다음 트랙");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
});
