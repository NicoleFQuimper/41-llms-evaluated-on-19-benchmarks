// Screenshots the app in a headless browser, so layout work can be checked
// without a phone. Needs puppeteer: `npm i puppeteer` (or set NODE_PATH to an
// install elsewhere), then `node tools/shot.mjs`.

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "tools", "shots")

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
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

const at = (h, m) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const sample = (theme) => ({
  theme,
  tasks: [
    { id: "t1", title: "Potion delivery", done: false, due: at(9, 30), hasTime: true },
    { id: "t2", title: "Revisar instrucciones", done: false, due: at(7, 0), hasTime: true },
    { id: "t3", title: "Water the moon flowers", done: false, due: null, hasTime: false },
    { id: "t4", title: "Stretch", done: false, due: null, hasTime: false },
    {
      id: "t5",
      title: "Morning spell",
      done: true,
      due: null,
      hasTime: false,
      completedAt: new Date().toISOString(),
    },
  ],
  events: [
    { id: "e1", title: "Meeting", start: at(18, 30), end: at(20, 0), repeat: "none" },
    { id: "e2", title: "Breakfast with Mom", start: at(9, 0), end: at(10, 0), repeat: "none" },
    { id: "e3", title: "Collect the mail", start: at(12, 30), end: at(14, 0), repeat: "none" },
    { id: "e4", title: "Chequeo oncológico", start: at(15, 30), end: at(17, 0), repeat: "none" },
  ],
  calendars: [],
})

const shots = [
  { name: "phone-kawaii", theme: "kawaii", width: 393, height: 852 },
  { name: "phone-classic", theme: "classic", width: 393, height: 852 },
  { name: "tablet-kawaii", theme: "kawaii", width: 900, height: 700 },
]

const port = await new Promise((resolve) => {
  server.listen(0, () => resolve(server.address().port))
})

fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ args: ["--no-sandbox"] })

for (const shot of shots) {
  const page = await browser.newPage()
  await page.setViewport({
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 2,
    isMobile: shot.width < 700,
    hasTouch: shot.width < 700,
  })
  const seed = JSON.stringify(sample(shot.theme))
  await page.evaluateOnNewDocument(
    (data) => window.localStorage.setItem("magical-sectograph/v1", data),
    seed
  )
  const errors = []
  page.on("pageerror", (err) => errors.push(String(err)))
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle0" })
  await new Promise((r) => setTimeout(r, 350))
  await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) })
  if (errors.length) console.error(`${shot.name} errors:\n  ${errors.join("\n  ")}`)
  else console.log(`${shot.name} ok`)
  await page.close()
}

await browser.close()
server.close()
