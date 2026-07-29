# Sectograph 24h Calendar Widget

Circular **24-hour sectograph** for iPhone Home Screen (Scriptable).

If you still see a normal event *list* (titles + times with colored bars), you are still running the old script. Follow the replace steps below.

## Replace the old widget (important)

1. Open **Scriptable**.
2. Delete the old “Calendar Widget” script (or clear it).
3. Tap **+** → paste the **entire** contents of `CalendarWidget.js`.
4. Name it exactly: **Sectograph 24h** → Save.
5. Tap the **play** button. You should see a **circle clock** with a red “SECTOGRAPH” label — not a list.
6. On the Home Screen: long-press your Scriptable widget → **Edit Widget** → set **Script** to **Sectograph 24h**.

Or add a fresh widget: Home Screen → **+** → **Scriptable** → Medium → choose **Sectograph 24h**.

## How to read it

| Element | Meaning |
|--------|---------|
| Pie wedges + outer arcs | Timed calendar events |
| Red hand | Now |
| Center time | Current clock (`HH:MM`) |
| Labels `00` `03` … `21` | Hours (midnight at top, clockwise) |
| Dim wedges | Night (approx. 00–06 and 18–24) |

## Sizes

- **Small** — dial only  
- **Medium / Large** — dial + upcoming events (recommended)
