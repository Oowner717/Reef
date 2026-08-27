# Progress log

| Stage | Status | Version |
|-------|--------|---------|
| 0 | complete | 0.1.0 |
| 1 | not started | - |
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
