import { cn } from "@/lib/cn";
import { wordPictureSrc } from "@/lib/pictures/paths";

/**
 * 이미 고른 낱말 그림을 그린다. 표를 불러오지 않으므로, 서버가 고른 값(카드 낱말의 picture·emoji)을 받아 쓰는 곳에 쓴다.
 * 그린 그림(picture id)이 있으면 그것, 없으면 그림 문자, 둘 다 없으면 아무것도 그리지 않는다.
 * 낱말 뜻은 옆 글이 말하므로 그림은 꾸밈으로 둔다(화면 읽기 프로그램이 읽지 않음).
 */
export function PictureMark({
  picture,
  emoji,
  size = 28,
  className,
}: {
  picture?: string;
  emoji?: string;
  /** 한 변 px */
  size?: number;
  className?: string;
}) {
  if (picture)
    return (
      // biome-ignore lint/performance/noImgElement: 작은 SVG라 next/image 최적화가 필요 없다
      <img
        src={wordPictureSrc(picture)}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn("inline-block shrink-0 align-middle", className)}
      />
    );
  if (emoji)
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center align-middle leading-none",
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.8 }}
      >
        {emoji}
      </span>
    );
  return null;
}
