import type { Metadata } from "next";
import { Hydrated } from "@/components/kana/hydrated";
import { ReviewSession } from "@/components/kana/review-session";

export const metadata: Metadata = { title: "오늘 복습 · かな" };

export default function ReviewPage() {
  return (
    <Hydrated>
      <ReviewSession />
    </Hydrated>
  );
}
