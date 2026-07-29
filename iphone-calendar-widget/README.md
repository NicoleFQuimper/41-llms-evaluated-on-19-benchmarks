# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** for iPhone (Scriptable), with a clear split:

| Kind | Source | Where it appears |
|------|--------|------------------|
| **Events** | Calendar | **Clock only** (colored arcs) |
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
| **Small** | Clock only (events) — no tasks |
| **Medium** | **1 task column on the left** + clock |
| **Large** | Clock left + tasks right in **2 columns** |

## Tick off tasks

1. Add to-dos in the iOS **Reminders** app (due today, overdue, or no due date).
2. On Medium/Large, **tap** a heart/circle — it completes/reopens that Reminder.
3. Allow **Reminders** + **Calendar** access when Scriptable asks.

## Install

1. Scriptable → paste `CalendarWidget.js` → name **Sectograph 24h** → Save.
2. Home Screen → **+** → Scriptable → Small / Medium / Large.
3. Allow Calendar + Reminders access.
