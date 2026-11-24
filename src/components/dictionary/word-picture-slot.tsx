import { PictureMark } from "@/components/pictures/picture-mark";
import { pictureOf } from "@/lib/pictures";

/**
 * 낱말 사전 머리의 그림 자리. 그린 그림(SVG)이 있으면 그것, 없으면 그림 문자를 크게 보인다.
 * 그림이 없는 낱말은 아무것도 그리지 않는다. 서버에서 그림을 골라 그려 그림 표를 화면에 보내지 않는다.
 */
export function WordPictureSlot({ word }: { word: string }) {
  const p = pictureOf(word);
  if (!p) return null;
  const mark = p.kind === "svg" ? { picture: p.id } : { emoji: p.emoji };
  return (
    <div
      data-word-picture
      aria-hidden="true"
      className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-bg-raised lg:h-32 lg:w-32"
    >
      <PictureMark {...mark} size={80} className="lg:hidden" />
      <PictureMark {...mark} size={108} className="hidden lg:inline-flex" />
    </div>
  );
}
