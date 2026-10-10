# AULA F75 Configurator

Unofficial web configurator for the AULA F75 keyboard. It runs entirely in the browser through [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API): no driver, no install.

**Open it here: https://trueig.github.io/AULA-F75-configurator/**

## Why this exists

The official AULA driver is a Windows-only program. It does not run on Linux, so on Linux there is no way to change the lighting, remap a key or set per-key colors beyond the few `Fn` shortcuts built into the firmware.

I reverse-engineered the protocol the official driver uses to talk to the keyboard and rebuilt the configurator as a web page. Since it only needs a browser, it works on Linux, and also on Windows, macOS and ChromeOS.

## Your data stays on your computer

**Nothing is uploaded anywhere.** This is a static page with no backend, and it never makes a network request after it loads.

- No server, no account, no analytics, no tracking, no cookies.
- No third-party scripts, fonts or CDNs: every file the page uses is in this repository.
- The page talks to the keyboard only, directly over USB HID from your browser.
- Profiles are saved in your browser's `localStorage`. They leave your machine only if you export one as a JSON file yourself.
- The audio-reactive animations analyse the sound locally in the browser. The audio is never recorded, stored or sent.

You can verify this yourself: the code is plain, unminified JavaScript, and the Network tab of your browser's developer tools stays empty while you use the page. It also keeps working offline once loaded.

## Features

- **Lighting**: built-in firmware effects, brightness, speed, color and sleep timer.
- **Per-key colors**: paint individual keys, with presets such as rainbow and gradient.
- **Live animations**: effects driven in real time by the browser (wave, fire, typing ripples and more), including audio-reactive ones from a tab or the microphone.
- **Key remapping**: reassign keys to other keys, modifiers, media, mouse or special functions, on the normal and `Fn` layers.
- **Profiles**: save and restore full configurations, export and import them as JSON. A backup of the keyboard's state is saved automatically the first time it is read.
- **Battery level** readout.
- Interface in **English and Portuguese**.

Macros are not supported.

## Requirements

- An AULA F75 connected through its **2.4G USB receiver** (USB ID `3554:fa09`). Other connection modes and other AULA models have not been tested.
- A browser with WebHID: **Chrome, Edge, Opera, Vivaldi** or another Chromium-based browser. Firefox and Safari do not support WebHID.

## Usage

1. Open https://trueig.github.io/AULA-F75-configurator/
2. Click the connect button and pick the keyboard in the browser's dialog.
3. Change what you want and save it to the keyboard.

### Linux: allow access to the device

By default, Linux does not let a regular user open the keyboard's HID interface, so the browser cannot connect. Add a udev rule once:

```bash
echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="fa09", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/70-aula-f75.rules
```

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

Then unplug and replug the receiver. The page shows the same command in its help section.

## Project layout

```
index.html      markup
style.css       styles
src/
  layout.js         key positions
  protocol.js       HID protocol constants
  effects.js        firmware lighting effects
  keycodes.js       HID key codes, modifiers, media, mouse
  i18n.js           English and Portuguese strings
  util.js           helpers, storage, toasts
  transport.js      packet send/receive
  state.js          reading from and saving to the keyboard
  lighting.js       lighting tab
  keyboard-view.js  on-screen keyboard
  colors.js         per-key colors tab
  keys.js           key remapping tab
  animations.js     live animations
  profiles.js       profiles, import/export
  main.js           device connection and startup
```

The scripts are plain classic scripts sharing one global scope, loaded in the order listed in `index.html`. That order matters.

## Disclaimer

This is an independent project. It is not affiliated with, endorsed by or supported by AULA. The protocol was worked out by reverse engineering, so it may be incomplete. The page writes settings to your keyboard: use it at your own risk.
