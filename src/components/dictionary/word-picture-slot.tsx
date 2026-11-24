import { WordPicture } from "@/components/pictures/word-picture";
import { pictureOf } from "@/lib/pictures";

/**
 * 낱말 사전 머리의 그림 자리. 그린 그림(SVG)이 있으면 그것, 없으면 그림 문자를 크게 보인다.
 * 그림이 없는 낱말은 아무것도 그리지 않는다.
 */
export function WordPictureSlot({ word }: { word: string }) {
  if (!pictureOf(word)) return null;
  return (
    <div
      data-word-picture
      aria-hidden="true"
      className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-bg-raised lg:h-32 lg:w-32"
    >
      <WordPicture ja={word} size={80} className="lg:hidden" />
      <WordPicture ja={word} size={108} className="hidden lg:inline-flex" />
    </div>
  );
}
