"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNowPlaying, usePlay } from "@/components/ilmuta/use-player-bridge";
import { InlineKey, KeyHelp, SidePanel } from "@/components/keyboard/key-help";
import { toKeyInput } from "@/components/keyboard/key-input";
import type { Bridge } from "@/lib/bridge/bridges";
import { BRIDGE_KEY_HELP, bridgeKeyAction } from "@/lib/bridge/keys";
import type { BridgeSentence as Sentence } from "@/lib/bridge/pick";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { ilmutaMediaUrl } from "@/lib/ilmuta/media";
import { useKanaStore } from "@/lib/kana/store";
import type { Track } from "@/lib/player/queue";
import { BridgeSentence } from "./bridge-sentence";
import s from "./kana.module.css";
import { cn, PrimaryButton, Screen, SecondaryButton } from "./ui";

function exampleTrack(x: Sentence): Track {
  return {
    book: "ilmuta",
    item: x.exampleId,
    kind: "example",
    src: ilmutaMediaUrl(x.exampleFile),
    title: `${lessonLabel(x.lessonNo)} 예문`,
    subtitle: "첫 읽기에서 들음",
  };
}

/** 이 문장들이 나오는 강 이름(“1강”, “2·3·5강”) */
function lessonsLabel(sentences: Sentence[]): string {
  const nos = [...new Set(sentences.map((x) => x.lessonNo))];
  return `${nos.join("·")}강`;
}

const plainText = (x: Sentence) => x.pieces.map((p) => p.text).join("");

/** 다리 레슨: 배운 글자로 일무따 예문을 한 줄씩 읽고, 다 읽으면 그 강으로 */
export function BridgeReader({
  bridge,
  sentences,
}: {
  bridge: Bridge;
  sentences: Sentence[];
}) {
  const [i, setI] = useState(-1); // -1: 들어가는 말
  const [meaning, setMeaning] = useState(false);
  const [sounds, setSounds] = useState(false);
  const completeLesson = useKanaStore((st) => st.completeLesson);
  const play = usePlay();
  const now = useNowPlaying();
  const router = useRouter();
  const done = i >= sentences.length;
  const firstLesson = sentences[0]?.lessonNo ?? bridge.lessonNos[0];

  const go = (next: number) => {
    setI(next);
    setMeaning(false);
    setSounds(false);
    if (next >= sentences.length) completeLesson(bridge.id);
  };

  // PC 키보드: Enter 다음, Backspace 앞, 1·2·3 한글 소리·듣기·뜻
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e) => {
    const a = bridgeKeyAction(toKeyInput(e));
    if (!a) return;
    if (done) {
      if (a !== "next") return;
      e.preventDefault();
      router.push(`/ilmuta/${firstLesson}`);
      return;
    }
    if (i === -1) {
      if (a !== "next") return;
      e.preventDefault();
      // 고를 문장이 없으면 0이 곧 끝(넘어가기)이다
      go(0);
      return;
    }
    e.preventDefault();
    if (a === "next") go(i + 1);
    else if (a === "prev") {
      if (i > 0) go(i - 1);
    } else if (a === "sounds") setSounds((v) => !v);
    else if (a === "meaning") setMeaning((v) => !v);
    else play([exampleTrack(sentences[i])]);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** PC 곁칸: 읽을 문장 목록(누르면 그 문장으로). 다 읽은 뒤에는 뜻도 함께 */
  const sentenceList = (
    <SidePanel title={`읽을 문장 ${sentences.length}개`}>
      <ol className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
        {sentences.map((x, k) => (
          <li key={`${x.exampleId}-${plainText(x)}`}>
            <button
              type="button"
              onClick={() => go(k)}
              aria-current={k === i ? "step" : undefined}
              className={cn(
                "flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left hover:bg-bg-raised",
                k === i && "bg-accent-soft",
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-xs",
                  k < i || done ? "text-good" : "text-ink-faint",
                )}
              >
                {k < i || done ? "✓" : k + 1}
              </span>
              <span className="min-w-0">
                <span lang="ja" className="block truncate font-ja text-lg">
                  {plainText(x)}
                </span>
                <span className="block text-xs text-ink-faint">
                  {lessonLabel(x.lessonNo)}
                  {done ? ` · ${x.ko}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </SidePanel>
  );

  if (i === -1)
    return (
      <Screen
        title={bridge.title}
        aside={
          <KeyHelp
            items={[
              { key: "Enter", label: "읽기 시작" },
              ...BRIDGE_KEY_HELP.filter((k) => k.key !== "Enter"),
            ]}
          />
        }
        asideLabel="키보드로 하기"
        footer={
          sentences.length > 0 ? (
            <PrimaryButton onClick={() => go(0)}>
              읽기 시작
              <InlineKey k="Enter" onAccent />
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => go(sentences.length)}>
              넘어가기
            </PrimaryButton>
          )
        }
      >
        <div
          className={cn("flex flex-1 flex-col justify-center gap-4", s.enter)}
        >
          <p lang="ja" className="font-ja-serif text-6xl font-bold">
            {bridge.glyphs}
          </p>
          {sentences.length > 0 ? (
            <>
              <p className="text-2xl font-bold">
                배운 글자로 진짜 문장을 읽어 봅니다
              </p>
              <p className="text-ink-soft">
                일무따 {lessonsLabel(sentences)}에 나오는 문장 가운데 지금까지
                배운 글자만으로 읽을 수 있는 {sentences.length}개를 골랐어요.
                한자에는 읽는 법을 위에 달았습니다.
              </p>
              <ul className="space-y-1 text-sm text-ink-soft">
                <li>· 글자를 누르면 그 글자 소리</li>
                <li>· “문장 듣기”는 이 문장이 든 교재 예문을 처음부터</li>
                <li>· 뜻은 가려 두었다가 읽은 뒤에 보기</li>
              </ul>
            </>
          ) : (
            <p className="text-ink-soft">
              지금은 고를 문장이 없습니다. 교재 데이터가 서버에 있는지 확인해
              주세요.
            </p>
          )}
        </div>
      </Screen>
    );

  if (done)
    return (
      <Screen
        title={bridge.title}
        aside={sentences.length > 0 ? sentenceList : null}
        asideLabel="읽은 문장"
      >
        <div
          className={cn(
            "flex flex-1 flex-col justify-center gap-4 lg:max-w-xl",
            s.enter,
          )}
        >
          <p lang="ja" className="font-ja-serif text-6xl font-bold">
            読
          </p>
          <p className="text-2xl font-bold">
            {sentences.length > 0
              ? `${sentences.length}문장을 읽었어요`
              : "첫 읽기를 넘겼어요"}
          </p>
          {sentences.length > 0 ? (
            <p className="text-ink-soft">
              이 문장들이 일무따 {lessonsLabel(sentences)}에 나옵니다. 강의에서
              다시 만나면 눈으로도 알아볼 수 있어요.
            </p>
          ) : null}
          <Link
            href={`/ilmuta/${firstLesson}`}
            className="grid h-14 place-items-center rounded-2xl bg-accent text-lg font-bold text-white"
          >
            <span>
              {lessonLabel(firstLesson)}으로 →
              <InlineKey k="Enter" onAccent />
            </span>
          </Link>
          <Link
            href="/kana"
            className="grid h-14 place-items-center rounded-2xl bg-bg-raised text-lg"
          >
            가나로 돌아가기
          </Link>
        </div>
      </Screen>
    );

  const x = sentences[i];
  const playingThis = now.item === x.exampleId && now.playing;
  return (
    <Screen
      progress={i / sentences.length}
      aside={
        <>
          {sentenceList}
          <KeyHelp items={BRIDGE_KEY_HELP} />
        </>
      }
      asideLabel="읽을 문장과 키보드"
      footer={
        <div className="flex gap-3">
          {i > 0 ? (
            <SecondaryButton
              className="w-20 lg:w-32"
              aria-label="앞 문장"
              onClick={() => go(i - 1)}
            >
              ←
              <InlineKey k="⌫" />
            </SecondaryButton>
          ) : null}
          <PrimaryButton onClick={() => go(i + 1)}>
            {i + 1 >= sentences.length ? "다 읽었어요" : "다음 문장"}
            <InlineKey k="Enter" onAccent />
          </PrimaryButton>
        </div>
      }
    >
      <p className="pt-2 text-center text-sm text-ink-soft">
        일무따 {lessonLabel(x.lessonNo)} · 소리 내어 읽어 보세요
      </p>
      <div
        key={i}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-6 lg:gap-8",
          s.enter,
        )}
      >
        <BridgeSentence pieces={x.pieces} showSounds={sounds} />
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSounds((v) => !v)}
            className="rounded-full bg-bg-raised px-4 py-2"
          >
            {sounds ? "한글 소리 가리기" : "한글 소리 보기"}
            <InlineKey k="1" />
          </button>
          <button
            type="button"
            onClick={() => play([exampleTrack(x)])}
            className="rounded-full bg-bg-raised px-4 py-2"
          >
            {playingThis ? "❚❚ 멈추기" : "▶ 문장 듣기"}
            <InlineKey k="2" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMeaning((v) => !v)}
          aria-expanded={meaning}
          className="min-h-16 w-full rounded-2xl border border-dashed border-line px-4 py-3 text-lg lg:max-w-2xl"
        >
          {meaning ? x.ko : "뜻 보기"}
          {meaning ? null : <InlineKey k="3" />}
        </button>
      </div>
      <p className="pt-2 text-center text-xs text-ink-faint">
        {i + 1} / {sentences.length}
      </p>
    </Screen>
  );
}
