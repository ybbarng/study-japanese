import type { Metadata } from "next";
import { Hydrated } from "@/components/kana/hydrated";
import { KanaWrite } from "@/components/kana/kana-write";

export const metadata: Metadata = { title: "써 보기 · かな" };

export default function KanaWritePage() {
  return (
    <Hydrated>
      <KanaWrite />
    </Hydrated>
  );
}
