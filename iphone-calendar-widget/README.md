# iPhone Sectograph Calendar Widget

A Home Screen **24-hour sectograph** calendar widget for iPhone, built with [Scriptable](https://scriptable.app/).

Today’s timed events appear as colored arcs on a circular 24h dial. A red hand marks the current time. Midnight is at the top; time runs clockwise.

## Install on your iPhone

1. Install **Scriptable** from the App Store (free).
2. Open Scriptable → tap **+** → paste the contents of `CalendarWidget.js`.
3. Name the script **Calendar Widget** and save.
4. Long-press your Home Screen → tap **+** → search **Scriptable**.
5. Pick a size — **Medium** or **Large** recommended → **Add Widget**.
6. Long-press the widget → **Edit Widget** → set **Script** to **Calendar Widget**.
7. Allow **Calendar** access when iOS asks.

## Layout by size

| Size   | What’s shown                                      |
|--------|---------------------------------------------------|
| Small  | 24h dial only                                     |
| Medium | Dial + next few events                            |
| Large  | Dial + date header + longer event list            |

## How to read it

- **Colored arcs** = calendar events (uses each calendar’s color when available)
- **Red hand** = now
- **Hour marks** every hour; labels every 3 hours (`00`, `03`, … `21`)
- **Dimmer night band** on the ring for roughly 00:00–06:00 and 18:00–24:00
- **Past portion** of the day is shaded on the track
- Tap the widget to open the Calendar app

## Notes

- All-day events are omitted from the ring (they have no clock span).
- iOS controls how often the widget refreshes.
- Preview in Scriptable with the play button before adding it to the Home Screen.
