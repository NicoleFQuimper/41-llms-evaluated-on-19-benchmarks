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
- Sort to the **top** of the task list in the same baby blue
- Date-only / no-time tasks sit below them

## Tick off tasks

1. Add to-dos in the iOS **Reminders** app (due today, overdue, or no due date).
2. On Medium/Large, **tap** a heart/circle — it completes/reopens that Reminder.
3. Allow **Reminders** + **Calendar** access when Scriptable asks.

## Install

1. Scriptable → paste `CalendarWidget.js` → name **Sectograph 24h** → Save.
2. Home Screen → **+** → Scriptable → Small / Medium / Large.
3. Allow Calendar + Reminders access.
