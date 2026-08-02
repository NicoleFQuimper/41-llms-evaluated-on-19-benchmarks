# Stellara Scriptable Widgets

Cute coquette Scriptable widgets for iPhone / iPad.

## 1) Year Console (light)

**[`MagicalYearConsole.js`](./MagicalYearConsole.js)** — year % + week candies  
Optional dark: [`MagicalYearConsoleDark.js`](./MagicalYearConsoleDark.js)

## 2) Reminder Pet (new) ♥

**[`StellaraPetReminders.js`](./StellaraPetReminders.js)** — a cute pet that tracks reminder **success rate**  
(`completed / set`) for today, this week, this month, and this year.

### View modes (Widget Parameter)

Edit the Home Screen widget → **Parameter** → type one of:

| Parameter | What you see |
|-----------|----------------|
| `day` | **DAY focus** (full detail) + soft week / month / year *(default)* |
| `week` | **WEEK focus** + today mentioned |
| `month` | **MONTH focus** |
| `year` | **YEAR focus** |
| `panel` | today vs week vs month |
| `all` | day featured control panel + soft week/month/year |

### What “success rate” means

- **Set** = reminders due in that period  
- **Done** = those marked completed  
- **%** = done ÷ set (completion / success rate)

The pet’s mood changes with today’s (or the focused period’s) rate.

### Install

1. Paste `StellaraPetReminders.js` into a new Scriptable script.
2. Run it once and allow **Reminders** access.
3. Add a Scriptable widget → set Script → set **Parameter** (e.g. `day`).
4. Preview views from the in-app menu.

## Updating widgets

1. Select All → Paste the **entire** new file in Scriptable (partial edits keep old bugs).  
2. Confirm the top `VERSION:` line matches the repo (current pet: `2026-08-02-snap-bands`).  
3. Remove & re-add the Home Screen widget so iOS reloads it.

Layouts use exclusive snap bands so header / pet / hero / cards / footer never overlap across small · medium · large · extraLarge.
