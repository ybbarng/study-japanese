"use client";

import { PictureMark } from "./picture-mark";
import { usePictureTable } from "./use-picture-table";

/**
 * 낱말로 그림을 찾아 그린다(그린 그림 → 그림 문자 → 없음). 낱말 정보 창·단어 카드처럼
 * 서버가 그림을 골라 주지 않는 곳에 쓴다. 그림 표는 따로 불러와, 표가 오면 그림이 나타난다.
 * 서버 컴포넌트에서는 `pictureOf`로 고른 값을 `PictureMark`에 넘긴다(표를 화면에 보내지 않게).
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
  const table = usePictureTable();
  const p = table?.pictureOf(ja);
  if (!p) return null;
  return p.kind === "svg" ? (
    <PictureMark picture={p.id} size={size} className={className} />
  ) : (
    <PictureMark emoji={p.emoji} size={size} className={className} />
  );
}
