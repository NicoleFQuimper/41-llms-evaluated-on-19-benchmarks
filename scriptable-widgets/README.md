# Stellara — Magical Girl Year Console

Scriptable iPhone / iPad widgets: year progress % + week grid.

## Light mode (default) 💕

**[`MagicalYearConsole.js`](./MagicalYearConsole.js)** — candy pastels, neon glow, hearts

Optional dark: [`MagicalYearConsoleDark.js`](./MagicalYearConsoleDark.js)

## Updating an existing widget

iOS caches Scriptable widgets. After pasting new code:

1. In Scriptable, **Select All → Delete → Paste** the full new file (or create a fresh script).
2. Run the script once in-app and preview **Medium**.
3. On the Home Screen: long-press widget → **Remove Widget** → add it again, pointed at the script.

If you only edit the file without re-adding, you may still see the old flat / overlapping version.

## Sizes

| Family | Device | Layout |
|--------|--------|--------|
| small | iPhone / iPad | Compact stack |
| medium | iPhone / iPad | Split — caption sits **below** the bar (never clipped) |
| large | iPhone large / **iPad big square** | Full stack |
| extraLarge | **iPad XL** double-wide | Wide split |

## Install

1. Install **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)**.
2. Paste `MagicalYearConsole.js` into a new script.
3. Add a Scriptable widget → set **Script** to Stellara.
