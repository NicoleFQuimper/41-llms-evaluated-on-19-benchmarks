# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** for iPhone Home Screen (Scriptable), with two looks:

| Theme | Vibe |
|--------|------|
| `kawaii` (default) | Magical-girl pastels, sparkles, **pixel heart per event** |
| `classic` | Dark 24h dial |

## Install / refresh

1. Open **Scriptable** → create or replace script **Sectograph 24h**.
2. Paste the **entire** `CalendarWidget.js` → Save.
3. Tap **Play** — you should see a circular dial (kawaii: pink + hearts).
4. Home Screen widget → **Edit Widget** → Script: **Sectograph 24h**.

## Switch themes

**Option A — in the script** (top of file):

```js
const THEME = "kawaii"   // or "classic"
```

**Option B — per widget** (no code edit):

1. Long-press the widget → **Edit Widget**
2. Set **Parameter** to `kawaii` or `classic`

## How to read it

| Element | Meaning |
|--------|---------|
| Pie wedges + outer arcs | Timed events |
| Pixel hearts (kawaii) | One heart on each event arc + in the quest list |
| Hand / heart tip | Now |
| Center time | Current `HH:MM` |
| `00` `03` … `21` | Hours (midnight at top, clockwise) |

## Sizes

- **Small** — dial only  
- **Medium / Large** — dial + upcoming events (recommended)
