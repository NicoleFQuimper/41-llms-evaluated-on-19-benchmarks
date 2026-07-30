# Preview harness

`render.js` stubs the Scriptable APIs (DrawContext, Color, Path, Reminder,
CalendarEvent…) so the widget dial can be rendered outside iOS while iterating
on layout.

```bash
cd iphone-calendar-widget/preview
THEME=kawaii FAMILY=large node render.js     # writes dial-kawaii-large.svg
THEME=classic FAMILY=small node render.js
```

`THEME` is `kawaii` or `classic`; `FAMILY` is `small`, `medium`, or `large`.
Sample events and reminders live at the bottom of `render.js`.

Generated `.svg` / `.png` output is gitignored.
