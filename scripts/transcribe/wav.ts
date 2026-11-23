/** 16비트 PCM wav를 읽고 구간을 잘라 새 wav로 만든다. 조각마다 ffmpeg를 띄우지 않으려고 둔다. */

export type Pcm = { sampleRate: number; channels: number; data: Buffer };

export function readWav(buf: Buffer): Pcm {
  if (
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("wav 파일이 아니다");
  }
  let pos = 12;
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (bits !== 16)
        throw new Error(`16비트 PCM만 다룬다(받은 것: ${bits}비트)`);
      const end = Math.min(buf.length, body + size);
      return { sampleRate, channels, data: buf.subarray(body, end) };
    }
    pos = body + size + (size % 2);
  }
  throw new Error("wav에 data 덩어리가 없다");
}

export function durationOf(pcm: Pcm): number {
  return pcm.data.length / (pcm.sampleRate * pcm.channels * 2);
}

/** [start, end) 초 구간을 잘라 wav 파일 내용으로 만든다. */
export function sliceWav(pcm: Pcm, start: number, end: number): Buffer {
  const frame = pcm.channels * 2;
  const total = pcm.data.length / frame;
  const from = Math.max(0, Math.min(total, Math.floor(start * pcm.sampleRate)));
  const to = Math.max(from, Math.min(total, Math.ceil(end * pcm.sampleRate)));
  const data = pcm.data.subarray(from * frame, to * frame);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(pcm.channels, 22);
  header.writeUInt32LE(pcm.sampleRate, 24);
  header.writeUInt32LE(pcm.sampleRate * frame, 28);
  header.writeUInt16LE(frame, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
