import { describe, expect, it } from "vitest";
import { silenceWav } from "./silence";

describe("silenceWav", () => {
  it("요청한 길이만큼의 8kHz 무음 WAV를 만든다", () => {
    const wav = silenceWav(1.5);
    const view = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint32(40, true)).toBe(12000);
    expect(wav.length).toBe(44 + 12000);
    expect(wav[44 + 6000]).toBe(128);
  });
});
