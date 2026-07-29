# iPhone Calendar Widget

A Home Screen calendar widget for iPhone, built with [Scriptable](https://scriptable.app/). It shows today’s upcoming events (title, time, location) and opens the Calendar app when tapped.

## Install on your iPhone

1. Install **Scriptable** from the App Store (free).
2. Open Scriptable → tap **+** → paste the contents of `CalendarWidget.js`.
3. Name the script **Calendar Widget** and save.
4. Long-press your Home Screen → tap **+** → search **Scriptable**.
5. Pick a size (Small / Medium / Large) → **Add Widget**.
6. Long-press the widget → **Edit Widget** → set **Script** to **Calendar Widget**.
7. Allow **Calendar** access when iOS asks.

## Sizes

| Size   | Events shown |
|--------|--------------|
| Small  | Up to 3      |
| Medium | Up to 5      |
| Large  | Up to 8      |

## Notes

- Past events for today are hidden; all-day events stay at the top.
- Tapping the widget opens the system Calendar app.
- Refresh happens when iOS updates the widget (Scriptable does not run continuously).
- To preview without adding a widget: open the script in Scriptable and tap the play button.
