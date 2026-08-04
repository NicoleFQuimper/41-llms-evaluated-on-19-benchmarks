// Drives the app in a headless browser: adds a quest, ticks it, edits it,
// adds an event and imports a calendar, checking what ends up in storage.
// Needs puppeteer: `npm i puppeteer`, then `node tools/test.mjs`.

import http from "node:http"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
}

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0])
  const file = path.join(ROOT, rel === "/" ? "index.html" : rel)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404)
    res.end("not found")
    return
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "text/plain" })
  res.end(fs.readFileSync(file))
})

const port = await new Promise((r) => server.listen(0, () => r(server.address().port)))
const browser = await puppeteer.launch({ args: ["--no-sandbox"] })
const page = await browser.newPage()
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const failures = []
const errors = []
page.on("pageerror", (e) => errors.push(String(e)))
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text())
})

const check = (name, ok, detail) => {
  if (ok) console.log(`  ok   ${name}`)
  else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

const store = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("magical-sectograph/v1") || "{}"))

await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle0" })

// —— quests ——
await page.type("#quickTitle", "Brew starlight tea")
await page.$eval("#quickTime", (n) => {
  n.value = "07:30"
})
await page.click(".add-btn")
let data = await store()
check("quest is stored with its time", data.tasks?.length === 1 && data.tasks[0].hasTime === true)
check("quest shows in the list", (await page.$$(".task")).length === 1)

await page.click(".task .tick")
data = await store()
check("tapping the heart completes it", data.tasks[0].done === true)
check(
  "completion is timestamped",
  !!data.tasks[0].completedAt && !Number.isNaN(Date.parse(data.tasks[0].completedAt))
)

await page.click(".task .tick")
data = await store()
check("tapping again reopens it", data.tasks[0].done === false)

await page.click(".task .task-body")
await page.$eval("#taskTitle", (n) => {
  n.value = "Brew moonlight tea"
})
await page.click("#taskForm button.primary")
data = await store()
check("editing renames the quest", data.tasks[0].title === "Brew moonlight tea")

// —— events ——
await page.click("#addEventBtn")
await page.$eval("#eventTitle", (n) => {
  n.value = "Cauldron practice"
})
await page.$eval("#eventStart", (n) => {
  n.value = "14:00"
})
await page.$eval("#eventEnd", (n) => {
  n.value = "15:30"
})
await page.click("#eventSave")
data = await store()
check("event is stored", data.events?.length === 1 && data.events[0].title === "Cauldron practice")
check(
  "event keeps a 90 minute span",
  Math.round((Date.parse(data.events[0].end) - Date.parse(data.events[0].start)) / 60000) === 90
)

// A tap on the wedge should open that event for editing
const box = await page.$eval("#dial", (c) => {
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width }
})
const midAngle = ((14 + 45 / 60) / 24) * 2 * Math.PI
const reach = box.w * 0.3
await page.mouse.click(
  box.x + box.w / 2 + reach * Math.sin(midAngle),
  box.y + box.w / 2 - reach * Math.cos(midAngle)
)
check(
  "tapping the wedge opens that event",
  await page.$eval("#eventTitle", (n) => n.value === "Cauldron practice")
)
await page.click("#eventCancel")

// —— calendar import ——
const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:daily-1
SUMMARY:Morning stretch
DTSTART:20200106T080000
DTEND:20200106T083000
RRULE:FREQ=DAILY;INTERVAL=1
END:VEVENT
BEGIN:VEVENT
UID:once-1
SUMMARY:Dentist
DTSTART:20200107T110000
DTEND:20200107T120000
END:VEVENT
END:VCALENDAR
`
const icsPath = path.join(os.tmpdir(), "sectograph-test.ics")
fs.writeFileSync(icsPath, ics)
await page.click("#settingsBtn")
const input = await page.$("#icsFile")
await input.uploadFile(icsPath)
await new Promise((r) => setTimeout(r, 300))
data = await store()
check("calendar is imported", data.calendars?.length === 1)

const drawn = await page.evaluate(async () => {
  const { parseICS, eventsForDay } = await import("./ics.js")
  const raw = JSON.parse(localStorage.getItem("magical-sectograph/v1"))
  const parsed = parseICS(raw.calendars[0].text)
  return eventsForDay(parsed, new Date()).map((e) => e.title)
})
check("daily recurrence lands on today", drawn.includes("Morning stretch"), drawn.join(", "))
check("the one-off from 2020 does not", !drawn.includes("Dentist"))

// —— persistence across a reload ——
await page.reload({ waitUntil: "networkidle0" })
check("quest survives a reload", (await page.$$(".task")).length === 1)
check(
  "service worker registers",
  await page.evaluate(() => !!navigator.serviceWorker.controller || navigator.serviceWorker.getRegistrations().then((r) => r.length > 0))
)

if (errors.length) {
  console.log("\nConsole errors:")
  errors.forEach((e) => console.log(`  ${e}`))
}

await browser.close()
server.close()

if (failures.length || errors.length) {
  console.log(`\n${failures.length} failing check(s), ${errors.length} console error(s)`)
  process.exit(1)
}
console.log("\nall checks passed")
