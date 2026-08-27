# Progress log

| Stage | Status | Version |
|-------|--------|---------|
| 0 | complete | 0.1.0 |
| 1 | complete | 0.2.0 |
| 2 | not started | - |
| 3 | not started | - |
| 4 | not started | - |
| 5 | not started | - |
| 6 | not started | - |
| 7 | not started | - |
| 8 | not started | - |
| 9 | not started | - |
| 10 | not started | - |
| 11 | not started | - |
| 12 | not started | - |
| 13 | not started | - |

> **Run note.** The operator asked for stages 0–12 in a single pass and asked
> not to be prompted between stages, so the mandatory device-check pauses after
> stages 1 and 3 were folded into the end-of-run report. Everything those pauses
> exist to catch is listed under **Needs device check** below and none of it is
> claimed as verified.

## Stage 0
- Built: repo skeleton (`.nojekyll`, `.gitignore`, README stub), `PROGRESS.md`, and `DESIGN.md` — palette tokens, layer stack, column geometry, timeline maths, the full roster with sizes/frames/behaviours, all 33 vignettes as setup→beat→payoff, the seven mythicals compared side by side, glossary/settings/title/icon specs and the memory ceilings.
- Decided: one zone band = one screen height, so the whole column is a single `iw × 7·ZONE_H` water strip (≈3.4 MB, under the 4096 px limit) rather than per-zone tiles.
- Decided: creature sprite grids live in `js/sprites/zoneN.js` and species definitions in `js/creatures/zoneN.js`, rather than one file per species — 60+ single-species files would each be a dozen lines and the 250-line rule is still met comfortably.
- Decided: the signature moment is the Tidewyrm's ring; everything else is composed so it reads as the peak.
- Needs device check: nothing yet — no code.

## Stage 1
- Built: `index.html`, `style.css`, `js/{version,palette,config,sprites,main}.js`, `tools/set-version.mjs`. Fullscreen portrait canvas, integer scaling picked from dpr and viewport (internal width kept in 190-290 px, target 228), pixelated upscale, dt-clamped rAF loop, pause on `visibilitychange`, touch/scroll/zoom/callout blocking, URL parameters with safe defaults, the 45-token palette, a shelf-packed sprite atlas with a 3x5 pixel font, the bottom-left version stamp, and one yellow test fish.
- Decided: feature modules export `init()` and are called from a wiring block at the foot of `main.js`, rather than registering at their own top level — registering on import would touch `main.js` bindings while they are still in the temporal dead zone.
- Decided: the canvas is CSS-sized to exactly `iw*scale/dpr` and centred with a small overflow, so the upscale is always a whole number; landscape rotates it 90 degrees rather than re-laying out.
- Verified headlessly (Chromium, 500x757 @ dpr 3): no runtime or console errors, scale 7 chosen, internal 215x325, canvas covers the viewport in both axes, one atlas page (1 MB), sprite renders with hard edges and the stamp reads `0.2.0`.
- Deferred: `setUiFadeSource` is a stub returning a constant 15% until stage 3 wires the shared button fade to it.
- Needs device check: 60 fps on the phone; edge-to-edge fill with no browser chrome under the notch and home indicator; that the version stamp is legible but ignorable at 15%; rotate-and-back keeps the composition.
