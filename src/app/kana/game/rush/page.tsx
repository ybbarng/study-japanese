import type { Metadata } from "next";
import { Hydrated } from "@/components/kana/hydrated";
import { RushGame } from "@/components/kana/rush-game";

export const metadata: Metadata = { title: "빠르게 읽기 · かな" };

export default function RushPage() {
  return (
    <Hydrated>
      <RushGame />
    </Hydrated>
  );
}
