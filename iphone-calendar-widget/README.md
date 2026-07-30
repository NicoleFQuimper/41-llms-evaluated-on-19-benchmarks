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

Timed tasks also float on the dial rim as bubbles — a **heart** in kawaii, a
plain **dot bubble** in classic.

## Event names on the dial

- Placed **radially** inside their sector, upright and **left→right**
- Drawn **on top** of wedges, ticks and the hand, on a frosted chip
- Truncated at word boundaries; the **current** event is bold and shows its time range
- Collision-aware: labels shift radius/angle to avoid each other and the hub

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
