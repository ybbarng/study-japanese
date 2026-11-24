import type { Page } from "@playwright/test";

/**
 * 브라우저 음성 합성(Web Speech API)을 흉내 낸다. 시험용 Chromium에는 일본어 음성이 없어서,
 * 일본어 음성 하나가 있는 기기처럼 꾸미고 읽으라고 넘긴 글을 `window.__spoken`에 모은다.
 * 페이지를 열기 전에 부른다.
 */
export async function fakeJapaneseVoice(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __spoken: string[];
      SpeechSynthesisUtterance: unknown;
    };
    w.__spoken = [];
    class FakeUtterance {
      text: string;
      voice: unknown = null;
      lang = "";
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    w.SpeechSynthesisUtterance = FakeUtterance;
    const voice = { lang: "ja-JP", name: "Kyoko", localService: true };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [voice],
        speak: (u: FakeUtterance) => {
          w.__spoken.push(u.text);
          setTimeout(() => u.onend?.(), 20);
        },
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });
}

/** 지금까지 음성 합성에 넘긴 글 */
export function spoken(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __spoken: string[] }).__spoken,
  );
}
