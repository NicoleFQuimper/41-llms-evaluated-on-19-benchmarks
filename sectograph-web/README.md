# Magical Sectograph — web app

The same 24h sectograph as the Scriptable widget, as a small offline web app
you can add to your Home Screen. Because it runs as its own app, the hearts
tick **in place** — no bouncing through Scriptable.

| | Widget (`../iphone-calendar-widget`) | This web app |
|---|---|---|
| Lives on the Home Screen as | a widget | an app icon |
| Ticking a task | opens Scriptable for an instant | instant, in place |
| Events come from | your real Calendar | manual entries + imported `.ics` |
| Tasks come from | your real Reminders | its own list, stored on the device |

They work well side by side: the widget for the at-a-glance view, the app for
actually planning and ticking.

## What it does

- **24h sectograph** with event names packed into their own wedge, hour ticks,
  night shading, the past dimmed, and a heart-tipped hand — the same drawing
  code as the widget, ported to canvas.
- **Quests** with pixel-heart checkboxes: pink for untimed, baby blue when due
  later today, purple once overdue, and timed ones also appear as hearts on the
  dial rim at their start time.
- **Tap a wedge** to edit that event, tap a heart to tick it, tap a quest to
  rename or retime it.
- **Themes**: `kawaii` (pastel pixel magical-girl) and `classic` (dark).
- **Works offline** and keeps everything in local storage on the device. Nothing
  is uploaded anywhere.

## Events

Two ways to get events onto the clock:

1. **Add them by hand** with the `＋ event` button. Tick *Every day* for
   routines, and give an end time earlier than the start for something that
   runs past midnight.
2. **Import a calendar** (`.ics`) in Settings. Repeating events are expanded
   for the day being shown, covering daily, weekly (including `BYDAY`),
   monthly and yearly rules, plus `EXDATE`, `UNTIL` and `COUNT`.

You can also paste a subscription URL, but browsers only allow that if the
calendar host sends permissive CORS headers — iCloud and Google generally do
not, so exporting the `.ics` and importing the file is the reliable route.

To export from iCloud: calendar sidebar → share icon → **Public Calendar** →
copy the link, open it in a browser, and save the file it downloads.

## Put it on your Home Screen

It has to be served over HTTPS for iOS to install it. The simplest route is
GitHub Pages:

1. Push this folder to the repository (it already is).
2. Repository **Settings → Pages → Build and deployment → Deploy from a
   branch**, pick the branch and `/ (root)`.
3. Open `https://<user>.github.io/<repo>/sectograph-web/` in **Safari** on the
   iPhone or iPad.
4. Share → **Add to Home Screen**.

Any static host works the same way (Netlify drop, Cloudflare Pages, a Raspberry
Pi on the LAN with a certificate). Opening `index.html` straight off the disk
will not work: modules and service workers need a real origin.

## Developing

Serve the folder and open it, for example:

```bash
cd sectograph-web && python3 -m http.server 8000
```

Two helper scripts, both needing `npm i puppeteer` first:

```bash
node tools/test.mjs    # drives the UI in a headless browser and checks storage
node tools/shot.mjs    # writes screenshots to tools/shots/
node tools/make-icons.mjs  # regenerates the app icons (no dependencies)
```

## Files

| File | What it holds |
|------|----------------|
| `dial.js` | the sectograph itself: wedges, pixel hearts, sector text layout |
| `ics.js` | the iCalendar reader and recurrence expansion |
| `app.js` | state, storage, list rendering, dialogs, install prompt |
| `sw.js` | offline caching of the app shell |
| `tools/make-icons.mjs` | dependency-free icon renderer (rasterizer + PNG writer) |
