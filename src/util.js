"use strict";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hexOf = (a) =>
  Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (s) =>
  new Uint8Array(
    String(s)
      .replace(/[^0-9a-f]/gi, "")
      .match(/../g)
      ?.map((x) => parseInt(x, 16)) ?? [],
  );
const same = (a, b) =>
  !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};
let lang = store.get(
  "f75.lang",
  (navigator.language || "en").toLowerCase().startsWith("pt") ? "pt" : "en",
);
function t(key, params = {}) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
  return s;
}
const L = (item) => (lang === "pt" ? item.pt : item.en);
const LA = (arr) => (lang === "pt" ? arr[1] : arr[2]);
function toast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => el.remove(), kind === "err" ? 7000 : 4000);
}
