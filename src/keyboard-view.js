"use strict";

const bounds = (() => {
  const x0 = Math.min(...LAYOUT.map((k) => k.x)),
    y0 = Math.min(...LAYOUT.map((k) => k.y));
  return {
    x0,
    y0,
    w: Math.max(...LAYOUT.map((k) => k.x + k.w)) - x0,
    h: Math.max(...LAYOUT.map((k) => k.y + k.h)) - y0,
  };
})();
const keyName = (k) => (k.n === "Space" ? t("space") : k.n);
function makeKeyboard(el, { onDown, onEnter }) {
  el.style.aspectRatio = `${bounds.w} / ${bounds.h}`;
  const map = new Map();
  for (const k of LAYOUT) {
    const d = document.createElement("div");
    d.className = "key";
    Object.assign(d.style, {
      left: `${((k.x - bounds.x0) / bounds.w) * 100}%`,
      top: `${((k.y - bounds.y0) / bounds.h) * 100}%`,
      width: `${(k.w / bounds.w) * 100}%`,
      height: `${(k.h / bounds.h) * 100}%`,
    });
    d.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      onDown(k);
    });
    if (onEnter) d.addEventListener("pointerenter", () => onEnter(k));
    el.appendChild(d);
    map.set(k.led, d);
  }
  return map;
}
