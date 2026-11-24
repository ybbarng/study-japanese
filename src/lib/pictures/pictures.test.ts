import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EMOJI } from "@/lib/context/emoji";
import { checkSvg, type PictureKind } from "./check-svg";
import {
  pictureOf,
  SCENE_MANIFESTS,
  sceneOf,
  WORD_MANIFESTS,
  wordPictureId,
} from "./index";
import { PICTURE_ID, sceneKey } from "./types";

const PUBLIC = path.join(process.cwd(), "public", "pictures");
const filesOf = (kind: PictureKind) =>
  readdirSync(path.join(PUBLIC, kind))
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.slice(0, -4));

const wordIds = Object.values(WORD_MANIFESTS).flatMap((m) => Object.values(m));
const sceneIds = Object.values(SCENE_MANIFESTS).flatMap((m) =>
  Object.values(m).map((s) => s.id),
);

describe("pictureOf", () => {
  it("그린 그림이 있으면 그림 문자보다 먼저 고른다", () => {
    expect(EMOJI.傘).toBeDefined();
    expect(pictureOf("傘")).toEqual({
      kind: "svg",
      id: "umbrella",
      src: "/pictures/words/umbrella.svg",
    });
  });

  it("그린 그림이 없으면 그림 문자, 둘 다 없으면 undefined", () => {
    // 그림이 늘어도 깨지지 않게, 그린 그림이 없는 그림 문자 낱말을 골라 본다
    const emojiOnly = Object.keys(EMOJI).find((ja) => !wordPictureId(ja));
    expect(emojiOnly).toBeDefined();
    expect(pictureOf(emojiOnly as string)).toEqual({
      kind: "emoji",
      emoji: EMOJI[emojiOnly as string],
    });
    expect(pictureOf("意味")).toBeUndefined();
  });

  it("Object 기본 속성 이름에는 걸리지 않는다", () => {
    expect(wordPictureId("constructor")).toBeUndefined();
    expect(sceneOf("ilmuta", 0)).toBeUndefined();
  });
});

describe("sceneOf", () => {
  it("책·강 번호로 회화 장면을 찾는다", () => {
    expect(sceneKey("ilmuta", 3)).toBe("ilmuta-03-conversation");
    expect(sceneOf("ilmuta", 3)?.src).toBe(
      "/pictures/scenes/ilmuta-03-conversation.svg",
    );
  });
});

describe("그림 표", () => {
  it("같은 낱말이 두 범위 표에 들어가지 않는다", () => {
    const owner = new Map<string, string>();
    const twice: string[] = [];
    for (const [range, map] of Object.entries(WORD_MANIFESTS))
      for (const ja of Object.keys(map)) {
        const prev = owner.get(ja);
        if (prev) twice.push(`${ja}: ${prev}, ${range}`);
        owner.set(ja, range);
      }
    expect(twice).toEqual([]);
  });

  it("장면 열쇠는 책-강 두 자리-장면 꼴이다", () => {
    const keys = Object.values(SCENE_MANIFESTS).flatMap((m) => Object.keys(m));
    const bad = keys.filter(
      (k) => !/^(ilmuta|ilmunta)-\d{2}-(conversation|reading)$/.test(k),
    );
    expect(bad).toEqual([]);
  });

  it("그림 id는 영어 소문자·숫자·붙임표다", () => {
    const bad = [...wordIds, ...sceneIds].filter((id) => !PICTURE_ID.test(id));
    expect(bad).toEqual([]);
  });

  it("표가 가리키는 그림 파일이 모두 있다", () => {
    const missing = [
      ...wordIds.filter(
        (id) => !existsSync(path.join(PUBLIC, "words", `${id}.svg`)),
      ),
      ...sceneIds.filter(
        (id) => !existsSync(path.join(PUBLIC, "scenes", `${id}.svg`)),
      ),
    ];
    expect(missing).toEqual([]);
  });

  it("어느 표에도 없는 그림 파일이 없다", () => {
    const used = new Set([...wordIds, ...sceneIds]);
    const orphans = [
      ...filesOf("words").filter((id) => !used.has(id)),
      ...filesOf("scenes").filter((id) => !used.has(id)),
    ];
    expect(orphans).toEqual([]);
  });
});

describe("그림 파일", () => {
  it.each(["words", "scenes"] as const)(
    "%s 그림이 그리는 규칙을 지킨다",
    (kind) => {
      const problems = filesOf(kind).flatMap((id) =>
        checkSvg(
          readFileSync(path.join(PUBLIC, kind, `${id}.svg`), "utf8"),
          kind,
        ).map((p) => `${id}: ${p}`),
      );
      expect(problems).toEqual([]);
    },
  );
});
