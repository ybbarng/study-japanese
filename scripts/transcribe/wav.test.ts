import { describe, expect, it } from "vitest";
import { durationOf, readWav, sliceWav } from "./wav";

/** 표본값이 0,1,2,…인 16비트 모노 wav(표본 빈도 10) */
function sampleWav(samples: number) {
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(i, i * 2);
  return sliceWav({ sampleRate: 10, channels: 1, data }, 0, samples / 10);
}

describe("wav 읽고 자르기", () => {
  it("만든 wav를 다시 읽으면 같은 표본 빈도·길이가 나온다", () => {
    const pcm = readWav(sampleWav(30));
    expect(pcm.sampleRate).toBe(10);
    expect(pcm.channels).toBe(1);
    expect(durationOf(pcm)).toBe(3);
  });

  it("초 구간을 잘라 그 구간의 표본만 담는다", () => {
    const part = readWav(sliceWav(readWav(sampleWav(30)), 1, 1.5));
    expect(
      [...Array(part.data.length / 2)].map((_, i) =>
        part.data.readInt16LE(i * 2),
      ),
    ).toEqual([10, 11, 12, 13, 14]);
  });

  it("fmt·data 사이의 다른 덩어리(LIST)는 건너뛴다", () => {
    const wav = sampleWav(4);
    const list = Buffer.concat([
      Buffer.from("LIST"),
      Buffer.from([3, 0, 0, 0]),
      Buffer.from([1, 2, 3, 0]),
    ]);
    const withList = Buffer.concat([
      wav.subarray(0, 36),
      list,
      wav.subarray(36),
    ]);
    expect(durationOf(readWav(withList))).toBe(0.4);
  });

  it("wav가 아니면 알린다", () => {
    expect(() => readWav(Buffer.from("not a wav file at all"))).toThrow(
      "wav 파일이 아니다",
    );
  });
});
