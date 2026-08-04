# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** for iPhone (Scriptable), with a clear split:

| Kind | Source | Where it appears |
|------|--------|------------------|
| **Events** | Calendar | **Clock only** — colored arcs with the **event name packed into the faded sector** (as large as fits); current event emphasized |
| **Tasks** | Reminders | Side list as **hearts** (kawaii) or **bubbles** (classic) |

Events never appear in the task list. Tasks never appear on the clock.

There is also a **web app** version of the same clock in
[`../sectograph-web`](../sectograph-web): add it to the Home Screen and its
hearts tick in place, without bouncing through Scriptable.

## Themes

| Theme | Task bubbles |
|--------|----------------|
| `kawaii` (default) | Pixel **hearts** — tap to tick off in Reminders |
| `classic` | Normal **circle** checkboxes |

`const THEME = "kawaii"` / `"classic"`, or widget **Parameter**: `kawaii` / `classic`

## Layouts

| Size | Layout |
|------|--------|
| **Small** (square) | Title + **clock only**, filling the widget |
| **Large** (square) | Title + **clock only** — a huge sectograph |
| **Medium** (rectangle) | Square clock filling the height + **1 task column** beside it |
| **Extra large** (iPad) | Rectangle **split in half**: tasks left, clock right, both edge to edge, with type and hearts scaled up and more rows |

Tasks appear on the **rectangular** widgets only, so both square sizes can give
nearly the whole widget to the dial. The title (`✦ MAGICAL SECTOGRAPH ✦` /
`SECTOGRAPH`) sits at the top of the square sizes and above the task column on
medium.

### iPhone and iPad

iPad widgets are much smaller relative to the screen than iPhone ones, so the
dial is sized from a per-device table of real widget dimensions
(`WIDGET_BOXES`, keyed by screen size) rather than a fraction of the screen.
Unlisted iPads fall back to the 11-inch sizes, and every dial also uses
`applyFittingContentMode()` so an imperfect guess scales down instead of
overflowing the widget.

## Timed tasks

Reminders with a **due time** (not just a date):
- Appear as a **light baby-blue pixel heart** on the clock at that start time (duration ignored)
- Sort to the **top** of the task list

## Task colors

| Task state | Color |
|------------|-------|
| Untimed / open quest | **Pink** (cannot be overdue) |
| Timed, due today/upcoming | **Baby blue** |
| Timed + overdue | **Cute purple** |
| Completed | Muted / filled |

Timed tasks also float on the dial rim as bubbles — a **pixel heart** in
kawaii, a plain **dot bubble** in classic.

## Event names on the dial

- Rows stack along the sector's **mid-ray**, upright and **left→right**
- Every row is measured against the wedge itself, so text **never spills
  outside its own sector** or over the center hub
- **Small type** by design so more of the title fits; whole words are
  preferred, hyphenation is a last resort and `…` only when nothing else fits
- Drawn **on top** of wedges, ticks and the hand, with a soft halo instead of
  a background box

## Magical-girl (kawaii) styling

Pixel hearts for the task bubbles and for the timed-task markers on the dial,
a pixel heart on the tip of the clock hand, sparkles across the face, a blush
halo around the dial and a `♡ 24H` tag under the time. `classic` stays smooth
and dark with circle checkboxes.

## Developing

`preview/render.js` renders the dial outside iOS for layout work — see
[`preview/README.md`](preview/README.md).

## Tick off tasks

1. Add to-dos in the iOS **Reminders** app (due today, overdue, or no due date).
2. On the rectangular sizes, **tap** a heart/circle — it completes/reopens that
   Reminder in Reminders itself.
3. Allow **Reminders** + **Calendar** access when Scriptable asks.

A tap opens the script through `scriptable:///run?...&toggle=<reminder id>`,
which flips the Reminder and returns without drawing anything, so Scriptable
only flashes on screen for an instant. A widget cannot toggle in place unless
it ships **App Intents** from a real app target, which Scriptable does not
expose — the round trip through Scriptable is as close as this gets.

## Install

1. Scriptable → paste `CalendarWidget.js` → name **Sectograph 24h** → Save.
2. Home Screen → **+** → Scriptable → Small / Medium / Large.
3. Allow Calendar + Reminders access.
