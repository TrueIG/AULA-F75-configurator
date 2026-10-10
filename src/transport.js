"use strict";

let dev = null,
  queue = [],
  wake = null,
  busy = false;

function build(cmd, total, idx, subLen, data) {
  const p = new Uint8Array(20);
  p[0] = RID;
  p[1] = cmd;
  p[2] = total;
  p[3] = idx;
  p[4] = subLen;
  if (data) p.set(data.subarray(0, CHUNK), 5);
  let s = 0;
  for (let i = 0; i < 19; i++) s += p[i];
  p[19] = s & 0xff;
  return p;
}
const send = (p) => dev.sendReport(RID, p.slice(1));
function onInput(e) {
  if (e.reportId !== RID) return;
  const d = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
  const r = new Uint8Array(20);
  r[0] = RID;
  r.set(d.subarray(0, 19), 1);
  if (r[1] === CMD.EVENT) {
    if (r[5] === 2) onOnlineEvent(r[6]);
    return;
  }
  if ((r[1] & 0x7f) === (CMD.REALTIME & 0x7f)) return;
  queue.push(r);
  if (wake) {
    const w = wake;
    wake = null;
    w();
  }
}
async function recv(cmd, timeout = 1000) {
  const end = performance.now() + timeout;
  for (;;) {
    const i = queue.findIndex((r) => (r[1] & 0x7f) === cmd);
    if (i >= 0) return queue.splice(i, 1)[0];
    const left = end - performance.now();
    if (left <= 0) return null;
    await new Promise((res) => {
      const tm = setTimeout(() => {
        wake = null;
        res();
      }, left);
      wake = () => {
        clearTimeout(tm);
        res();
      };
    });
  }
}
async function readAll(cmd, sub = 0, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    queue = [];
    await send(build(cmd, 1, 0, sub << 4));
    const parts = new Map();
    for (;;) {
      const r = await recv(cmd);
      if (!r || r[1] & 0x80 || r[2] & 0x80) break;
      const total = r[2] & 0x7f,
        idx = r[3],
        ln = Math.min(r[4] & 0x0f, CHUNK);
      parts.set(idx, r.slice(5, 5 + ln));
      if (idx + 1 >= total) {
        if (parts.size === total) {
          let n = 0;
          for (let k = 0; k < total; k++) n += parts.get(k).length;
          const out = new Uint8Array(n);
          let o = 0;
          for (let k = 0; k < total; k++) {
            out.set(parts.get(k), o);
            o += parts.get(k).length;
          }
          return out;
        }
        break;
      }
    }
    await sleep(100);
  }
  throw new Error("comm");
}
async function writeCmd(cmd, data, sub = 0, onPacket = null, tries = 5) {
  const total = Math.ceil(data.length / CHUNK);
  queue = [];
  for (let idx = 0; idx < total; idx++) {
    const chunk = data.subarray(idx * CHUNK, (idx + 1) * CHUNK);
    const p = build(cmd, total, idx, (sub << 4) | chunk.length, chunk);
    let ok = false;
    for (let attempt = 1; attempt <= tries && !ok; attempt++) {
      await send(p);
      const r = await recv(cmd);
      ok = !!r && !(r[2] & 0x80) && r[3] === idx;
      if (!ok) await sleep(100);
    }
    if (!ok) throw new Error("comm");
    if (onPacket) onPacket();
  }
}

const clockWorker = new Worker(
  URL.createObjectURL(
    new Blob(
      ["onmessage = e => setTimeout(() => postMessage(e.data.id), e.data.ms);"],
      { type: "text/javascript" },
    ),
  ),
);
const clockWaits = new Map();
let clockId = 0;
clockWorker.onmessage = (e) => {
  const r = clockWaits.get(e.data);
  clockWaits.delete(e.data);
  if (r) r();
};
const tick = (ms) =>
  new Promise((res) => {
    const id = ++clockId;
    clockWaits.set(id, res);
    clockWorker.postMessage({ id, ms });
  });

async function sendRealtime(sub, data) {
  const total = Math.ceil(data.length / CHUNK);
  for (let idx = 0; idx < total; idx++) {
    await tick(PACKET_GAP_MS);
    const chunk = data.subarray(idx * CHUNK, (idx + 1) * CHUNK);
    await send(
      build(CMD.REALTIME, total, idx, (sub << 4) | chunk.length, chunk),
    );
  }
}
