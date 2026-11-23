import type { ListenIndex } from "@/lib/ilmuta/progress";
import type { LessonData } from "@/lib/ilmuta/server-data";

/** 단계 화면이 받는 것 */
export interface StepProps {
  data: LessonData;
  listens: ListenIndex;
}
