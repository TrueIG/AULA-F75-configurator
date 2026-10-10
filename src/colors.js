"use strict";

const sel = new Set();
let drag = null,
  kbColors;
const getRGB = (led) => [
  cur.colors[led],
  cur.colors[N + led],
  cur.colors[2 * N + led],
];
function setRGB(led, [r, g, b]) {
  if (led < N) {
    cur.colors[led] = r;
    cur.colors[N + led] = g;
    cur.colors[2 * N + led] = b;
  }
}
const pickOf = (id) => {
  const v = $(id).value;
  return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
};
function toggleSel(led) {
  drag === "del" ? sel.delete(led) : sel.add(led);
  renderColors();
}
function renderColors() {
  for (const [led, d] of kbColors) {
    const k = LAYOUT.find((x) => x.led === led);
    d.textContent = keyName(k);
    d.classList.toggle("sel", sel.has(led));
    if (cur && led < N) {
      const c = getRGB(led);
      d.style.background = css(c);
      d.style.color =
        0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 140 ? "#111" : "#f2f2f2";
      d.classList.toggle(
        "changed",
        !same(c, [
          dev0.colors[led],
          dev0.colors[N + led],
          dev0.colors[2 * N + led],
        ]),
      );
    }
  }
}
const kx = (k) => (k.x + k.w / 2 - bounds.x0) / bounds.w;
const ky = (k) => (k.y + k.h / 2 - bounds.y0) / bounds.h;
function applyPreset(name) {
  const c1 = pickOf("pick"),
    c2 = pickOf("pick2");
  for (const k of LAYOUT) {
    if (name === "rainbow") setRGB(k.led, hsv(kx(k) * 0.85, 1, 1));
    if (name === "gradient") setRGB(k.led, mix(c1, c2, kx(k)));
  }
  refresh();
}
function initColors() {
  kbColors = makeKeyboard($("kbColors"), {
    onDown: (k) => {
      if (!cur) return;
      drag = sel.has(k.led) ? "del" : "add";
      toggleSel(k.led);
    },
    onEnter: (k) => {
      if (drag) toggleSel(k.led);
    },
  });
  window.addEventListener("pointerup", () => {
    drag = null;
  });
  for (const c of [
    "#ff0000",
    "#ff7a00",
    "#ffd400",
    "#00d26a",
    "#00c8ff",
    "#0000ff",
    "#8a2be2",
    "#ff2fa0",
    "#ffffff",
    "#000000",
  ]) {
    const b = document.createElement("button");
    b.className = "swatch";
    b.style.background = c;
    b.title = c;
    b.onclick = () => {
      $("pick").value = c;
    };
    $("swatches").appendChild(b);
  }
  $("bPaintSel").onclick = () => {
    const c = pickOf("pick");
    for (const l of sel) setRGB(l, c);
    refresh();
  };
  $("bPaintAll").onclick = () => {
    const c = pickOf("pick");
    for (const k of LAYOUT) setRGB(k.led, c);
    refresh();
  };
  $("bSelAll").onclick = () => {
    for (const k of LAYOUT) sel.add(k.led);
    renderColors();
  };
  $("bSelNone").onclick = () => {
    sel.clear();
    renderColors();
  };
  for (const b of document.querySelectorAll("[data-preset]"))
    b.onclick = () => {
      if (cur) applyPreset(b.dataset.preset);
    };
}
