"use strict";

const BLOCKS = {
  matrix0: {
    get: [CMD.GET_MATRIX, 0],
    set: [CMD.SET_MATRIX, 0],
    label: "bMatrix0",
  },
  matrix1: {
    get: [CMD.GET_MATRIX, 1],
    set: [CMD.SET_MATRIX, 1],
    label: "bMatrix1",
  },
  led: { get: [CMD.GET_LED, 0], set: [CMD.SET_LED, 0], label: "bLed" },
  rgb: { get: [CMD.GET_RGBTAB, 0], set: [CMD.SET_RGBTAB, 0], label: "bRgb" },
  colors: {
    get: [CMD.GET_COLORS, 0],
    set: [CMD.SET_COLORS, 0],
    label: "bColors",
  },
};
const ORDER = ["matrix0", "matrix1", "led", "rgb", "colors"];
let first = null,
  dev0 = null,
  cur = null,
  N = 0;
const clone = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.slice()]));
const ledOk = (led) =>
  !!led && led.length >= LED_SIZE && led[0x7e] === 0x5a && led[0x7f] === 0xa5;
const dirtyKeys = () =>
  cur ? ORDER.filter((k) => !same(cur[k], dev0[k])) : [];

async function readKeyboard() {
  const on = await readAll(CMD.GET_ONLINE);
  if (!on.length || on[0] !== 1) {
    showAsleep(true);
    throw new Error("asleep");
  }
  showAsleep(false);
  const got = {};
  for (const k of ORDER) got[k] = await readAll(...BLOCKS[k].get);
  if (!ledOk(got.led) || !got.colors.length || got.colors.length % 3)
    throw new Error("comm");
  if (!first) {
    first = clone(got);
    autoBackup(first);
  }
  dev0 = clone(got);
  cur = clone(got);
  N = cur.colors.length / 3;
  const e = effectOf(cur.led[OFF.MODE]);
  if (e && !e.firmwareOnly) cur.led[OFF.CUSTOM] = e.custom ? 1 : 0;
  try {
    const b = await readAll(CMD.GET_STATUS);
    if (b.length && b[0] <= 100) battery = b[0];
  } catch {}
}
let battery = null;

async function saveToKeyboard() {
  if (dirtyKeys().includes("colors") && cur.led[OFF.MODE] !== MODE_CUSTOM)
    setMode(cur.led, MODE_CUSTOM);
  const ks = dirtyKeys();
  if (!ks.length) return;
  const totalPk = ks.reduce((n, k) => n + Math.ceil(cur[k].length / CHUNK), 0);
  let donePk = 0,
    allOk = true;
  const progress = () => {
    donePk++;
    const p = Math.round((donePk * 100) / totalPk);
    $("progress").style.width = p + "%";
    $("bSave").textContent = t("saving", { p });
  };
  for (const k of ks) {
    if (k === "led" && !ledOk(cur.led)) throw new Error("comm");
    await writeCmd(BLOCKS[k].set[0], cur[k], BLOCKS[k].set[1], progress);
    await sleep(60);
    const back = await readAll(...BLOCKS[k].get);
    if (!same(back, cur[k])) allOk = false;
    dev0[k] = back;
  }
  cur = clone(dev0);
  toast(allOk ? t("saved") : t("savedPartly"), allOk ? "ok" : "warn");
}
