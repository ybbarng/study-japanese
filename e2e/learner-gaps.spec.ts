import { expect, type Locator, test } from "@playwright/test";
import { DRILL_WORDS } from "@/lib/quiz/drill-words";
import { ILMUNTA_WORDS_ONLY_LESSON } from "./fixtures/textbook";
import { TAP_WORD } from "./fixtures/word-tap";
import { login } from "./helpers/auth";
import { fakeJapaneseVoice, spoken } from "./helpers/speech";

// 학습자 점검(2026-11-24 2차)이 찾은 빈곳: 첫날 카드 링크, 폰의 사전 길,
// 활용 없는 과의 확인 문제, 드릴 문장·사전 낱말 소리.

const at = (iso: string) => `/?now=${encodeURIComponent(iso)}`;

test("1월 1일 전 첫 화면의 '첫날 할 것' 카드를 누르면 그 강·레슨으로 간다", async ({
  page,
}) => {
  await login(page);
  await page.goto(at("2026-12-01T09:00+09:00"));
  const first = page.getByRole("region", { name: "첫날 할 것" });
  await first.getByRole("link", { name: /일무따 0강/ }).click();
  await expect(page).toHaveURL(/\/ilmuta\/0$/);

  await page.goto(at("2026-12-01T09:00+09:00"));
  await page
    .getByRole("region", { name: "첫날 할 것" })
    .getByRole("link", { name: /가나 첫 레슨/ })
    .click();
  await expect(page).toHaveURL(/\/kana\/lesson\/h1$/);
});

test("첫 화면 도구와 일무따 지도에서 낱말 사전으로 갈 수 있다(폰에도 보인다)", async ({
  page,
}) => {
  await login(page);
  await page.goto(at("2027-01-05T08:00+09:00"));
  await page
    .getByRole("region", { name: "도구" })
    .getByRole("link", { name: /낱말 사전/ })
    .click();
  await expect(page).toHaveURL(/\/words$/);

  await page.goto("/ilmuta");
  const link = page
    .getByRole("link", { name: "낱말 사전" })
    .locator("visible=true")
    .first();
  await expect(link).toBeVisible();
});

/** 지금 문제의 정답 보기 글: 묻는 낱말을 드릴 낱말 목록에서 찾는다 */
async function rightLabel(quiz: Locator): Promise<string> {
  const ask = (await quiz.textContent()) ?? "";
  const ja = await quiz
    .locator("[data-quiz-word]")
    .getAttribute("data-quiz-word");
  const word = DRILL_WORDS.find((w) => w.dict === ja);
  if (!word) throw new Error(`문제의 낱말을 찾지 못함: ${ja}`);
  return ask.includes("읽는 법은?") ? word.reading : word.ko;
}

test("활용을 다루지 않는 5과 끝 확인 문제는 이 과 쓰임(が를 쓰는 な형용사)을 먼저 묻고, 낱말 문제로 채운다", async ({
  page,
}) => {
  await login(page, `/ilmunta/${ILMUNTA_WORDS_ONLY_LESSON}`);
  const quiz = page.getByRole("region", { name: /확인 문제 · 이 과 쓰임/ });
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText("1 / 3")).toBeAttached();

  // 쓰임 문제 둘: 한국어는 '~을 좋아하다'지만 일본어는 が. を를 고르면 정답 が와 까닭을 보인다
  for (const n of [1, 2]) {
    await expect(quiz.getByText(`${n} / 3`)).toBeAttached();
    await expect(quiz.getByText("빈칸에 알맞은 조사는?")).toBeVisible();
    await quiz
      .locator("ul li button")
      .filter({ hasText: /^\d?\s*を$/ })
      .click();
    await expect(quiz.getByText("정답은 が")).toBeVisible();
    await expect(
      quiz.getByText(/한국어로는 다른 조사를 쓰지만 일본어는 「が」/),
    ).toBeVisible();
    await quiz.getByRole("button", { name: "다음 →" }).click();
  }

  // 셋째는 이 과 낱말 문제
  await expect(quiz.getByText("3 / 3")).toBeAttached();
  const right = await rightLabel(quiz);
  const labels = await quiz.locator("ul li button").allInnerTexts();
  const wrong = labels.findIndex(
    (l) =>
      !l
        .replace(/^\d\s*/, "")
        .trim()
        .startsWith(right),
  );
  await quiz.locator("ul li button").nth(wrong).click();
  await expect(quiz.getByText(`정답은 ${right}`)).toBeVisible();
});

test("활용을 다루지 않는 과에도 지금까지 나온 활용을 섞는 드릴 바로 가기가 있다", async ({
  page,
}) => {
  await login(page, `/ilmunta/${ILMUNTA_WORDS_ONLY_LESSON}`);
  const link = page.getByRole("link", { name: /활용 복습 드릴 · 1~5과/ });
  await link.click();
  await expect(page).toHaveURL(/\/ilmunta\/drill\?upto=5$/);
  await expect(page.getByText("1~5과 복습")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "쓰기", exact: true }),
  ).toBeVisible();
});

test("일문따 드릴에서 답한 뒤 정답 문장을 기계 음성으로 들을 수 있고, 기계 음성이라고 알린다", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await login(page, "/ilmunta/drill");
  await page.getByRole("button", { name: "쓰기", exact: true }).click();
  const input = page.getByLabel("답");
  await input.fill("ぬ");
  await input.press("Enter");
  await expect(page.getByText("다시 보기")).toBeVisible();

  const listen = page.getByRole("button", { name: "이 문장 듣기" });
  await expect(page.getByText("기계 음성으로 읽은 소리예요")).toBeVisible();
  await listen.click();
  await expect.poll(async () => (await spoken(page)).length).toBe(1);

  const filled = await page.getByTestId("drill-filled").evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    for (const rt of copy.querySelectorAll("rt")) rt.remove();
    return (copy.textContent ?? "").replace(/\s/g, "");
  });
  const [said] = await spoken(page);
  expect(said.length).toBeGreaterThan(1);
  expect(filled).toContain(said.replace(/\s/g, ""));
});

test("사전 낱말 화면에서 낱말이 든 교재 문장 구간을 듣고, 낱말만은 기계 음성으로도 듣는다", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await page.goto(`/words/${encodeURIComponent(TAP_WORD.surface)}`);
  // 가짜 교재에서 이 낱말은 단어 카드가 아니라 문형 예문 속에만 있고, 그 문장 구간을 찾을 수 있다
  await expect(
    page
      .getByRole("button", { name: "낱말 듣기(교재 문장 속)" })
      .locator("visible=true")
      .first(),
  ).toBeVisible();
  const button = page
    .getByRole("button", { name: "낱말 듣기(기계 음성)" })
    .locator("visible=true")
    .first();
  await button.click();
  await expect.poll(() => spoken(page)).toEqual([TAP_WORD.surface]);
});
