"use strict";

let layer = 0,
  kbKeys,
  curKey = null;
const layerKey = () => "matrix" + layer;
const codeAt = (blk, led) => blk.slice(4 * led, 4 * led + 4);
const hidName = (u) =>
  u === 0x2c ? t("space") : (HID[u] ?? `#${u.toString(16)}`);
function describe(c) {
  const h = hexOf(c),
    [ty, b1, b2, b3] = c;
  if (h === "00000000") return { long: t("disabledKey"), short: "—" };
  for (const list of [COMMANDS, MOUSE, SPECIAL]) {
    const it = list.find((x) => x[0] === h);
    if (it) return { long: LA(it), short: it[3] };
  }
  if (ty === 0x00) {
    const mods = MODS.filter(([b]) => b1 & b).map((m) =>
      lang === "pt" ? m[1] : m[2],
    );
    const keys = [b3, b2].filter(Boolean).map(hidName);
    const parts = [...mods, ...keys];
    return { long: parts.join(" + "), short: parts.join("+") };
  }
  if (ty === 0x02) {
    const u = (b2 << 8) | b3,
      m = MEDIA.find((x) => x[0] === u);
    return { long: m ? LA(m) : t("media"), short: m ? m[3] : t("media") };
  }
  if (ty === FN_TYPE) return { long: "Fn", short: "Fn" };
  if (ty === 0x03) return { long: t("macro"), short: t("macro") };
  return { long: t("kbFunc"), short: "⚙" };
}
function renderKeys() {
  if (!cur) return;
  const lk = layerKey();
  for (const [led, d] of kbKeys) {
    const c = codeAt(cur[lk], led),
      ds = describe(c),
      k = LAYOUT.find((x) => x.led === led);
    d.textContent = ds.short;
    d.title = `${keyName(k)}: ${ds.long}`;
    d.classList.toggle("sel", curKey === led);
    d.classList.toggle("changed", !same(c, codeAt(dev0[lk], led)));
    d.classList.toggle("lock", c[0] === FN_TYPE);
  }
  for (const b of $("layerSeg").children)
    b.classList.toggle("on", +b.dataset.layer === layer);
  renderKeyEditor();
}
function fillSelect(s, items) {
  const v = s.value;
  s.textContent = "";
  for (const [val, n] of items) s.add(new Option(n, val));
  if ([...s.options].some((o) => o.value === v)) s.value = v;
}
const TYPE_LISTS = () => ({
  media: MEDIA.map((m) => [String(m[0]), LA(m)]),
  mouse: MOUSE.map((m) => [m[0], LA(m)]),
  cmd: COMMANDS.map((m) => [m[0], LA(m)]),
  special: SPECIAL.map((m) => [m[0], LA(m)]),
});
function buildKeyEditorText() {
  fillSelect($("kType"), [
    ["key", t("tKey")],
    ["media", t("tMedia")],
    ["mouse", t("tMouse")],
    ["cmd", t("tCmd")],
    ["special", t("tSpecial")],
    ["off", t("tOff")],
  ]);
  const keys = Object.entries(HID).map(([u]) => [u, hidName(+u)]);
  const modOnly = MODS.map((m) => [
    `m${m[0]}`,
    t("modOnly", { m: lang === "pt" ? m[1] : m[2] }),
  ]);
  fillSelect($("kKey"), [...keys, ...modOnly]);
  const box = $("wMods");
  box.querySelectorAll("label").forEach((l) => l.remove());
  for (const m of MODS) {
    const l = document.createElement("label");
    l.className = "chk";
    l.innerHTML = `<input type="checkbox" data-bit="${m[0]}"> ${lang === "pt" ? m[1] : m[2]}`;
    box.appendChild(l);
  }
  $("wList").dataset.t = "";
}
function syncEditorWidgets() {
  const ty = $("kType").value;
  $("wKey").hidden = ty !== "key";
  $("wMods").hidden = ty !== "key" || $("kKey").value.startsWith("m");
  $("wList").hidden = !["media", "mouse", "cmd", "special"].includes(ty);
  const lists = TYPE_LISTS();
  if (lists[ty] && $("wList").dataset.t !== ty) {
    fillSelect($("kList"), lists[ty]);
    $("wList").dataset.t = ty;
  }
}
function renderKeyEditor() {
  const has = curKey !== null && !!cur;
  $("kNone").hidden = has;
  $("kEdit").hidden = !has;
  if (!has) {
    $("kName").textContent = "";
    return;
  }
  const lk = layerKey(),
    c = codeAt(cur[lk], curKey),
    h = hexOf(c),
    k = LAYOUT.find((x) => x.led === curKey);
  $("kName").textContent =
    `· ${keyName(k)} (${t(layer ? "layerFnName" : "layerNormalName")})`;
  $("kCur").textContent = describe(c).long;
  $("bKeyOrig").disabled = busy || !!anim || same(c, codeAt(first[lk], curKey));
  let ty = "key";
  if (h === "00000000") ty = "off";
  else if (COMMANDS.some((x) => x[0] === h)) ty = "cmd";
  else if (c[0] === 0x01) ty = "mouse";
  else if (c[0] === 0x02) ty = "media";
  else if (c[0] === 0x07 || c[0] === 0x08) ty = "special";
  $("kType").value = ty;
  $("wList").dataset.t = "";
  syncEditorWidgets();
  if (ty === "key") {
    const modOnly = !c[3] && !c[2] && MODS.find(([b]) => c[1] === b);
    $("kKey").value = c[3]
      ? String(c[3])
      : c[2]
        ? String(c[2])
        : modOnly
          ? `m${c[1]}`
          : "4";
    for (const cb of $("wMods").querySelectorAll("input"))
      cb.checked = !modOnly && !!(c[1] & +cb.dataset.bit);
    syncEditorWidgets();
  } else if (ty === "media") $("kList").value = String((c[2] << 8) | c[3]);
  else if (ty !== "off" && [...$("kList").options].some((o) => o.value === h))
    $("kList").value = h;
}
function editorCode() {
  const ty = $("kType").value;
  if (ty === "off") return new Uint8Array(4);
  if (ty === "key") {
    const v = $("kKey").value;
    if (v.startsWith("m")) return new Uint8Array([0, +v.slice(1), 0, 0]);
    let m = 0;
    for (const cb of $("wMods").querySelectorAll("input"))
      if (cb.checked) m |= +cb.dataset.bit;
    return new Uint8Array([0, m, 0, +v]);
  }
  if (ty === "media") {
    const u = +$("kList").value;
    return new Uint8Array([2, 0, u >> 8, u & 0xff]);
  }
  return fromHex($("kList").value);
}
function initKeys() {
  kbKeys = makeKeyboard($("kbKeys"), {
    onDown: (k) => {
      if (!cur) return;
      if (codeAt(cur[layerKey()], k.led)[0] === FN_TYPE) {
        toast(t("fnLocked"), "warn");
        return;
      }
      curKey = k.led;
      renderKeys();
    },
  });
  for (const b of $("layerSeg").children)
    b.onclick = () => {
      layer = +b.dataset.layer;
      curKey = null;
      renderKeys();
    };
  $("kType").onchange = syncEditorWidgets;
  $("kKey").onchange = syncEditorWidgets;
  $("bKeyApply").onclick = () => {
    if (curKey === null) return;
    cur[layerKey()].set(editorCode(), 4 * curKey);
    refresh();
  };
  $("bKeyOrig").onclick = () => {
    const lk = layerKey();
    cur[lk].set(codeAt(first[lk], curKey), 4 * curKey);
    refresh();
  };
  $("bLayerOrig").onclick = () => {
    const lk = layerKey();
    cur[lk] = first[lk].slice();
    refresh();
  };
}
