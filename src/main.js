"use strict";

function buildSettingsText() {
  fillSelect(
    $("sleep"),
    SLEEP.map(([secs, hw]) => [
      String(hw),
      secs < 120 ? t("sec", { n: secs }) : t("min", { n: secs / 60 }),
    ]),
  );
}
function renderSettings() {
  const v = String(cur.led[OFF.SLEEP]);
  if (![...$("sleep").options].some((o) => o.value === v))
    $("sleep").add(new Option(`${v}`, v));
  $("sleep").value = v;
}

function refresh() {
  const connected = !!dev,
    ready = connected && !!cur;
  $("welcome").hidden = ready;
  $("tabs").hidden = !ready;
  $("app").hidden = !ready;
  $("footer").hidden = !ready;
  $("stConn").className = "chip" + (connected ? " ok" : "");
  $("stConn").textContent = t(connected ? "connected" : "disconnected");
  $("bReload").hidden = !connected;
  $("stBattery").hidden = !connected || battery === null;
  if (battery !== null)
    $("stBattery").textContent = t("battery", { n: battery });
  if (ready) {
    renderLight();
    renderColors();
    renderKeys();
    renderSettings();
    renderAnimUI();
  }
  renderProfiles();
  const ks = dirtyKeys(),
    b = busy || !!anim;
  $("pending").textContent = ks.length
    ? t("pendingSome", { list: ks.map((k) => t(BLOCKS[k].label)).join(", ") })
    : t("pendingNone");
  $("bSave").disabled = b || !ks.length;
  $("bDiscard").disabled = b || !ks.length;
  if (!busy) {
    $("bSave").textContent = t("save");
    $("progress").style.width = "0";
  }
  $("bReload").disabled = b;
  $("bConnect").disabled = busy || !("hid" in navigator);
  for (const id of [
    "bPaintSel",
    "bPaintAll",
    "bSelAll",
    "bSelNone",
    "bKeyApply",
    "bLayerOrig",
    "rBright",
    "rSpeed",
    "sleep",
    "bPalEdit",
    "bProfSave",
    "bProfExportCur",
  ])
    $(id).disabled = b || !cur;
  for (const el of document.querySelectorAll("[data-preset], #effects button"))
    el.disabled = b || !cur;
  $("bAnimStart").disabled = busy || !connected;
  $("bAnimStop").disabled = !anim;
}
async function task(fn) {
  if (busy) return;
  if (anim) {
    toast(t("stopAnimFirst"), "warn");
    return;
  }
  busy = true;
  refresh();
  try {
    await fn();
  } catch (ex) {
    if (ex.message !== "asleep") toast(t("errComm"), "err");
  } finally {
    busy = false;
    refresh();
  }
}
function showAsleep(v) {
  $("stSleep").hidden = !v;
  if (v) toast(t("asleepToast"), "warn");
}
function onOnlineEvent(online) {
  $("stSleep").hidden = !!online;
  if (online && dev && !cur && !busy) task(readKeyboard);
}
const isCmdIface = (d) =>
  d.vendorId === FILTER.vendorId &&
  d.productId === FILTER.productId &&
  d.collections.some(
    (c) =>
      c.usagePage === 0xff02 &&
      (c.outputReports || []).some((r) => r.reportId === RID),
  );
async function useDevice(d) {
  if (!isCmdIface(d)) {
    toast(t("errWrongDevice"), "err");
    return;
  }
  try {
    if (!d.opened) await d.open();
  } catch {
    toast(t("errOpen"), "err");
    return;
  }
  dev = d;
  d.addEventListener("inputreport", onInput);
  refresh();
  await task(readKeyboard);
}
function applyLang() {
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  for (const el of document.querySelectorAll("[data-t]"))
    el.textContent = t(el.dataset.t);
  for (const b of document.querySelectorAll(".lang button"))
    b.classList.toggle("on", b.dataset.lang === lang);
  document.title = t("appName");
  for (const el of document.querySelectorAll(".udevCmd"))
    el.textContent = `echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="fa09", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/70-aula-f75.rules\nsudo udevadm control --reload-rules && sudo udevadm trigger`;
  buildEffects();
  buildAnims();
  buildKeyEditorText();
  buildSettingsText();
  for (const [led, d] of kbAnim)
    d.textContent = keyName(LAYOUT.find((x) => x.led === led));
  refresh();
}
function goTab(name) {
  for (const x of document.querySelectorAll("nav button"))
    x.classList.toggle("on", x.dataset.tab === name);
  for (const s of document.querySelectorAll("[data-page]"))
    s.hidden = s.dataset.page !== name;
}
function init() {
  for (const box of document.querySelectorAll(".helpBox"))
    box.appendChild($("helpTpl").content.cloneNode(true));
  initLight();
  initColors();
  initKeys();
  initAnims();
  initProfiles();
  for (const b of document.querySelectorAll("nav button"))
    b.onclick = () => goTab(b.dataset.tab);
  for (const b of document.querySelectorAll(".lang button"))
    b.onclick = () => {
      lang = b.dataset.lang;
      store.set("f75.lang", lang);
      applyLang();
    };
  $("sleep").onchange = () => {
    cur.led[OFF.SLEEP] = +$("sleep").value;
    refresh();
  };
  $("bSave").onclick = () => task(saveToKeyboard);
  $("bDiscard").onclick = () => {
    cur = clone(dev0);
    N = cur.colors.length / 3;
    refresh();
    toast(t("discarded"));
  };
  $("bReload").onclick = () =>
    task(async () => {
      await readKeyboard();
      toast(t("readOk"), "ok");
    });
  $("bConnect").onclick = async () => {
    try {
      const list = await navigator.hid.requestDevice({ filters: [FILTER] });
      const d = list.find(isCmdIface);
      if (d) await useDevice(d);
      else toast(t("errNoDevice"), "warn");
    } catch {
      toast(t("errNoDevice"), "warn");
    }
  };
  window.addEventListener("beforeunload", (e) => {
    if (dirtyKeys().length) {
      e.preventDefault();
      e.returnValue = t("unsavedLeave");
    }
  });
  applyLang();
  if (!("hid" in navigator)) {
    $("noHid").hidden = false;
    refresh();
    return;
  }
  navigator.hid.addEventListener("disconnect", (e) => {
    if (e.device !== dev) return;
    if (anim) {
      anim.running = false;
      anim = null;
      stopAudio();
    }
    dev = null;
    cur = null;
    toast(t("unplugged"), "warn");
    refresh();
  });
  navigator.hid.addEventListener("connect", (e) => {
    if (!dev && isCmdIface(e.device)) useDevice(e.device);
  });
  navigator.hid.getDevices().then((ds) => {
    const d = ds.find(isCmdIface);
    if (d && !dev) useDevice(d);
  });
}
init();
