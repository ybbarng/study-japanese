import type { Metadata } from "next";
import { Hydrated } from "@/components/kana/hydrated";
import { KanaHome } from "@/components/kana/kana-home";

export const metadata: Metadata = { title: "かな · にほんご" };

export default function KanaPage() {
  return (
    <Hydrated>
      <KanaHome />
    </Hydrated>
  );
}
