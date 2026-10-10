"use strict";

const effectOf = (mode) =>
  mode === 0 ? EFFECT_OFF : EFFECTS.find((e) => e.mode === mode);
const curEffect = () => effectOf(cur.led[OFF.MODE]) ?? EFFECTS[0];
function setMode(block, mode) {
  block[OFF.MODE] = mode;
  block[OFF.CUSTOM] = mode === MODE_CUSTOM ? 1 : 0;
}
const slotByte = (slot, i) => OFF.SLOTS + 2 * slot + i;
const palRGB = (slot, j) => {
  const o = (slot + 1) * 21 + j * 3;
  return [cur.rgb[o], cur.rgb[o + 1], cur.rgb[o + 2]];
};
const css = (c) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;
const toHex = (c) =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const isBlack = (c) => c.every((v) => v < 3);
const colorIndex = (e) => cur.led[slotByte(e.slot, 1)] & 0x0f;

function buildEffects() {
  const box = $("effects");
  box.textContent = "";
  for (const e of [...EFFECTS.filter((x) => !x.missing), EFFECT_OFF]) {
    const b = document.createElement("button");
    b.textContent = L(e);
    b.dataset.mode = e.mode;
    b.onclick = () => {
      if (!cur || anim) return;
      setMode(cur.led, e.mode);
      refresh();
    };
    box.appendChild(b);
  }
}
function renderLight() {
  const e = curEffect(),
    mode = cur.led[OFF.MODE],
    missing = !!effectOf(mode)?.missing;
  for (const b of $("effects").children)
    b.classList.toggle("on", +b.dataset.mode === mode);
  $("effName").textContent = L(e);
  const hasSlot = e.slot >= 0 && !missing;
  $("wBright").hidden = !hasSlot;
  $("wSpeed").hidden = !hasSlot || !e.speed;
  $("wColor").hidden = !hasSlot || !(e.color || e.multi);
  if (!hasSlot) {
    $("effNote").textContent = effectOf(mode)?.firmwareOnly
      ? t("noteFirmware")
      : missing
        ? t("noteMissing")
        : t("noteOff");
    return;
  }
  const bright = cur.led[slotByte(e.slot, 0)],
    sp = cur.led[slotByte(e.slot, 1)];
  $("rBright").value = bright;
  $("vBright").textContent = bright;
  $("rSpeed").value = sp >> 4;
  $("vSpeed").textContent = sp >> 4;
  const pal = $("palette");
  pal.textContent = "";
  if (e.color)
    for (let j = 0; j < 7; j++) {
      const b = document.createElement("button");
      b.className = "swatch" + ((sp & 15) === j ? " on" : "");
      b.style.background = css(palRGB(e.slot, j));
      b.title = toHex(palRGB(e.slot, j));
      b.onclick = () => setColorIndex(j);
      pal.appendChild(b);
    }
  if (e.multi) {
    const b = document.createElement("button");
    b.className = "swatch rainbow" + ((sp & 15) === 7 ? " on" : "");
    b.title = t("multicolor");
    b.onclick = () => setColorIndex(7);
    pal.appendChild(b);
  }
  $("bPalEdit").hidden = !e.color || (sp & 15) === 7;
  const notes = [e.custom ? t("noteCustom") : t("noteEach")];
  if (bright === 0) notes.push(t("noteBright0"));
  if (e.color && [0, 1, 2, 3, 4, 5, 6].every((j) => isBlack(palRGB(e.slot, j))))
    notes.push(t("notePalBlack"));
  else if (e.color && (sp & 15) < 7 && isBlack(palRGB(e.slot, sp & 15)))
    notes.push(t("noteColorBlack"));
  $("effNote").textContent = notes.join(" ");
}
function setColorIndex(idx) {
  const e = curEffect(),
    o = slotByte(e.slot, 1);
  cur.led[o] = (cur.led[o] & 0xf0) | idx;
  refresh();
}
function initLight() {
  $("rBright").oninput = () => {
    const e = curEffect();
    if (e.slot >= 0) {
      cur.led[slotByte(e.slot, 0)] = +$("rBright").value;
      refresh();
    }
  };
  $("rSpeed").oninput = () => {
    const e = curEffect();
    if (e.slot < 0) return;
    const o = slotByte(e.slot, 1);
    cur.led[o] = (+$("rSpeed").value << 4) | (cur.led[o] & 0x0f);
    refresh();
  };
  $("bPalEdit").onclick = () => {
    const e = curEffect();
    $("palEdit").value = toHex(palRGB(e.slot, colorIndex(e)));
    $("palEdit").click();
  };
  $("palEdit").oninput = () => {
    const e = curEffect(),
      j = colorIndex(e);
    if (j > 6) return;
    const v = $("palEdit").value,
      o = (e.slot + 1) * 21 + j * 3;
    [1, 3, 5].forEach((p, i) => {
      cur.rgb[o + i] = parseInt(v.slice(p, p + 2), 16);
    });
    refresh();
  };
}
