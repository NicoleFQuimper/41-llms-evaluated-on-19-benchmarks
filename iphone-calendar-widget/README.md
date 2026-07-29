# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** + tickable calendar **to-do list** for iPhone (Scriptable).

## Themes

| Theme | Task bubbles |
|--------|----------------|
| `kawaii` (default) | Pixel **hearts** you can tap to tick off |
| `classic` | Normal **circle** checkboxes |

Set in the script: `const THEME = "kawaii"` or `"classic"`  
Or **Edit Widget → Parameter**: `kawaii` / `classic`

## Layouts

| Size | Layout |
|------|--------|
| **Small** | Clock / sectograph only (no task list) |
| **Medium** | **1 column of tasks on the left** + sectograph |
| **Large** | Sectograph on the **left** + tasks on the **right in 2 columns** |

## Tick off tasks

1. Name the Scriptable script exactly **`Sectograph 24h`** (or change `SCRIPT_NAME` in the file to match).
2. On Medium/Large, **tap a heart/circle bubble** next to a task.
3. Scriptable opens briefly, toggles done, and the item moves to the bottom (muted). Tap again to undo.
4. Completed tasks also dim on the dial.

Done state is stored on-device for today only.

## Install

1. Scriptable → new script → paste all of `CalendarWidget.js` → name **Sectograph 24h** → Save.
2. Home Screen → **+** → Scriptable → pick Small / Medium / Large → select that script.
3. Allow Calendar access when asked.
