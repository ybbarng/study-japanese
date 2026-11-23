import { PlayerLab } from "./player-lab";

export const metadata = { title: "재생 시험 — にほんご" };

// 안드로이드 실제 폰에서 잠금 화면 조작·화면 끈 채 재생을 시험하는 화면(구축 계획 2단계).
const TRACKS = [
  {
    src: "/media/ilmuta/1.%20음성%20강의/L00.mp3",
    title: "0강 강의",
    album: "일본어 무작정 따라하기",
  },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    src: `/media/ilmuta/2.%20예문%20mp3/01-${n}.mp3`,
    title: `1강 예문 ${n}`,
    album: "일본어 무작정 따라하기",
  })),
];

export default function PlayerLabPage() {
  return <PlayerLab tracks={TRACKS} />;
}
