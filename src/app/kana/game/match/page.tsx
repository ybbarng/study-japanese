import type { Metadata } from "next";
import { Hydrated } from "@/components/kana/hydrated";
import { MatchGame } from "@/components/kana/match-game";

export const metadata: Metadata = { title: "짝 맞추기 · かな" };

export default function MatchPage() {
  return (
    <Hydrated>
      <MatchGame />
    </Hydrated>
  );
}
