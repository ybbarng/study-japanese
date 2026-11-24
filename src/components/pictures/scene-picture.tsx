"use client";

import { cn } from "@/lib/cn";
import type { Book, ScenePart } from "@/lib/pictures/types";
import { usePictureTable } from "./use-picture-table";

/**
 * 강·과의 장면 그림(회화 장면 등). 그림이 없으면 아무것도 그리지 않는다.
 * 그림은 320×200 비율로 그려져 있고 너비에 맞춰 늘어난다(최대 너비는 className으로).
 * 그림 표는 따로 불러온다(use-picture-table.ts).
 *
 * 예: `<ScenePicture book="ilmuta" lessonNo={3} className="max-w-md" />`
 */
export function ScenePicture({
  book,
  lessonNo,
  part = "conversation",
  className,
}: {
  book: Book;
  lessonNo: number;
  part?: ScenePart;
  className?: string;
}) {
  const table = usePictureTable();
  const scene = table?.sceneOf(book, lessonNo, part);
  if (!scene) return null;
  return (
    <figure className={cn("w-full", className)}>
      {/* biome-ignore lint/performance/noImgElement: 작은 SVG라 next/image 최적화가 필요 없다 */}
      <img
        src={scene.src}
        alt={scene.label}
        width={320}
        height={200}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-auto w-full"
      />
    </figure>
  );
}
