import { describe, expect, it } from "vitest";
import { FakeCache } from "./__fixtures__/fakes";
import { effectivePack, inspectPack } from "./inspect";
import type { FileKind, OfflinePack } from "./pack";

const AUDIO = "/media/ilmuta/L03.mp3";
const DATA = "/api/transcripts/ilmuta/L03";
const PIC = "/pictures/words/m01-cat.svg";

const basic: OfflinePack = {
  id: "ilmuta-3",
  book: "ilmuta",
  no: 3,
  title: "3강",
  pageUrl: "/ilmuta/3",
  audioUrls: [AUDIO],
};
const full: OfflinePack = {
  ...basic,
  dataUrls: [DATA],
  pictureUrls: [PIC],
  full: true,
};

function caches() {
  const byKind: Record<FileKind, FakeCache> = {
    page: new FakeCache(),
    audio: new FakeCache(),
    data: new FakeCache(),
    picture: new FakeCache(),
  };
  return { byKind, cacheOf: async (k: FileKind) => byKind[k] };
}

describe("inspectPack", () => {
  it("강 화면·오디오·자막·그림을 갈래별 캐시에서 세어 크기를 더한다", async () => {
    const { byKind, cacheOf } = caches();
    byKind.page.seed("/ilmuta/3", 10);
    byKind.audio.seed(AUDIO, 300);
    byKind.data.seed(DATA, 20);
    byKind.picture.seed(PIC, 5);
    expect(await inspectPack(full, cacheOf)).toEqual({
      present: 4,
      total: 4,
      bytes: 335,
      audioPresent: 1,
    });
  });

  it("그림 하나가 빠지면 일부만 받은 것으로 센다", async () => {
    const { byKind, cacheOf } = caches();
    byKind.page.seed("/ilmuta/3", 10);
    byKind.audio.seed(AUDIO, 300);
    byKind.data.seed(DATA, 20);
    expect(await inspectPack(full, cacheOf)).toMatchObject({
      present: 3,
      total: 4,
    });
  });

  it("자막·그림 목록이 없는 예전 묶음은 오디오가 다 있어도 다 받은 것이 아니다", async () => {
    const { byKind, cacheOf } = caches();
    byKind.page.seed("/ilmuta/3", 10);
    byKind.audio.seed(AUDIO, 300);
    expect(await inspectPack(basic, cacheOf)).toEqual({
      present: 2,
      total: 3,
      bytes: 310,
      audioPresent: 1,
    });
  });

  it("둘러보며 담긴 강 화면만 있고 오디오가 없으면 받은 오디오는 0이다", async () => {
    const { byKind, cacheOf } = caches();
    byKind.page.seed("/ilmuta/3", 10);
    expect((await inspectPack(basic, cacheOf)).audioPresent).toBe(0);
  });
});

describe("effectivePack", () => {
  it("서버가 다 채워 저장한 묶음이 있으면 그것으로 상태를 본다", () => {
    expect(effectivePack(basic, full)).toBe(full);
  });

  it("저장한 묶음이 예전 것이면 화면이 만든 묶음으로 본다", () => {
    expect(effectivePack(basic, { ...basic, title: "옛" })).toBe(basic);
  });
});
