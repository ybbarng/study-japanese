import { defineConfig, devices } from "@playwright/test";
import { E2E_PASSWORD } from "./e2e/helpers/auth";

// 브라우저 E2E. 빌드해 둔 앱(next build)을 가짜 교재로 띄워 핵심 흐름을 돈다.
// `pnpm test:e2e`가 빌드한 뒤 부른다. 매 커밋 CI가 아니라 .github/workflows/e2e.yml에서 따로 돈다.

const PORT = 3471;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"]],
  use: {
    baseURL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    // 시험은 실제 마이크를 쓰지 않는다. 따라 말하기 화면이 녹음을 요청해도 맥의 권한 창이 뜨지 않게 가짜 장치로
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  projects: [
    {
      // 사용자는 안드로이드 Chrome으로 쓴다
      name: "android-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "pnpm exec tsx e2e/serve.ts",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      E2E_PORT: String(PORT),
      SITE_PASSWORD: E2E_PASSWORD,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
    },
  },
});
