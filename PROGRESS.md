# Progress log

| Stage | Status | Version |
|-------|--------|---------|
| 0 | complete | 0.1.0 |
| 1 | complete | 0.2.0 |
| 2 | complete | 0.3.0 |
| 3 | complete | 0.4.0 |
| 4 | complete | 0.5.0 |
| 5 | complete | 0.6.0 |
| 6 | complete | 0.7.0 |
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

## Stage 2
- Built: `js/world.js` (seven bands, soft 18% transition blend, the colour ramp, the vent warm cast, the daily seed and an xorshift rng), `js/camera.js` (the 320 s timeline: two 20 s lingers and two 140 s legs, eased 2 s at each end via an integrated speed-profile LUT so the middle of a leg is genuinely constant-rate, plus the sideways current, horizontal wrap and parallax helpers), `js/water.js` (the dithered strip).
- Decided: one water strip, `iw x (6*zoneH + ih)`, pre-rendered per resize with a 4x4 Bayer dither between two ramp stops. The mix is plateaued (solid, dithered transition, solid) so each band reads as a band. Exactly one strip is held; the old reference is dropped before the new allocation.
- Decided: the ramp is a piecewise control-point list down the whole column rather than per-zone top/bottom pairs, so every boundary is continuous by construction — there is no seam to hide.
- Decided: zone height is clamped so the strip never exceeds 4000 px, and colour depth is normalised against `7*zoneH` so zone `i` always starts at `i/7` of the ramp even when the clamp bites.
- Verified headlessly: no errors; `?start=4` lands at depth 0.501, zone `open`, 0.51 through the band; the progress curve reads 0 / 0 / 0.282 / 0.499 / 1 / 1 / 0.501 / 0.002 at t = 0/20/60/90/160/179/250/319; strip 215x2275 = 1.87 MB; screenshots of zones 1, 3, 5 and 7 are clearly distinct with visible dither transitions and the warm floor cast.
- Needs device check: that `?speed=10` reads as one smooth continuous fall with no stutter at the linger-to-leg easings, and that the dither texture is not busy at real pixel density.

## Stage 3
- Built: `js/perf.js` (2 s rolling window, average and the mean of the worst 1% of frame intervals, the four-tier governor with 3 s/20 s hysteresis and a `addTierHold` freeze for vignette payoffs and hold frames), `js/fps.js`, `js/ui/buttons.js` (the cluster, the shared 3 s-full/1 s-fade behaviour, safe-area insets measured from `env()`), `js/ui/panel.js` (the overlay shell), `js/ui/rows.js`, `js/debug/{registry,menu,diagnostics}.js`.
- Decided: an extra module, `js/ui/rows.js`, holds the shared section/label/value row renderer. Folding it into `panel.js` would have pushed that file past the 250-line rule, and the glossary and settings panels both need it.
- Decided: panel scrolling is a transparent native-scroll `div` laid over the content area only, read back into the canvas each frame — that is what "re-enable touch-action inside the panel only" means when the panel is drawn on a canvas. Taps that follow a drag of more than 6 px are ignored.
- Decided: layer toggles are generated from `layerNames()` rather than registered, so every later stage's layer appears in the menu for free; `ui-panel` is excluded so the panel cannot hide itself.
- Decided: `js/debug/diagnostics.js` is loaded by `index.html` before `main.js` and imports nothing heavy, so its ring buffer really is first; every other section reaches it through `addProvider` instead.
- Verified headlessly: no errors; the menu renders all sections with values right-aligned and a scroll indicator; the counter reads top-left; the magnifier sits bottom-right at 15%; the diagnostics blob builds at 594 bytes with env/display/frame/run/memory/layers/log sections.
- Deferred: forcing a tier changes `perf.tier` but nothing sheds yet — particles and bloom arrive at stage 14 and density at stage 7, and both read `tierParams()`.
- Needs device check: that the counter costs nothing measurable; that the governor actually sheds and restores when the phone is loaded; that the magnifier is faint enough to ignore but hittable; that panel scrolling never rubber-bands the page behind it; that Copy diagnostics reaches the iOS clipboard.

## Stage 4
- Built: `js/boids.js` (typed-array flock, rotating neighbour window so cost stays linear past 24 members, turn-rate cap so a school banks rather than snaps), `js/behaviours.js` (all twelve types plus the `renderFlock` and `renderChain` draw helpers), `js/creatures/base.js` (the poolable `Creature`, `makePool`), `js/debug/scene.js` (the proving ground behind `?debug=behaviours`).
- Decided: one `Creature` is one entity — a solo animal or a whole school — so pooling stays simple and a 60-strong bait ball costs one pool slot. Per-behaviour scratch lives in `c.d`, cleared rather than reallocated on spawn.
- Decided: a behaviour may drive its own animation frame via `c.d.frame` (pulsing does) or scale the frame rate via `c.fpsMul` (cruising, flapping, jetting), so the sprite step follows the motion.
- Decided: debug-scene creatures use parallax layer 0, which makes world coordinates screen coordinates, so each demo can be penned into its own cell without a second coordinate system.
- Verified headlessly: no errors; all twelve run at once and read as distinct — a tight schooling ball, a wide-turning cruiser, an S-rippling chain, a beat-and-glide wing, a pink pulsing bell, a lime jetting squid, three differently-coloured round demos for hovering/grazing/ambush, a skimming fish at its ceiling, a spinning faller and a diving bird that punches through and exits.
- Needs device check: whether each of the twelve still reads as its own thing in motion at 60 fps on a phone-sized screen, and whether the tuning rates feel right rather than merely different.

## Stage 5
- Built: `js/sprites/shapes.js` (parametric grid builders: fish, ray, bell, blob, star, segment), `js/creatures/{zone1,zone2,zone3}.js` (all 22 zone 1-3 residents with sprites, tuning and glossary metadata), `js/landmarks/{common,shallows,reef,dropoff}.js` (surface ceiling, sand flats, seagrass, shells, reef floor, coral heads, anemones, kelp, arches, the cleaning-station rock, the wall, gorgonian fans and the wreck), and the temporary `js/creatures/spawn-temp.js`.
- Decided: sprite grids are generated from a few measurements by `shapes.js` rather than typed as sixty character blocks. It is still pixel data defined in code, the style stays uniform across the roster, and each species file stays well under 250 lines. Sprite definitions therefore live beside their species in `js/creatures/zoneN.js`, not in a separate `js/sprites/zoneN.js` as stage 0 assumed.
- Decided: terrain is drawn as merged integer-height column runs, never as filled paths — a path edge on a 215 px canvas is an anti-aliased smear once it is upscaled 5x, which would break the hard-pixel rule.
- Decided: a seabed is a bounded ledge, not a fill to the screen bottom, so descending past it shows water again instead of a screenful of rock. The drop-off wall is locked to a screen side rather than a world x, because a wall has no far end for the sideways current to drift past.
- Decided: every species declares itself into `SPECIES` in `js/creatures/base.js`, glossary metadata included, so stage 10's registry can wrap one existing list rather than refactoring a second one into being.
- Verified headlessly: no errors; 39 sprites in one 1 MB atlas page; screenshots of all three zones read at a glance — bright shallows with sand flats, seagrass, a stingray, hermit crabs and sea stars under a rippling ceiling; a reef of coral heads, kelp and a tang school; and the drop-off with gorgonian fans down the wall and the wreck tilted on the slope with lit portholes and a broken mast.
- Needs device check: whether three size bands really read at once in each zone at phone scale, whether the wreck lands as a landmark you notice rather than scroll past, and whether the reef floor's sand-on-rock dither is too busy.

## Stage 6
- Built: `js/creatures/{zone4,zone5,zone6,zone7}.js` (all 26 zone 4-7 residents) and `js/landmarks/{open,twilight,midnight,vents}.js` — the wall receding into haze, the twilight pinnacle, the closing trench walls and boulder field, and the vent field's sediment plain, three black smokers and the whale-fall skeleton.
- Fixed a real bug in `js/camera.js` from stage 2: parallax multiplied `cam.y` directly, which slid every far-layer object clean out of its own zone (the twilight pinnacle was two bands below the screen). Parallax is now anchored on the middle of the view, with factor 0 reserved as a screen-space passthrough for the debug scene. This is the one earlier file stage 6 touched, and only to fix the bug that made its own landmarks unusable.
- Decided: a zone's defining landmark (the pinnacle, the smokers, the whale fall, the drop-off wall) is screen-anchored, because the sideways current would otherwise carry it out of frame and the zone would lose the thing that identifies it. Scattered decoration stays world-anchored and wraps.
- Decided: every zone-spanning landmark now fades in and out on the depth curve rather than switching on a zone index, so the trench is not still closing in over the vent field.
- Decided: custom renders carry what a sprite grid cannot — the anglerfish's lure on its stalk, the dragonfish's red beam, the bigfin squid's right-angled arms, the whale shark's remoras and pilot fish, and the tube worm bed's retracting plumes.
- Verified headlessly: no errors; 66 sprites still in one 1 MB atlas page, with the 170x54 whale shark rasterised intact; zone 4 reads empty with the whale shark dwarfing the hammerheads, zone 6 is dark with only bioluminescence and the bigfin's arms, zone 7 is warm with lit smoker crowns and the ribbed whale fall on its bacterial mat.
- Needs device check: whether zone 4's emptiness reads as deliberate rather than unfinished, whether zone 6 is legible at all at phone brightness, and whether the smoker plumes are too heavy over the top of the band.
