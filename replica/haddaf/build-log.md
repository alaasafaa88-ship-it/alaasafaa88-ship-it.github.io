# Build log: هدّاف

| screen | date | state | notes |
| --- | --- | --- | --- |
| S01 home | 2026-10-27 | done | hero card (name, kit), points/stars/cash/level, hearts with refill timer |
| S02 seasons and levels | 2026-10-27 | done | 6 seasons x 10 levels, locked/current/done tiles, trophy on a completed season |
| S03 match | 2026-10-27 | done | canvas pitch with perspective, draw-to-kick, power meter, scoreboard, hints, slow motion |
| S04 goal result | 2026-10-27 | done | stars, points, cash, bonuses, trophy notice, next/retry |
| S05 fail | 2026-10-27 | done | reason + tip, retry (costs the heart), rewind for cash (refunds the heart) |
| S06 no hearts | 2026-10-27 | done | countdown to the next heart |
| S07 pause | 2026-10-27 | done | resume, restart, levels, home |
| S08 settings and hero | 2026-10-27 | done | name, kit, skin, hair with live preview, sound, slow motion, wipe |
| S09 stats and trophies | 2026-10-27 | done | goals, attempts, assists, curves, lofts, best score, six cups |

Physics: the ball follows the drawn path (smoothed, resampled per unit), speed
from the path length, loft from the extra length, then free roll with friction.
Keeper predicts the crossing point with a reaction delay, blends in the ball's
current x so curved shots fool him, and commits near the goal. Defenders patrol
and chase within a leash. Receiving teammates become the holder.

Levels 4-60 are generated from a seed per level. An automatic solver (straight,
curved and lofted shots, one- and two-pass combinations) runs in a headless
browser; levels that it could not beat with a fair rate and a three-star line
got a seed "salt" baked into `SALTS` in `js/game.js`. Every level is beatable
with at least a few percent of naive attempts and all have a three-star line.

Harder than expected: the first keeper tuning saved almost everything from
level 15 on; fixed by slowing him, making his prediction imperfect and locking
his dive. Also a headless-simulation crash from creating thousands of audio
nodes; sounds are now skipped in headless mode.

Tested with Playwright at 390px and 412px: first three levels by pointer
drags, rewind, stats, settings, zero console errors.
