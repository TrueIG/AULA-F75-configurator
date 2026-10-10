"use strict";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const frac = (v) => v - Math.floor(v);
function hsv(h, s, v) {
  h = frac(h) * 6;
  const i = Math.floor(h),
    f = h - i,
    p = v * (1 - s),
    q = v * (1 - s * f),
    w = v * (1 - s * (1 - f));
  const [r, g, b] = [
    [v, w, p],
    [q, v, p],
    [p, v, w],
    [p, q, v],
    [w, p, v],
    [v, p, q],
  ][i % 6];
  return [r * 255, g * 255, b * 255];
}
const mix = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w);
const scale = (c, f) => c.map((v) => v * f);
const CODE_TO_KEY = {
  Escape: "Esc",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  PageUp: "PgUp",
  CapsLock: "CapsLock",
  Semicolon: ";",
  Quote: "'",
  Enter: "Enter",
  PageDown: "PgDn",
  ShiftLeft: "LShift",
  Comma: ",",
  Period: ".",
  Slash: "/",
  ShiftRight: "RShift",
  ArrowUp: "Up",
  End: "End",
  ControlLeft: "LCtrl",
  MetaLeft: "LWin",
  OSLeft: "LWin",
  AltLeft: "LAlt",
  Space: "Space",
  ArrowLeft: "Left",
  ArrowDown: "Down",
  ArrowRight: "Right",
  ControlRight: "RCtrl",
};
const keyFromCode = (code) =>
  CODE_TO_KEY[code] ??
  (/^Key[A-Z]$/.test(code)
    ? code.slice(3)
    : /^Digit\d$/.test(code)
      ? code.slice(5)
      : /^F\d+$/.test(code)
        ? code
        : null);
const ANIMS = [
  {
    id: "wave",
    frame: (tt) => ({
      keys: new Map(
        LAYOUT.map((k) => [k.led, hsv(kx(k) * 0.8 - tt * 0.25, 1, 1)]),
      ),
    }),
  },
  {
    id: "spin",
    frame: (tt) => ({
      keys: new Map(
        LAYOUT.map((k) => [
          k.led,
          hsv(
            Math.atan2((ky(k) - 0.5) * 0.4, kx(k) - 0.5) / (2 * Math.PI) -
              tt * 0.2,
            1,
            1,
          ),
        ]),
      ),
    }),
  },
  {
    id: "gradient",
    frame: (tt) => {
      const a = pickOf("aC1"),
        b = pickOf("aC2");
      return {
        keys: new Map(
          LAYOUT.map((k) => [
            k.led,
            mix(a, b, 0.5 + 0.5 * Math.sin(kx(k) * 5 + ky(k) * 2 - tt * 1.5)),
          ]),
        ),
      };
    },
  },
  {
    id: "scanner",
    frame: (tt) => {
      const p = 0.5 + 0.5 * Math.sin(tt * 1.6),
        a = pickOf("aC1"),
        b = scale(pickOf("aC2"), 0.15);
      return {
        keys: new Map(
          LAYOUT.map((k) => [
            k.led,
            mix(b, a, Math.exp(-(((kx(k) - p) / 0.07) ** 2))),
          ]),
        ),
      };
    },
  },
  {
    id: "fire",
    frame: (tt) => ({
      keys: new Map(
        LAYOUT.map((k) => {
          const x = kx(k),
            y = ky(k),
            n =
              0.5 +
              0.25 * Math.sin(x * 17 + tt * 6.1) +
              0.25 * Math.sin(x * 7.3 - tt * 3.7 + y * 4);
          const heat = clamp01(y * 1.25 - 0.35 + (n - 0.5) * 0.9);
          return [
            k.led,
            [
              255 * clamp01(heat * 1.6),
              255 * clamp01(heat * heat * 1.1 - 0.05),
              255 * clamp01(heat - 0.85) * 3,
            ],
          ];
        }),
      ),
    }),
  },
  {
    id: "stars",
    init: (s) => {
      s.tw = new Map();
    },
    frame: (tt, dt, s) => {
      const a = pickOf("aC1"),
        b = scale(pickOf("aC2"), 0.2),
        sp = +$("aSpeed").value;
      for (const k of LAYOUT)
        if (Math.random() < dt * 0.35 * sp) s.tw.set(k.led, 1);
      for (const [l, v] of s.tw) {
        const nv = v - dt * 1.2 * sp;
        nv <= 0 ? s.tw.delete(l) : s.tw.set(l, nv);
      }
      return {
        keys: new Map(
          LAYOUT.map((k) => [k.led, mix(b, a, s.tw.get(k.led) ?? 0)]),
        ),
      };
    },
  },
  {
    id: "type",
    typing: true,
    init: (s) => {
      s.rip = [];
      s.onKey = (e) => {
        const n = keyFromCode(e.code),
          k = n && LAYOUT.find((x) => x.n === n);
        if (k) s.rip.push({ x: kx(k), y: ky(k), t: s.now });
      };
      document.addEventListener("keydown", s.onKey);
    },
    done: (s) => document.removeEventListener("keydown", s.onKey),
    frame: (tt, dt, s) => {
      const a = pickOf("aC1"),
        b = scale(pickOf("aC2"), 0.12),
        sp = +$("aSpeed").value;
      s.rip = s.rip.filter((r) => s.now - r.t < 1.6 / sp);
      return {
        keys: new Map(
          LAYOUT.map((k) => {
            let v = 0;
            for (const r of s.rip) {
              const age = (s.now - r.t) * sp,
                d = Math.hypot(kx(k) - r.x, (ky(k) - r.y) * 0.4);
              v +=
                Math.exp(-(((d - age * 0.55) / 0.05) ** 2)) *
                Math.max(0, 1 - age / 1.6);
            }
            return [k.led, mix(b, a, clamp01(v))];
          }),
        ),
      };
    },
  },
  {
    id: "eq",
    audio: true,
    noColors: true,
    frame: () => {
      const g = +$("aGain").value,
        cols = 14,
        lv = [];
      for (let c = 0; c < cols; c++)
        lv.push(
          clamp01(
            audioBand(
              60 * Math.pow(150, c / cols),
              60 * Math.pow(150, (c + 1) / cols),
            ) *
              g -
              0.08,
          ),
        );
      return {
        keys: new Map(
          LAYOUT.map((k) => {
            const h = 1 - ky(k),
              l = lv[Math.min(cols - 1, Math.floor(kx(k) * cols))];
            return [
              k.led,
              h <= l + 0.04 ? hsv(0.33 * (1 - h), 1, 1) : [0, 0, 0],
            ];
          }),
        ),
      };
    },
  },
  {
    id: "pulse",
    audio: true,
    frame: () => ({
      all: scale(
        pickOf("aC1"),
        0.06 +
          0.94 * clamp01(audioBand(40, 160) * +$("aGain").value - 0.05) ** 1.5,
      ),
    }),
  },
  {
    id: "cycle",
    noColors: true,
    frame: (tt) => ({ all: hsv(tt * 0.06, 1, 1) }),
  },
];
const animName = (a) => ANIM_TEXT[a.id][lang === "pt" ? 0 : 2];
const animDesc = (a) => ANIM_TEXT[a.id][lang === "pt" ? 1 : 3];
let anim = null,
  audio = null,
  kbAnim,
  animSel = ANIMS[0];

function encodeGroups(keys) {
  for (const q of [1, 8, 16, 24, 32, 48, 64, 85, 128]) {
    const groups = new Map();
    for (const [led, c] of keys) {
      const qc = c.map((v) =>
        Math.max(
          0,
          Math.min(255, q === 1 ? Math.round(v) : Math.round(v / q) * q),
        ),
      );
      if (isBlack(qc)) continue;
      const key = (qc[0] << 16) | (qc[1] << 8) | qc[2];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(led);
    }
    let size = 0;
    for (const l of groups.values()) size += 4 + l.length;
    if (size > RT_MAX) continue;
    const out = new Uint8Array(size);
    let o = 0;
    for (const [key, l] of groups) {
      out.set([key >> 16, (key >> 8) & 255, key & 255, l.length], o);
      out.set(l, o + 4);
      o += 4 + l.length;
    }
    return out;
  }
  return null;
}
async function startAudio() {
  const stream =
    $("aSrc").value === "mic"
      ? await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
      : await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
  if (!stream.getAudioTracks().length) {
    stream.getTracks().forEach((x) => x.stop());
    throw new Error("tabAudio");
  }
  const ctx = new AudioContext();
  await ctx.resume();
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  an.smoothingTimeConstant = 0.5;
  ctx.createMediaStreamSource(stream).connect(an);
  audio = { stream, ctx, an, bins: new Uint8Array(an.frequencyBinCount) };
  stream.getTracks().forEach((tr) =>
    tr.addEventListener("ended", () => {
      if (anim) stopAnim(true);
    }),
  );
}
function stopAudio() {
  if (!audio) return;
  audio.stream.getTracks().forEach((x) => x.stop());
  audio.ctx.close();
  audio = null;
}
function audioBand(f0, f1) {
  if (!audio) return 0;
  const nyq = audio.ctx.sampleRate / 2,
    n = audio.bins.length;
  const i0 = Math.max(1, Math.floor((f0 / nyq) * n)),
    i1 = Math.max(i0 + 1, Math.ceil((f1 / nyq) * n));
  let s = 0;
  for (let i = i0; i < i1; i++) s += audio.bins[i];
  return s / (i1 - i0) / 255;
}
function renderAnimPreview(res) {
  for (const [led, d] of kbAnim)
    d.style.background = css(res.all ?? res.keys.get(led) ?? [0, 0, 0]);
}
function buildAnims() {
  const box = $("animList");
  box.textContent = "";
  for (const a of ANIMS) {
    const b = document.createElement("button");
    b.innerHTML = `${animName(a)}<small>${animDesc(a)}</small>`;
    b.dataset.id = a.id;
    b.onclick = () => {
      animSel = a;
      renderAnimUI();
      if (anim) startAnim();
    };
    box.appendChild(b);
  }
}
function renderAnimUI() {
  for (const b of $("animList").children)
    b.classList.toggle("on", b.dataset.id === animSel.id);
  $("animName").textContent = animName(animSel);
  $("wAudio").hidden = !animSel.audio;
  $("wAnimColors").hidden = !!animSel.noColors;
  $("animHint2").textContent = animSel.audio
    ? t("animAudioHint")
    : animSel.typing
      ? t("animTypeHint")
      : t("animBatteryHint");
  $("animState").textContent = anim
    ? `● ${t("playing")}: ${animName(anim.def)}`
    : "";
}
async function startAnim() {
  if (!dev || busy) return;
  await stopAnim(false);
  const def = animSel,
    s = { now: 0 };
  try {
    if (def.audio) await startAudio();
  } catch (ex) {
    toast(ex.message === "tabAudio" ? t("errTabAudio") : t("errAudio"), "err");
    return;
  }
  def.init?.(s);
  const run = { def, s, running: true, t0: performance.now() };
  anim = run;
  refresh();
  run.done = (async () => {
    let last = performance.now(),
      tt = 0;
    try {
      while (run.running) {
        const now = performance.now(),
          dt = Math.min(0.2, (now - last) / 1000);
        last = now;
        tt += dt * +$("aSpeed").value;
        s.now = (now - run.t0) / 1000;
        if (audio) audio.an.getByteFrequencyData(audio.bins);
        const res = def.frame(tt, dt, s),
          br = +$("aBright").value;
        if (res.all) {
          res.all = scale(res.all, br);
          await sendRealtime(
            2,
            Uint8Array.from(
              res.all.map((v) => Math.round(Math.max(0, Math.min(255, v)))),
            ),
          );
        } else {
          for (const [l, c] of res.keys) res.keys.set(l, scale(c, br));
          const enc = encodeGroups(res.keys);
          await (enc && enc.length
            ? sendRealtime(1, enc)
            : sendRealtime(2, new Uint8Array(3)));
        }
        queue = [];
        renderAnimPreview(res);
        const wait = 66 - (performance.now() - now);
        if (wait > 0) await tick(wait);
      }
    } catch {
      run.running = false;
      toast(t("errComm"), "err");
    }
  })();
}
async function stopAnim(restore) {
  const run = anim;
  if (!run) return;
  run.running = false;
  await run.done;
  run.def.done?.(run.s);
  stopAudio();
  anim = null;
  if (restore && dev && dev0) {
    try {
      await writeCmd(CMD.SET_LED, dev0.led);
    } catch {
      toast(t("errComm"), "err");
    }
  }
  refresh();
}
function initAnims() {
  for (const [id, fmt] of [
    ["aSpeed", (v) => v + "×"],
    ["aBright", (v) => Math.round(v * 100) + "%"],
    ["aGain", (v) => v + "×"],
  ]) {
    const upd = () => {
      $("v" + id[0].toUpperCase() + id.slice(1)).textContent = fmt($(id).value);
    };
    $(id).addEventListener("input", upd);
    upd();
  }
  kbAnim = makeKeyboard($("kbAnim"), { onDown: () => {} });
  $("bAnimStart").onclick = () => startAnim();
  $("bAnimStop").onclick = () => stopAnim(true);
}
