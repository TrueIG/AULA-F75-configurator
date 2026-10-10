"use strict";

const PROFILE_KEY = "f75.profiles";

const loadProfiles = () => store.get(PROFILE_KEY, []);
const saveProfiles = (list) => store.set(PROFILE_KEY, list);
const snapshotHex = (snap) =>
  Object.fromEntries(
    ORDER.filter((k) => snap[k]).map((k) => [k, hexOf(snap[k])]),
  );
function profileFromJSON(j) {
  const raw = j?.blocks ?? (j?.led ? { led: j.led, colors: j.colors } : null);
  if (!raw) return null;
  const blocks = {};
  for (const k of ORDER) if (raw[k]) blocks[k] = hexOf(fromHex(raw[k]));
  if (!blocks.led || !ledOk(fromHex(blocks.led))) return null;
  for (const v of Object.values(blocks)) {
    const n = fromHex(v).length;
    if (!n || n > 1024) return null;
  }
  return {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    name: String(j.name || "Profile").slice(0, 60),
    created: j.created || new Date().toISOString(),
    blocks,
  };
}
function autoBackup(snap) {
  const list = loadProfiles();
  if (list.some((p) => p.auto)) return;
  list.unshift({
    id: "auto",
    auto: true,
    name: t("autoBackup"),
    created: new Date().toISOString(),
    blocks: snapshotHex(snap),
  });
  saveProfiles(list);
}
function exportProfile(p) {
  const data = {
    app: "f75-configurator",
    format: 1,
    name: p.name,
    created: p.created,
    blocks: p.blocks,
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }),
  );
  a.download = `f75-${(p.name || "profile").replace(/[^\w\-]+/g, "_")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function loadProfileIntoEditor(p) {
  if (!cur) return;
  for (const [k, v] of Object.entries(p.blocks)) {
    const b = fromHex(v);
    if (b.length !== cur[k].length) {
      toast(t("incompatible"), "err");
      return;
    }
  }
  for (const [k, v] of Object.entries(p.blocks)) cur[k] = fromHex(v);
  N = cur.colors.length / 3;
  refresh();
  toast(t("loaded", { name: p.name }), "ok");
}
function renderProfiles() {
  const box = $("plist");
  box.textContent = "";
  const list = loadProfiles();
  if (!list.length) {
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = t("noProfiles");
    box.appendChild(d);
    return;
  }
  for (const p of list) {
    const item = document.createElement("div");
    item.className = "pitem";
    const nm = document.createElement("div");
    nm.className = "pname";
    nm.textContent = p.auto ? t("autoBackup") : p.name;
    const sm = document.createElement("small");
    sm.textContent = new Date(p.created).toLocaleString(
      lang === "pt" ? "pt-BR" : "en-US",
    );
    nm.appendChild(sm);
    const bl = document.createElement("button");
    bl.textContent = t("load");
    bl.disabled = !cur || busy || !!anim;
    bl.onclick = () => loadProfileIntoEditor(p);
    const be = document.createElement("button");
    be.textContent = t("exportP");
    be.onclick = () =>
      exportProfile({ ...p, name: p.auto ? t("autoBackup") : p.name });
    const bd = document.createElement("button");
    bd.textContent = t("del");
    bd.onclick = () => {
      if (
        confirm(t("confirmDel", { name: p.auto ? t("autoBackup") : p.name }))
      ) {
        saveProfiles(loadProfiles().filter((x) => x.id !== p.id));
        renderProfiles();
      }
    };
    item.append(nm, bl, be, bd);
    box.appendChild(item);
  }
}
function initProfiles() {
  $("bProfSave").onclick = () => {
    if (!cur) return;
    const list = loadProfiles();
    const name = prompt(
      t("namePrompt"),
      t("defaultName", { n: list.filter((p) => !p.auto).length + 1 }),
    );
    if (!name) return;
    list.push({
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: name.slice(0, 60),
      created: new Date().toISOString(),
      blocks: snapshotHex(cur),
    });
    if (saveProfiles(list)) toast(t("savedProfile", { name }), "ok");
    else toast(t("storageOff"), "warn");
    renderProfiles();
  };
  $("bProfExportCur").onclick = () => {
    if (cur)
      exportProfile({
        name: t("defaultName", { n: "" }).trim(),
        created: new Date().toISOString(),
        blocks: snapshotHex(cur),
      });
  };
  $("bProfImport").onclick = () => $("fImport").click();
  $("fImport").onchange = async () => {
    const f = $("fImport").files[0];
    $("fImport").value = "";
    if (!f) return;
    let p = null;
    try {
      p = profileFromJSON(JSON.parse(await f.text()));
    } catch {
      p = null;
    }
    if (!p) {
      toast(t("importBad"), "err");
      return;
    }
    const list = loadProfiles();
    list.push(p);
    if (!saveProfiles(list)) toast(t("storageOff"), "warn");
    else toast(t("imported", { name: p.name }), "ok");
    renderProfiles();
    if (cur) loadProfileIntoEditor(p);
  };
}
