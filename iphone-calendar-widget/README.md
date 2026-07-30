# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** for iPhone (Scriptable), with a clear split:

| Kind | Source | Where it appears |
|------|--------|------------------|
| **Events** | Calendar | **Clock only** — colored arcs with the **event name packed into the faded sector** (as large as fits); current event emphasized |
| **Tasks** | Reminders | Side list as **hearts** (kawaii) or **bubbles** (classic) |

Events never appear in the task list. Tasks never appear on the clock.

## Themes

| Theme | Task bubbles |
|--------|----------------|
| `kawaii` (default) | Pixel **hearts** — tap to tick off in Reminders |
| `classic` | Normal **circle** checkboxes |

`const THEME = "kawaii"` / `"classic"`, or widget **Parameter**: `kawaii` / `classic`

## Layouts

| Size | Layout |
|------|--------|
| **Small** | Clock only (events + baby-blue hearts for timed tasks) — no task list |
| **Medium** | **1 task column on the left** + clock |
| **Large** | Clock left + **1 task column** on the right |

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
2. On Medium/Large, **tap** a heart/circle — it completes/reopens that Reminder.
3. Allow **Reminders** + **Calendar** access when Scriptable asks.

## Install

1. Scriptable → paste `CalendarWidget.js` → name **Sectograph 24h** → Save.
2. Home Screen → **+** → Scriptable → Small / Medium / Large.
3. Allow Calendar + Reminders access.
