import { emojiOf } from "@/lib/context/emoji";

/**
 * 낱말 그림 자리. 지금은 맥락 카드가 쓰는 그림 문자 표(emoji.ts)를 보인다.
 * 다른 작업이 만드는 그림 부품(src/components/context/word-picture.tsx)이 생기면 이 자리에 끼운다.
 * 그림이 없는 낱말은 아무것도 그리지 않는다.
 */
export function WordPictureSlot({ word }: { word: string }) {
  const emoji = emojiOf(word);
  if (!emoji) return null;
  return (
    <div
      data-word-picture
      aria-hidden="true"
      className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-bg-raised text-6xl lg:h-32 lg:w-32 lg:text-7xl"
    >
      {emoji}
    </div>
  );
}
