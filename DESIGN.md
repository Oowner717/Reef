# Reef — design reference

The single place a build stage looks up an art or content decision. If a stage
finds itself inventing a colour, a size, a frame count or a beat, it belongs
here instead.

---

## 1 · Palette tokens

Defined once in `js/palette.js`. No hex value appears anywhere else in the app.
45 tokens.

### Water ramp — `w0` … `w8`

| Token | Hex | Used by |
|---|---|---|
| `w0` | `#5fd6dd` | surface, zone 1 top |
| `w1` | `#3aa6c4` | zone 1 bottom / zone 2 top |
| `w2` | `#2478a8` | zone 2 bottom / zone 3 top |
| `w3` | `#1a4f8a` | zone 3 bottom / zone 4 top |
| `w4` | `#123068` | zone 4 bottom / zone 5 top |
| `w5` | `#0c1440` | zone 5 bottom / zone 6 top |
| `w6` | `#070a1c` | zone 6 bottom |
| `w7` | `#03050f` | zone 7 top |
| `w8` | `#010208` | zone 7 floor |

### Warm accents

`accOrange #ff8a1f` · `accYellow #ffd83d` · `accCoral #ff6b6b` · `accRed #d92b3a`
· `white #f6f9ff` · `silver #c3d4e8` · `outline #0a0a14`

### Bioluminescence

`bioCyan #4ff2ff` · `bioMagenta #ff4fa0` · `bioLime #b8ff4a` · `bioViolet #8f6bff`
· `bioGold #ffe9a8`

### Environment

`rock1 #0f1633` · `rock2 #1c2450` · `kelp1 #1f6f4a` · `kelp2 #3fae6b`
· `seagrass #69c46a` · `coral1 #c8356c` · `coral2 #ff9f6b` · `gorgonian #e05a8a`
· `sand1 #c9a86a` · `sand2 #8f7346` · `bone #e8e2cf` · `ventHot #ff5a2e`
· `ventWarm #ffb03a` · `smoker #120a10`

### Bodies

`greyDark #2a3350` · `greyMid #4a5878` · `greyPale #8fa2c0` · `olive #4e6b3a`
· `oliveLight #7a9450` · `rust #7a3b1e` · `brown #4a3520` · `maroon #5a1f2e`
· `palePink #f2b8c6` · `glass #a8d8e8` · `silhouette #060810`

### Contrast rule (enforced when choosing a palette map)

Shallow creatures are warm and saturated against cool water. Open-water animals
carry a white belly or a bright outline. Deep creatures are `silhouette` or
`rock1` bodies with two to six glowing pixels, and the glow is what you see.
**Never a blue body on blue water without a bright outline or belly.**

---

## 2 · Layer stack, back to front

| # | Layer | Parallax | Added in stage |
|---|---|---|---|
| 0 | Water column (pre-dithered strip) | 0 (vertical scroll only) | 2 |
| 1 | Far haze / distant wall | 0.2× | 5 |
| 2 | Far creatures (hammerheads, sixgill, sperm whale) | 0.5× | 6–7 |
| 3 | Mid landmarks (coral, wreck, pinnacle, smokers, whale fall) | 1.0× | 5–6 |
| 4 | Mid creatures — most of the roster | 1.0× | 5–7 |
| 5 | Particles | 1.0× | 14 |
| 6 | Foreground rock and near creatures | 1.3× | 5–6 |
| 7 | Light shafts and caustics (additive) | 1.0× | 14 |
| 8 | Bloom (low-res additive) | — | 14 |
| 9 | Scanlines | — | 14 |
| 10 | UI — buttons, panels, fps counter, version stamp | — | 3 |

Layers 1–6 are the ones the debug menu toggles independently.

---

## 3 · Screen geometry and the column

- Internal resolution: integer scale `s` chosen from `devicePixelRatio` and the
  viewport so the internal width lands in **200–260 px**. On current iPhones
  `s` is 5 or 6. Internal canvas is `ceil(W/s) × ceil(H/s)` device pixels wide.
- The visible canvas is sized in CSS to exactly `iw*s / dpr` by `ih*s / dpr`
  and centred with a small overflow, so scaling is always a whole number and
  pixels stay hard.
- Landscape rotates the canvas 90° with a CSS transform; the composition is
  never re-laid out.

**Column geometry.** One zone band is one screen height: `ZONE_H = ih`, capped
at 571 px so the water strip never exceeds 4000 px tall. The column is
`COLUMN_H = 7 × ZONE_H`. The camera's top edge travels `0 → 6 × ZONE_H`, so at
the bottom the view holds exactly zone 7. Zone `k` (0-indexed) owns world y
`[k·ZONE_H, (k+1)·ZONE_H)`. Depth for zone lookup is the **camera centre**,
`y + ih/2`.

The world wraps horizontally at `WRAP_W = 4 × iw`.

**Transition band:** the outer 18% of each zone boundary cross-fades palette,
light, particle mix, spawn tables and audio, so no boundary is ever a line.

---

## 4 · The 5:20 timeline

320 seconds, scaled by `?speed=` and the journey-speed setting.

| Window | Phase | Camera y |
|---|---|---|
| 0–20 s | Linger at the surface | 0 |
| 20–160 s | Descend, 20 s per zone | 0 → 6·ZONE_H |
| 160–180 s | Linger on the vent field | 6·ZONE_H |
| 180–320 s | Ascend, 20 s per zone, reversed | 6·ZONE_H → 0 |

Descent and ascent are eased with a 2 s smoothstep at each end so the camera
never jerks out of a linger. Between the eases the rate is constant, so a zone
band takes 20 s of wall time whichever way the camera is going.

A gentle sideways current runs the whole time: `4 px/s` internal, sinusoidally
modulated ±40% on a 47 s period so parallax never looks metronomic.

---

## 5 · Zones

| # | Id | Name | Water top→bottom | Light | Particles | Landmarks |
|---|---|---|---|---|---|---|
| 1 | `shallows` | Surface Shallows | `w0`→`w1` | caustics full, shafts 1.0 | surface bubbles, caustic sparkle | surface ceiling, sand flats, seagrass, shells |
| 2 | `reef` | Coral Reef | `w1`→`w2` | shafts 0.8 | bubbles | coral heads, anemones, kelp stand, arches, cleaning rock |
| 3 | `dropoff` | The Drop-off | `w2`→`w3` | shafts 0.5, dust in beams | suspended dust | the wall, gorgonian fans, **the wreck** |
| 4 | `open` | Open Blue | `w3`→`w4` | shafts 0.15 | drifting motes | wall receding into haze, then nothing |
| 5 | `twilight` | Twilight | `w4`→`w5` | none, glow from above 0.05 | marine snow begins | one rock pinnacle in silhouette |
| 6 | `midnight` | Midnight | `w5`→`w6` | none, bioluminescence only | heavy marine snow | trench walls, boulder field |
| 7 | `vents` | The Vent Field | `w7`→`w8`, warm cast near floor | vent glow only | vent shimmer, sediment | black smokers, tube worm beds, **whale-fall skeleton** |

Each zone's strongest landmark is seeded to sit within the middle 40% of its
band, so the camera meets it head-on. Landmark placement is seeded from the
date (`YYYYMMDD` → a small xorshift), so each day's column differs.

---

## 6 · Size bands

Internal pixels, longest dimension, on a screen about 220 px wide.

| Band | Size | Pool cap |
|---|---|---|
| `motes` | 2–4 px | 240 |
| `small` | 6–14 px | 160 |
| `medium` | 16–48 px | 48 |
| `large` | 56–110 px | 12 |
| `huge` | 130–200 px | 2 |
| `mythical` | 200–300 px | 1 |

Three bands visible at once in most zones. **Never two `huge` on screen
together** — the spawner refuses the second.

---

## 7 · Behaviour library — the twelve

Every species names exactly one. Tuning is per species.

| Type | Core | Tells it apart |
|---|---|---|
| `schooling` | boids: separation, alignment, cohesion | tight+fast for baitfish, loose+slow for batfish |
| `cruising` | near-constant speed, wide slow turns | tail sweep amplitude tied to speed, almost no vertical change |
| `undulating` | chain of N segments each lagging the one ahead | the whole body ripples; head leads |
| `flapping` | beat / glide cycle | loses height on the glide, regains on the beat |
| `pulsing` | contract, thrust, long passive drift | sideways wander during the drift |
| `jetting` | still, still, still, fast burst | arms trail behind on the burst only |
| `hovering` | near-stationary, small bob, slow facing turn | interest is in the lure / fins / eyes, not the position |
| `grazing` | bound to a surface, crawls along it | repeating feeding animation, occasional puff |
| `skimming` | hugs the surface ceiling | occasional break-through in a spray of white pixels |
| `ambush` | hidden, emerges partway, watches, withdraws | long stillness, fast lunge |
| `falling` | pure drift with slow spin | no propulsion at all |
| `diving` | steep entry from above the ceiling, hard decelerate, grab, exit up | zone 1 only, seen from below only |

---

## 8 · Roster

`n` is the spawn count (a single number, or a range for a group). `fr` is the
number of animation frames, stepped at 6–10 fps.

### Travellers

| id | Name | Zones | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|---|
| `silverside` | Silverside bait ball | 1–4 | 3 | 2 | schooling | `silver`,`white` | 40–60 |
| `moonjelly` | Moon jellyfish | 1–5 | 12 | 3 | pulsing | `white`,`palePink` + glow rising with depth | 1–5 |
| `turtle` | Green sea turtle | 1–4 | 36 | 3 | flapping | `olive`,`oliveLight`,`accOrange` | 1–4 |
| `dolphin` | Bottlenose dolphin | 1–3 | 52 | 3 | cruising | `greyMid`,`white`,`silver` | 1–3 |
| `combjelly` | Comb jelly | 3–7 | 8 | 4 | pulsing | `glass` + cycling cilia shimmer | 3–7 |
| `sixgill` | Sixgill shark | 4–6 | 90 | 2 | cruising, far layer | `silhouette`,`greyPale` belly line | 1 |
| `lanternfish` | Lanternfish | 4–6 | 7 | 2 | schooling | `rock1`,`bioCyan` dots blinking in sequence | 16–24 |
| `siphonophore` | Giant siphonophore | 5–7 | 3×110 | 3 | undulating (vertical) | `bioCyan`,`bioLime` beads | 1 |
| `krill` | Krill swarm | 5–7 | 2 | 1 | motes, part around anything | `greyPale` faint glow | 60 |
| `spermwhale` | Sperm whale | 4–6 | 180 | 2 | cruising, diving | `silhouette`,`greyPale` jaw | 1 · p=0.25/run |

### Zone 1 — Surface Shallows

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `needlefish` | Needlefish | 20 | 2 | skimming | `silver`,`greyMid` back | 2–4 |
| `flyingfish` | Flying fish | 14 | 3 | skimming, breaks surface | `greyMid`,`white` fins | 2–3 |
| `mullet` | Mullet school | 10 | 2 | schooling near sand | `olive`,`silver` flank | 12–18 |
| `stingray` | Southern stingray | 44 | 3 | flapping along the bottom, buries | `sand2`,`white` under | 1 |
| `hermitcrab` | Hermit crab | 6 | 2 | grazing | `accOrange`,`sand2` | 2–3 |
| `seastar` | Sea star | 8 | 2 | static, one arm curls | `accCoral` | 2–4 |
| `grassshrimp` | Seagrass shrimp | 3 | 2 | motes among the blades | `glass` | 20–28 |
| `seabird` | Diving seabird | 30 | 3 | diving | `silhouette`,`white` wing flash | vignette actor only |

### Zone 2 — Coral Reef

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `tang` | Tang school | 11 | 2 | schooling | `accYellow`,`outline` | 8–14 |
| `clownfish` | Clownfish pair | 8 | 2 | bound to an anemone | `accOrange`,`white`,`outline` | 2 |
| `damselfish` | Damselfish | 6 | 2 | fast darting schooling | `bioMagenta`,`bioLime` | 10–16 |
| `angelfish` | Angelfish | 18 | 2 | slow solo cruising | `accYellow`,`outline` stripes | 1–2 |
| `parrotfish` | Parrotfish | 24 | 3 | grazing, each bite puffs sand | `w0`,`bioMagenta` | 1–2 |
| `octopus` | Octopus | 22 | 3 | hovering, colour shift, occasional jet | `coral1`↔`accOrange`↔`rock2` | 1 |
| `moray` | Moray eel | 26 | 3 | ambush | `kelp2`,`outline` spots | 1 |
| `seahorse` | Seahorse | 10 | 2 | anchored to kelp, bob | `accCoral` | 1–2 |
| `cleanershrimp` | Cleaner shrimp | 4 | 2 | grazing on the station rock | `white`,`accRed` bands | 3–5 |
| `blacktip` | Blacktip reef shark | 60 | 2 | cruising the outer edge | `greyMid`,`outline` tips,`white` belly | 1 |

### Zone 3 — The Drop-off

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `wreck` | The wreck | 120 | — | landmark | `silhouette`,`rust`,`accYellow` portholes | 1 |
| `barracuda` | Great barracuda | 46 | 2 | hovering, then sudden cruise | `silver`,`greyDark` bars | 1 |
| `grouper` | Grouper | 40 | 2 | hovering inside the hull | `brown`,`sand2` blotches | 1 |
| `batfish` | Batfish school | 22 | 2 | slow loose schooling round the wreck | `greyDark`,`greyPale` edge | 6–10 |
| `gorgonianfan` | Gorgonian sea fan | 40 | 3 | landmark, slow sine sway | `gorgonian` | 3–5 |
| `urchin` | Sea urchin | 6 | 2 | grazing the wall | `bioViolet` spines | 4–6 |
| `lionfish` | Lionfish | 20 | 2 | hovering near the wall | `accRed`,`white` bands | 1–2 |

### Zone 4 — Open Blue

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `whaleshark` | Whale shark | 170 | 2 | cruising, mouth open | `greyDark`,`white` spot grid | 1 |
| `manta` | Manta ray | 80 | 3 | flapping foreground glide | `silhouette`,`white` under | 1 |
| `sunfish` | Ocean sunfish | 56 | 3 | drifts almost still, tall fins | `greyPale`,`white` outline | 1 |
| `sailfish` | Sailfish | 50 | 3 | fast cruising | `greyDark`,`bioViolet` sail | 1 |
| `hammerhead` | Hammerhead | 66 | 2 | cruising in loose formation, far haze | `silhouette` | 3–5 |
| `bluejelly` | Blue jellyfish | 14 | 3 | pulsing | `glass`,`white` bell | 3–6 |

### Zone 5 — Twilight

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `hatchetfish` | Hatchetfish | 9 | 2 | schooling, flank flash on the turn | `silver`,`bioCyan` belly | 8–12 |
| `vampiresquid` | Vampire squid | 20 | 3 | jetting, curls into a spiny ball | `maroon`,`bioCyan` arm tips | 1 |
| `salpchain` | Salp chain | 4 × 20 | 2 | pulsing chain that snakes | `glass` faint glow | 1 |
| `barreljelly` | Barrel jellyfish | 30 | 3 | pulsing | `bioViolet` bell | 1–2 |
| `squid` | Squid | 26 | 3 | jetting in loose company | `greyPale`,`bioMagenta` flicker | 3–5 |
| `bristlemouth` | Bristlemouth | 5 | 2 | schooling, very faint | `silhouette`, one dot row | 20–28 |

### Zone 6 — Midnight

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `anglerfish` | Anglerfish | 24 | 3 | hovering, lure bobs and blooms | `silhouette`,`bioGold` lure | 1 |
| `gulpereel` | Gulper eel | 46 | 3 | undulating, balloons its jaw | `silhouette`,`bioLime` gill line | 1 |
| `barreleye` | Barreleye | 16 | 2 | hovering, eyes track upward | `rock1`,`glass` dome,`bioLime` orbs | 1 |
| `dragonfish` | Dragonfish | 22 | 2 | hovering, red beam sweeps | `silhouette`,`accRed` beam | 1 |
| `bigfin` | Bigfin squid | 20 + 160 arms | 2 | hovering, arms at right angles | `bioViolet`,`bioCyan` joints | 1 |
| `glowjelly` | Glow jellyfish | 16 | 3 | pulsing, brightest thing here | `bioMagenta` or `bioCyan` | 3–4 |
| `snipeeel` | Deep-sea snipe eel | 40 | 3 | undulating slowly | `rock1` ribbon | 1–2 |

### Zone 7 — The Vent Field

| id | Name | px | fr | Behaviour | Palette | n |
|---|---|---|---|---|---|---|
| `smoker` | Black smoker | 90 | 3 | landmark, slow plume | `smoker`,`ventHot` crown | 2–3 |
| `tubeworm` | Tube worm bed | 20 | 3 | grazing sway, plumes retract | `bone` tubes,`accRed` plumes | 3–5 |
| `ventshrimp` | Vent shrimp swarm | 3 | 2 | motes round the vent glow | `palePink` | 40 |
| `dumbo` | Dumbo octopus | 18 | 3 | flapping | `palePink` faint glow | 1–2 |
| `tripodfish` | Tripod fish | 14 + 20 stilts | 2 | motionless on stilts, faces the current | `greyPale`,`outline` eye | 1–2 |
| `seacucumber` | Sea cucumber | 12 | 2 | grazing the sediment | `maroon` | 2–3 |
| `brittlestar` | Brittle star | 10 | 2 | grazing a boulder, arms coil | `greyPale` | 3–5 |
| `whalefall` | Whale-fall skeleton | 190 | — | landmark | `bone`,`silhouette` sockets | 1 |
| `hagfish` | Hagfish | 16 | 3 | undulating round the whale fall | `greyPale` | 3–6 |

---

## 9 · The 33 vignettes

One per zone visit. Start 3–6 s into the 20 s window, run 6–10 s, finish with
≥3 s to spare. Each has a **setup**, a **beat** and a **payoff**.

| id | Zone | Setup → beat → payoff |
|---|---|---|
| `seabird-dive` | 1 | Ceiling calm → dark silhouette punches through in white spray and a bubble ring → it climbs out with a mullet, bubbles rise |
| `ray-burial` | 1 | Ray settles on sand → shivers itself under, sand cloud blooms → cloud clears to two eyes and a tail |
| `bait-ceiling` | 1 | Bait ball loose → driven up, flattens into a sheet on the ceiling → holds, then pours back down |
| `turtle-breath` | 1 | Turtle angles up → breaks the ceiling in a white splash seen from below → glides down trailing bubbles |
| `seagrass-gust` | 1 | Grass still → a travelling wave lays the whole bed flat → shrimp and detritus lift and resettle |
| `cleaning-station` | 2 | Grouper parks at the rock → shrimp swarm it, mouth and gills held open → it flushes pale, then dark, and moves off |
| `octopus-hunt` | 2 | Octopus flows over a rock, colour-matching → pounces in a spread of arms → sand puff, it settles with the crab |
| `parrotfish-bite` | 2 | It grazes hard at a coral head → a chunk of coral pixels breaks away → a sand plume jets out behind and hangs |
| `moray-strike` | 2 | The eel's head tracks a damselfish across frame → lunges half its body out → withdraws, the school regroups |
| `coral-spawning` | 2 | Coral heads still → every head releases pale bundles in synchrony → the cloud rises through the shafts and out of frame |
| `barracuda-strike` | 3 | It hangs motionless → crosses the screen in two blur frames into a school → the school bursts, it drifts back and hangs |
| `wreck-exhale` | 3 | A shudder runs the hull → a fat slug of bubbles escapes a porthole → it wobbles up the wall and breaks apart |
| `batfish-carousel` | 3 | Batfish gather against the wall → tighten into a slow rotating spiral → unwind and disperse |
| `grouper-yawn` | 3 | It drifts out of the hull → opens its mouth impossibly wide and holds → closes and sinks back inside |
| `lionfish-fan` | 3 | Spines folded → spreads to full width, herding a small fish against the wall → folds down, the fish escapes |
| `sailfish-run` | 4 | Sail down, bait ball loose → sail up, it circles the ball into a tight sphere → it slashes through, the ball bursts and re-forms |
| `whaleshark-pass` | 4 | Silhouette resolves out of the haze → crosses mouth open, remoras and pilot fish with it → the bait ball parts and closes |
| `manta-roll` | 4 | It glides into a plankton cloud → a slow backward loop, white underside at the apex → it levels out and glides on |
| `hammerhead-column` | 4 | Loose in the haze → they stack into a vertical column and hold → the column disperses |
| `mirror-flash` | 5 | The hatchetfish school swims level → turns as one, every flank catches the light in a single white frame → they scatter into the dark |
| `vampire-pineapple` | 5 | It drifts, arms loose → startled, inverts its web into a spiny ball and holds → unfurls with arm tips glowing |
| `siphonophore-unfurl` | 5 | The chain hangs coiled → stretches to full length in a travelling wave, beads lighting in sequence → it drifts, fully lit |
| `chromatophore-run` | 5 | A squid hangs still → runs waves of magenta down its body, twice → hangs, then jets away |
| `the-lure` | 6 | The anglerfish's lure brightens and swings → a small fish drifts in → the light snaps out, black for a beat, marine snow resolves |
| `gulper-balloon` | 6 | The eel undulates past → its jaw inflates to several times its body and engulfs → deflates and folds away |
| `beam-sweep` | 6 | The dragonfish's red beam idles → sweeps the dark and picks out a large shape nothing else could show → the shape fades back |
| `bigfin-drift` | 6 | Arms enter frame at right angles → it descends the full screen, thin glowing lines everywhere → it passes out of the bottom |
| `plankton-burst` | 6 | A plankton cloud drifts → something unseen disturbs it → a ring of blue sparks blooms outward and fades |
| `smoker-billow` | 7 | The chimney simmers → belches a dense dark plume → it rolls upward, lit orange from below |
| `worm-retract` | 7 | The bed sways open → a shadow crosses, plumes snap into their tubes in a travelling ripple → they re-emerge one by one |
| `hagfish-knot` | 7 | A hagfish threads the ribs → ties itself into a knot and slides it down its own body → a pale slime cloud disperses |
| `backlit-dumbo` | 7 | It flaps in from the dark → passes directly through the vent glow, ear fins translucent → it flaps back out |
| `whalefall-stir` | 7 | The bacterial mat glows steady → it pulses brighter, brittle stars converge across the ribs → a bone settles in a puff of sediment |

**Selection:** shuffled bag per zone, persisted. Never let a reshuffle repeat the
last one played. A mythical encounter overlapping a zone visit cancels that
visit's vignette outright.

---

## 10 · Audio layer per zone

| Zone | Layer |
|---|---|
| bed (all) | brown noise → low-pass with a slow LFO, plus a quiet sine drone; cutoff falls and the drone drops in pitch with depth |
| 1 | surface wash, filtered noise swelling on a 4–6 s cycle; a muffled thud and bubble fizz on the seabird break |
| 2 | snapping-shrimp crackle — band-passed noise ticks at 3–5 kHz, 0.2–1.5 s apart; bubble blips sweeping 600→1200 Hz over 60–120 ms |
| 3 | the crackle thins; occasional wreck creak — a low filtered groan on a slow envelope |
| 4 | the bed alone, with a very low swell near 50 Hz on a 6–10 s envelope. The emptiness is audible |
| 5 | a faint high shimmer, sparse and cold |
| 6 | sub hum near 40 Hz, rare distant groans — band-passed noise sweeps over 2–4 s at very low gain |
| 7 | steady low rumble, gain rising with proximity to a smoker, plus irregular hisses |
| mythical | a slow rising approach tone per creature, and a deep resonant swell when the move fires — the loudest moment in the app, still under the room |

---

## 11 · The seven mythicals, side by side

Checked for overlap: no two share a colour family, a silhouette class or a
motion class, and exactly one is warm.

| # | Name | Colour | Silhouette class | Motion class | Move | Afterglow |
|---|---|---|---|---|---|---|
| 1 | The Tidewyrm | cyan→violet→magenta, cycling | serpent, 240×14, 16 segments | continuous ripple, lagged chain | coils into a loop, releases an **expanding ring of light** that rim-lights everything | falling light motes, fish scatter then turn in unison |
| 2 | The Halcyon Ray | pale gold body, violet spots | wing, 260 wide × 70 deep, trailing veils | flap-and-glide with a bank | a **colour wave** runs wingtip to wingtip, then a cascade of glowing spores | spores bloom and fade over 8 s, small fish trail the wake |
| 3 | The Diadem | pure cyan-white | ring, 200 px, 40 linked bodies | rotates without turning, always faces you | **contracts to a point** while the screen dims, then **detonates** into a shockwave | a field of drifting embers |
| 4 | The Pale | none — transparent | void whale, 280 px; the scene shows through it | slow, straight, unhurried | **inhales** — particles and small fish stream in and the screen empties — then a **bubble shockwave** | bubbles rise for 8 s, loose matter drifts back in |
| 5 | The Reefwalker | warm orange, coral, lime (**the only warm one**) | walking colossus, 300 px, reef on its back | steps on limbs, never swims; hugs the seabed and the wall | **plants and blooms** — coral opens in a wave, resident fish burst outward in a ring | fish filter home, polyps close one by one |
| 6 | The Lantern Court | warm white, pale gold | procession — a 120 px queen plus 30 | synchronised pulse wave travelling outward through the court | the bell lowers a **chandelier of light filaments** across the screen | filaments retract slowly, the court closes formation |
| 7 | The Nautilid | magenta and amber chambers, black ink | spiral shell, 220 px, tentacle crown | jetting — still, still, smooth surge, shell first | chambers **fire in sequence**, then a **spiral ink vortex** that resolves into a decoy of itself | the decoy dissolves into drifting particles |

**The signature moment of the whole app:** the Tidewyrm's ring — a dithered
circle of light washing outward across the entire screen, rim-lighting every
rock, landmark and creature it passes over, with the wyrm held in its coil at
the centre. Everything else is composed so that this reads as the peak.

**Flashing limits:** every brightness ramp ≥300 ms, never more than three
flashes a second, and the swing halves under reduced motion.

---

## 12 · The glossary

**Sections, in order:** Creatures by zone (1→7) · Travellers · Scenes · Mythicals.

**A row** is an animated sprite thumbnail (the real sprite, really animating),
the display name, zone dots, and the size band. Tapping expands one line:
where it lives, how it moves, and one plain sentence about the real animal.

**A locked row** is the same sprite drawn as a solid `silhouette` fill, the name
replaced by dashes of the same length, the zone dots still shown, and no size
band or note. Tapping a locked row does nothing.

**Header:** `seen / total`, a per-zone completion bar (7 short bars), and one
stats line — runs watched, total time, deepest zone.

**Seen:** a creature after one continuous second visibly on screen; a vignette
on completion; a mythical when its encounter completes.

Everything is generated from `js/registry.js`. A creature in the app but not in
the glossary is a registry bug.

---

## 13 · Settings rows and defaults

| Row | Options | Default |
|---|---|---|
| Sound | off · quiet · normal | off until first tap, then normal |
| Keep screen awake | on · off | on |
| Journey speed | slow (0.5×) · normal · brisk (2×) | normal |
| Start zone | surface · reef · drop-off · open blue · twilight · midnight · vents | surface |
| Creature density | sparse (0.6×) · normal · crowded (1.4×) | normal |
| Scanlines | on · off | off |
| FPS counter | on · off | off |
| Motion | full · reduced · match system | match system |
| Mythicals per run | one · two · three | two |
| Glossary button | show · hide | show |
| Debug button | show · hide | shown below 1.0.0, hidden at 1.0.0+ |
| Reset | clear seen · clear everything | asks once, in the panel |

Precedence: URL parameter (session only, never saved) → saved value → default.
An overridden row carries a dot and a one-line note at the foot of the panel.

---

## 14 · The button cluster

Bottom-right, inside the safe area, 12×12 px each with a 4 px gap.

| Order | Icon | Opens | Resting opacity |
|---|---|---|---|
| 1 (left) | pixel **shell** | glossary | 25% |
| 2 | pixel **dial** — three short horizontal lines, a knob on each | settings | 25% |
| 3 (right) | pixel **magnifier** — a circle with a short handle | debug menu | 15% |

One shared fade: **full for 3 s after any tap, fading back over 1 s, dropping
to 10% during a mythical encounter or a vignette peak.** That is the entire
interface.

---

## 15 · The title screen

About 2.5 s, cold start only, doubling as the loading screen.

- **Background:** the real water renderer at the surface with the real light
  shafts. Three creature silhouettes drift across at parallax 0.5, and one
  mythical silhouette (whichever the bag will serve next) crosses far back at
  parallax 0.2 in the haze.
- **Wordmark:** `REEF` in 16 px-tall pixel letters built from sprite grid data,
  centred at 42% of screen height, `white` on the water with an `outline` drop
  shadow one pixel down-right. A caustic shimmer — a 24 px-wide bright band —
  travels left to right across the letter faces once every 1.8 s.
- **Line beneath,** 3×5 font, `silver` at 60%: the version, and after the first
  run the seen count (`58 / 78 seen`), 8 px below the wordmark.
- **Fade:** 600 ms cross-fade into the scene, never a cut. If the save holds a
  run position from the last five minutes, fade into *that* depth instead of
  the surface.
- Tap to skip. `?title=0` disables it. Under reduced motion, drop the shimmer
  and the drifting silhouettes; keep the wordmark and the fade.

---

## 16 · The icon

The whole descent in one square: a dithered column from `w0` at the top to `w8`
at the bottom, one light shaft down the left third, and a single bold
`accYellow` tang mid-frame at about 40% of the icon's width, facing right, with
an `outline` edge. No text. Drawn from the same sprite data as the app. Shapes
must read at 60 px; 6% margin all round for the iOS rounded mask.

---

## 17 · Memory and performance ceilings

| Surface | Size | Bytes |
|---|---|---|
| Water strip | `iw × 7·ZONE_H` | ≈ 3.4 MB |
| Sprite atlas | up to 4 × 512×512 | ≤ 4 MB |
| Bloom buffer (stage 14) | `iw/2 × ih/2` | ≈ 0.06 MB |
| Visible canvas | `iw × ih` | ≈ 0.5 MB |

Total well under the 32 MB budget. Nothing exceeds 4096 px in either dimension.

**Frame budget, 12 ms:** water and parallax 2 · creatures 4 · particles 2 ·
effects and bloom 3 · everything else 1.

**Quality tiers:** 0 everything · 1 particles −40%, bloom at half res · 2 bloom
off, shafts down to two, density −30% · 3 minimum particles, no bloom or
caustics, density −50%, parallax merged. Drop a tier when the 1% low stays
under 55 for 3 s; raise one only after 20 s above 58 average and 57 on the 1%
low. Never change tier during a vignette payoff or a mythical hold frame.
