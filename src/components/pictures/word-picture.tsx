import { pictureOf } from "@/lib/pictures";
import { PictureMark } from "./picture-mark";

/**
 * 낱말로 그림을 찾아 그린다(그린 그림 → 그림 문자 → 없음). 낱말 정보 창·단어 카드처럼
 * 서버가 그림을 골라 주지 않는 곳에 쓴다. 그림 표를 함께 불러온다.
 *
 * 예: `<WordPicture ja="傘" size={48} />`, `～する`·`～な` 꼴도 찾는다.
 */
export function WordPicture({
  ja,
  size = 28,
  className,
}: {
  ja: string;
  size?: number;
  className?: string;
}) {
  const p = pictureOf(ja);
  if (!p) return null;
  return p.kind === "svg" ? (
    <PictureMark picture={p.id} size={size} className={className} />
  ) : (
    <PictureMark emoji={p.emoji} size={size} className={className} />
  );
}
