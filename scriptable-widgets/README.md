# Stellara — Magical Girl Year Console

A Scriptable iPhone widget that shows:

1. **Year luminosity** — percentage of the year that has passed (hero number)
2. **Week crystals** — a glowing grid of every week in the year; sealed weeks light up, the current week pulses as a mint crystal, future weeks stay dormant glass

Aesthetic: magical-girl control panel — deep void, sakura glow, rose-gold shimmer, mint tech accents, star sparks.

## Install (Scriptable)

1. Install **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** from the App Store.
2. Open Scriptable → tap **+** → paste the contents of `MagicalYearConsole.js`.
3. Name the script something like `Stellara Year Console` and save.
4. On your Home Screen: long-press → **Add Widget** → choose **Scriptable**.
5. Pick **Medium** (best) or **Large** / **Small**.
6. Long-press the widget → **Edit Widget** → set **Script** to your saved script. Leave **When Interacting** as default (or *Run Script*).

Run the script inside Scriptable first to preview Small / Medium / Large.

## What you’ll see

| Element | Meaning |
|--------|---------|
| Big `%` | Fraction of the calendar year elapsed |
| Gradient bar | Same progress, with a leading spark |
| Filled pink/gold dots | Weeks already completed |
| Bright mint ring | Current week |
| Dim glass dots | Weeks still ahead |
| Footer | Day-of-year and days remaining |

## Tips

- Medium size balances the percentage and the full week grid best.
- Large gives the crystals more room to breathe.
- Small keeps the % + a denser 13-column week grid.
- The widget refreshes about every 3 hours (iOS may delay this).
