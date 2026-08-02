# Stellara — Magical Girl Year Console

Scriptable iPhone widgets that show:

1. **Year progress %** — how much of the year has passed
2. **Week grid** — every week sealed / active / still ahead

Two themes, same size-safe layouts (nothing overlaps on Small / Medium / Large):

| File | Theme |
|------|--------|
| `MagicalYearConsole.js` | **Dark** — void console, sakura glow, mint crystals |
| `MagicalYearConsoleLight.js` | **Light / kawaii** — candy pastels, hearts, soft blush panel |

## Install (Scriptable)

1. Install **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)**.
2. Open Scriptable → **+** → paste one script (or both as separate scripts).
3. Name them e.g. `Stellara Dark` and `Stellara Light`.
4. Home Screen → **Add Widget** → **Scriptable** → Medium (best) / Large / Small.
5. Edit widget → set **Script** to the theme you want.

Run a script inside Scriptable to preview all three sizes.

## Layout notes

- **Small** — compact stack: brand → % → bar → week grid → footer  
- **Medium** — split layout: % / bar on the left, week grid on the right (avoids vertical crush)  
- **Large** — full stacked console with room to breathe  

Week orbs stay inside their cells so neighbors never collide.

## Legend

| Element | Meaning |
|--------|---------|
| Big `%` | Fraction of the calendar year elapsed |
| Gradient bar | Same progress (spark tip on dark, heart tip on light) |
| Filled dots | Weeks already completed |
| Ringed mint dot | Current week |
| Soft empty dots | Weeks still ahead |
| Footer | Day-of-year and days remaining |
