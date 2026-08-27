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
| 7 | complete | 0.8.0 |
| 8 | complete | 0.9.0 |
| 9 | complete | 0.10.0 |
| 10 | complete | 0.11.0 |
| 11 | complete | 0.12.0 |
| 12 | complete | 0.13.0 |
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

## Stage 7
- Built: `js/creatures/travellers.js` (all ten travellers, including a vertical-chain behaviour for the siphonophore, which hangs rather than swims) and `js/spawner.js` (per-species depth ranges, an active window that reaches 2.8 screens ahead in the direction of travel and 1.3 behind, off-screen-only spawning, retirement well outside it, band caps and pooling). Deleted `js/creatures/spawn-temp.js`.
- Decided: the population target is scaled up for small life, because the window is four screens tall and nearly two wide — a target of "maxAlive in the window" leaves a quarter of that in view. Large animals are not scaled and Huge is hard-limited to one anywhere near the camera.
- Decided: the initial fill (and any camera jump) is allowed to place creatures on screen, because at a cold start there is no "in view" to protect; every subsequent spawn lands outside the visible rect, and nothing is retired while `onScreen(40)` is true.
- Decided: spawn x is biased to within about a screen width of the camera. Uniform placement across the four-screen wrap left three quarters of the roster permanently unseen.
- Decided: the species sweep starts from a rotating offset each tick, so a band at its cap does not permanently starve whatever sits last in the table.
- Fixed: the moray declared `renderChain` but runs the ambush behaviour, which never builds a spine — a null dereference every frame it was on screen. It now has its own renderer that trails its body back into its hole.
- Verified headlessly: no errors at any depth; 77-104 live entities with the right species per band; `?density=` scales 56 / 104 / 117 across 0.3 / 1 / 2 and is bounded by the band caps; screenshots show a busy reef, a populated drop-off around the wreck, and midnight carrying only krill, glow jellies and a siphonophore.
- Needs device check: that nothing is ever seen appearing or disappearing during a full run, that the frame budget holds with ~100 entities, and that per-frame allocation really is near zero (index loops, a shared spawn-position object, cached sprite keys and typed-array flocks, but only a device profile can confirm it).

## Stage 8
- Built: `js/save.js` (one versioned blob, debounced 2 s writes, flush on visibilitychange/pagehide/freeze, corrupt saves backed up rather than crashed on, silent in-memory fallback), `js/bag.js` (shuffled bag with no-immediate-repeat across reshuffles and a `sync()` for when the item list grows), `js/vignettes/{base,fx,director}.js` and the fifteen zone 1-3 vignettes.
- Decided: vignettes drive their actors by writing positions after the spawner has run (director at updater order 20, spawner at 10), so no earlier module needed a hook for hand-over. Actors are promoted from what is already on screen where possible and spawned only when they must be.
- Decided: a vignette may declare `can()`. The three staged on the surface film refuse to play once the ceiling has scrolled out of frame, and the cleaning station refuses when its rock is off screen — the director takes the next in the bag instead of playing a scene against nothing.
- Decided: `js/vignettes/fx.js` is a small hard-capped pool for set-piece particles only. Stage 14's `js/particles.js` is the ambient system and is separate.
- Fixed three defects in earlier files, all of which broke things stage 8 depends on: `?start=1` skipped the entire surface linger, so the ceiling was never in view (camera.js); schooling species had a separation radius smaller than their own sprite and packed into solid blobs (base.js now floors it at the sprite width); and the reef arches drew as square goal posts rather than rock (reef.js).
- Hooks added to stage 5 landmarks for staging: `gust` on the shallows, `stationInView()` on the reef, `wreckScreen()` on the drop-off.
- Verified with a real-time Chromium/CDP driver (new, in the scratchpad — the virtual-time harness cannot run long enough for a scene to play): all fifteen trigger and reach their peak frame with no console output; a 50 s run of ordinary play completed `ray-burial` then `octopus-hunt`, wrote 700 bytes of save, and shuffled all seven bags; `?vignette=lionfish-fan` jumps the camera to its zone and plays it.
- Needs device check: whether each beat is legible in a few seconds to someone who does not know what it is, and whether the fx particle counts hold the frame budget during a payoff.

## Stage 9
- Built: the remaining eighteen vignettes in `js/vignettes/{zone4,zone5,zone6,zone7}.js`. The registry now holds 33, split 5/5/5/4/4/5/5 across the seven zones, exactly as specified.
- Added to the director: `findAll(id)`, for the scenes that stage a whole group (the hammerhead column, the worm bed, the brittle stars). Added to the vent field: a `ventFx` channel so the smoker plume can swell and the bacterial mat can brighten.
- Added to `js/vignettes/base.js`: `worldAt(screenX, screenY, layer)` and `softGlow()`. The first is a genuine correctness fix — placing a far-layer actor with plain world coordinates puts it somewhere else entirely, which is why the hammerhead column never formed. The second replaces the flat rectangles the backlit dumbo and the crossing shadow were drawing.
- Fixed in the director: a vignette that overran into the next band cost that band its vignette outright, because the visit was marked begun while one was still running and never revisited. The visit is now deferred until the previous scene finishes.
- Verified with the CDP driver: all eighteen trigger and reach their peak with no console output; two 95 s runs from zone 4 played four different vignettes each and shared none — `hammerhead-column / plankton-burst / backlit-dumbo` on the first and `whaleshark-pass / siphonophore-unfurl / the-lure / hagfish-knot` on the second, so consecutive runs genuinely differ.
- Needs device check: whether the darkest beats — the lure snapping out, the beam sweep, the smoker billow — read at phone brightness, and whether the frame budget holds through the heaviest payoff.

## Stage 10
- Built: `js/registry.js`, `js/glossary/seen.js` and `js/glossary/panel.js`, plus the pixel shell added to the existing button cluster and the panel built inside the existing overlay shell — no new button or panel modules.
- Refactored (the one stage allowed to): the spawner and the vignette director now read `spawnable()` and `scenesForZone()` from the registry rather than importing `SPECIES` and `VIGNETTES` directly. Because every species and vignette already declared its own glossary metadata where it was defined, the registry only had to group and order what exists — there was no second list to merge.
- Decided: landmarks (the wreck, the whale fall, the smokers, the gorgonian fans) are not glossary entries. They are environment rather than creatures or scenes, and the open question in the game plan is left answered that way; the registry would pick them up immediately if that changed.
- Decided: locked rows draw the real sprite through a `source-in` fill on a scratch canvas, so the silhouette is the actual shape rather than a placeholder box. Thumbnails animate at 1x, 1/2, 1/3 or 1/4 — whole fractions only, so the pixels stay hard.
- Decided: the header is drawn after the rows on its own ground, so scrolled entries pass behind the counter instead of through it.
- Verified with CDP: 92 entries across nine sections (49 creatures by zone, 10 travellers, 33 scenes); `?seen=all` unlocks everything; unlocked rows animate with name, zone dots and size band; locked rows are dark silhouettes with dashed names; tapping expands to where it lives, how it moves and the note, wrapped inside the panel; scrolling works; seen state writes to localStorage.
- Deferred: the Mythicals section is empty until stage 15 registers the seven. The stats line reads zeros until stage 11 starts tracking them.
- Needs device check: that the shell is unnoticeable until looked for, that the notification dot reads, that scrolling inside the panel never moves the page behind it, and that seen state survives closing the app on the phone.

## Stage 11
- Built: `js/settings/settings.js` (the precedence chain, eleven rows, live apply, stats and the run position) and `js/settings/panel.js` (the rows in the shared shell, the override dot and footer, the two-step Reset, and the About section), plus the pixel dial added to the existing cluster.
- Decided: an overridden row is dimmed, dotted and inert rather than silently ignoring taps, and the footer names which rows the URL owns. A person who changes a setting and sees nothing happen now gets an explanation instead of a mystery.
- Decided: `applyAll()` skips overridden rows. Journey speed and creature density are multipliers already carried by `cfg`, so applying the session value again would square them.
- Fixed: `settings` initialised before `fps`, so `fps.init()`'s own `fpsState.on = cfg.fps` overwrote the value the save had just restored. The wiring block now runs settings after every module it applies into, with a comment saying why.
- Stats: runs increment on the camera's run-end hook, watched time accumulates every frame, deepest zone tracks the maximum reached, and the run position is written on the same 2 s debounce — which is what stage 12's depth resume and a silent Safari reload both need.
- Verified with CDP: three settings changed, written to the save, and still in force after a reload, with `fpsOn / densityMul / app.reduced` all live. A five-case robustness suite injected before the app's first line — normal, corrupt save, future schema version, `localStorage` throwing on every access, and `?save=0` — runs clean in all five: the corrupt and future saves are backed up and the app starts fresh, storage-denied falls back to memory with zero writes, and every case keeps rendering with a full population and no console errors.
- Needs device check: that each row's change is visible immediately on the phone, that the two-step Reset reads clearly, and that the dial is distinguishable from the shell at 25% opacity.

## Stage 12
- Built: `js/title.js` — the REEF wordmark generated from 6x7 letter blocks scaled 3x, a drop shadow, a caustic shimmer band clipped across the letter faces, the version and seen-count line, three creature silhouettes drifting, and a serpent far back in the haze as a tease for something not yet met. Extended `tools/set-version.mjs` to stamp `sw.js`'s cache name and the manifest's version, ready for stage 13.
- Decided: the title hazes the real scene back rather than replacing it, so the water, the ceiling, the sand and the live population are all still what you are looking at. It costs no loading time because the atlas, the water strip and the save all happen before the first frame regardless.
- Decided: the depth resume runs whether or not the title is shown. A silent Safari reload has to land at the same depth even with `?title=0`, and `?start=` still wins over it.
- Fixed a crash that would have hit every cold start: `title.js` called `spawner.repopulate()`, but `repopulate` is a module export rather than a property of the `spawner` object. Added `seek(t)` to the camera so the resume can land on an arbitrary point in the run.
- Verified with CDP: the title holds 2.2 s and cross-fades out over 600 ms with no cut; a tap jumps to the fade rather than cutting; `?title=0` disables it; under reduced motion the shimmer, the drifters and the serpent are dropped and the wordmark and fade remain; after 40 s of play at `?speed=6` a reload resumed at t=231.9 in zone 4 from a saved t=229.5.
- Final sanity run: 20 s of ordinary play, 1262 frames, 100 pooled entities, quality tier 0, 2.52 MB of offscreen surfaces, 18 layers, 10 of 92 glossary entries seen, no console output.
- Needs device check: that the fade into the scene has no seam at real frame rate, that the wordmark reads at phone size, and that returning within five minutes feels like resuming rather than restarting.
