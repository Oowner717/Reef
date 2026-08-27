# Reef

A calm, fullscreen 16-bit ocean for the iPhone Home Screen. Tap the icon and it
opens on a title over moving water, then fades into a reef already full of life.
Over five minutes and twenty seconds the view sinks from the sunlit surface
through seven zones — shallows, reef, drop-off, open blue, twilight, midnight,
vent field — and rises back. Every zone visit plays one of 33 small set-piece
scenes, so no two runs are alike.

Vanilla JavaScript, Canvas 2D and Web Audio. No dependencies, no build step and
no asset files: every sprite, landmark and icon is a pixel grid generated in
code. It works offline after the first load, and nothing ever leaves the phone.

**Version:** 0.14.0

---

## Try it locally

There is nothing to compile, but it does need to be served over HTTP — ES
modules and the service worker will not load from `file://`.

```sh
python3 -m http.server 8000      # or: npx serve .
```

Then open `http://localhost:8000/`. On a phone on the same network, use the
machine's LAN address instead of `localhost`.

## Deploy to GitHub Pages

1. Push this repository to GitHub as `reef`.
2. **Settings → Pages → Build and deployment**, source **Deploy from a branch**.
3. Branch **main**, folder **/ (root)**. Save.
4. Wait for the first build, then open `https://<user>.github.io/reef/`.

Every path in the app is relative and the service worker is registered with a
relative scope, so it works from a subdirectory without any configuration.
`.nojekyll` is committed so Pages serves the `js/` directory untouched.

## Add to Home Screen

1. Open the URL in **Safari** on the iPhone (not another browser — only Safari
   can install a web app on iOS).
2. Tap **Share → Add to Home Screen → Add**.
3. Launch it from the new **Reef** icon. It opens fullscreen with no browser
   chrome, and works with no signal once it has loaded once.

## What you can touch

Three 12×12 px icons fade in at the bottom-right after any tap and fade back
down again. They are the entire interface.

- **Shell — the glossary.** A checklist of every creature, scene and mythical in
  the app, grouped by zone. Rows you have met animate; rows you have not are a
  dark silhouette with a dashed name, so you can see the shape of what is still
  out there. Tap a row for a line on where it lives, how it moves and the real
  animal. A single dot on the shell is the only notification in the app.
- **Dial — settings.** Sound, keeping the screen awake, journey speed, start
  zone, creature density, scanlines, the frame counter, motion, mythicals per
  run, whether the glossary and debug buttons show, and a two-step reset. Every
  change applies immediately.
- **Magnifier — the debug menu.** Frame statistics, entity counts, estimated
  memory, jump-to-zone, trigger any scene, layer toggles and **Copy
  diagnostics**, which puts a plain-text report on the clipboard. It hides
  itself once the version reaches 1.0.0.

**Nothing leaves the phone.** There is no account, no sync and no network call
after the files have loaded. Settings, what you have seen and the shuffle order
live in one `localStorage` key on the device and nowhere else.

## The screen does not sleep

While Reef is open and on screen, the phone should not dim or lock.

- **iOS 18.4 and later:** the Wake Lock API works from a Home Screen web app,
  and Reef re-acquires the lock whenever iOS drops it and retries every 30
  seconds if it is refused.
- **iOS 16.4 to 18.3:** the Wake Lock API works in Safari but not from the Home
  Screen icon. Reef falls back to playing a silent one-pixel video it generates
  at runtime, which helps on some versions and not others.
- **Low Power Mode** overrides all of it. So does a very low battery.

**The failsafe, if the screen still dims:** Settings → Display & Brightness →
Auto-Lock → **Never** while Reef is running, and back to your usual setting
afterwards.

**Battery note.** A phone rendering at 60 fps with the screen on will drain
noticeably — expect roughly 15–25% an hour depending on brightness and model.
Reef is meant to be left running on a charger. Use `?awake=0` to let the phone
lock normally.

## URL parameters

Append to the URL, e.g. `…/reef/?speed=10&fps=1`. They override the matching
setting **for that session only** and are never written to the save, so a test
link or a pinned bookmark cannot overwrite what you chose in the panel. A row
the URL is overriding is marked in the settings panel and named in its footer.

| Parameter | Effect | Default |
|---|---|---|
| `?sound=0` | no audio and no first-launch hint | sound on after a tap |
| `?awake=0` | let the phone lock normally | screen stays awake |
| `?crt=1` | faint scanline overlay | off |
| `?speed=0.5` | journey speed multiplier, 0.05–40 | 1 |
| `?start=6` | zone to begin in, `1`–`7` or by name | `1` |
| `?density=0.7` | creature count multiplier, 0.1–3 | 1 |
| `?myth=<id>` | force a named mythical encounter now | off |
| `?vignette=<id>` | run one scene on demand | off |
| `?glossary=0` | remove the glossary button entirely | glossary on |
| `?seen=all` | unlock every glossary entry | off |
| `?save=0` | run without reading or writing the save | save on |
| `?title=0` | skip the title screen | title on |
| `?fps=1` | show the frame counter | off |
| `?debug=1` | open the debug menu | off |

`?debug=behaviours` opens the behaviour proving ground: one crude sprite per
movement type, all on screen at once. Unknown or malformed values fall back to
the default and are ignored.

## Maintenance scripts

Neither is a build step — the app always runs from source.

```sh
node tools/set-version.mjs minor    # or patch, major, or an explicit 1.2.3
node tools/make-icons.mjs           # regenerate icons/ from the sprite data
```

`set-version.mjs` writes `js/version.js` and stamps the version into this
README, the manifest and the service worker's cache name, and regenerates the
service worker's precache list from what is actually on disk. Run it before
committing, so the on-screen stamp always matches the code and a stale cache is
visible rather than mysterious.

## Repository

`index.html` `style.css` `sw.js` `manifest.webmanifest` `.nojekyll` `icons/`
· `js/` the app · `tools/` the two maintenance scripts · `SPEC.md` the brief and
the build order · `DESIGN.md` every art and content decision · `PROGRESS.md` what
each stage built, decided and deferred.
