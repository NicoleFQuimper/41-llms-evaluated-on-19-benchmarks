// ============================================================
// SECTOGRAPH 24H — v4
// Themes: classic | kawaii (THEME below, or Widget Parameter)
// Layouts:
//   small  → clock only
//   medium → tasks (1 col, left) + sectograph
//   large  → sectograph (left) + tasks (2 cols, right)
// Tap a bubble to tick a calendar task on/off.
// ============================================================

const THEME = "kawaii" // "kawaii" | "classic"
// Used for tap-to-toggle URLs. Prefer live script name when available.
const SCRIPT_NAME_FALLBACK = "Sectograph 24h"

const family = config.widgetFamily || "medium"
const DAY_MIN = 24 * 60
const STORE_NAME = "sectograph-completed.json"

function resolveTheme() {
  const param = (args.widgetParameter || "").trim().toLowerCase()
  if (param === "classic" || param === "kawaii") return param
  // allow "kawaii,classic" style? no — exact only
  if (param.startsWith("classic")) return "classic"
  if (param.startsWith("kawaii")) return "kawaii"
  return THEME === "classic" ? "classic" : "kawaii"
}

const themes = {
  classic: {
    bg: new Color("#0A0C10"),
    dial: new Color("#141820"),
    track: new Color("#252B36"),
    past: new Color("#1C2430"),
    night: new Color("#0D1118", 0.85),
    hand: new Color("#FF3B30"),
    hub: new Color("#FFFFFF"),
    label: new Color("#9AA3B2"),
    title: new Color("#F4F6F8"),
    muted: new Color("#7E8796"),
    brand: new Color("#FF3B30"),
    done: new Color("#4B5563"),
    bubbleEmpty: new Color("#3A4555"),
    bubbleStroke: new Color("#8B95A5"),
    brandText: "SECTOGRAPH",
    subtitle: "24-hour clock",
    freeText: "No tasks left",
    centerTag: "24H",
    hubFill: new Color("#0A0C10", 0.92),
    palette: [
      new Color("#3B82F6"),
      new Color("#22C55E"),
      new Color("#EAB308"),
      new Color("#A855F7"),
      new Color("#F43F5E"),
      new Color("#06B6D4"),
    ],
    kawaii: false,
  },
  kawaii: {
    bg: new Color("#FFF0F7"),
    dial: new Color("#FFE4F2"),
    track: new Color("#F9C2E0"),
    past: new Color("#F3D0E8", 0.65),
    night: new Color("#E8D9FF", 0.55),
    hand: new Color("#FF4D8D"),
    hub: new Color("#FFF9FC"),
    label: new Color("#C45B8C"),
    title: new Color("#6B2D5B"),
    muted: new Color("#B07A9A"),
    brand: new Color("#FF4D8D"),
    done: new Color("#D4A5BE"),
    bubbleEmpty: new Color("#FFD6EA"),
    bubbleStroke: new Color("#FF8FBF"),
    brandText: "✦ MAGICAL SECTOGRAPH ✦",
    subtitle: "kawaii 24h",
    freeText: "all clear, starlight ♡",
    centerTag: "♡ 24H",
    hubFill: new Color("#FFF7FB", 0.95),
    palette: [
      new Color("#FF6BAF"),
      new Color("#C084FC"),
      new Color("#7DD3FC"),
      new Color("#F9A8D4"),
      new Color("#A78BFA"),
      new Color("#FB7185"),
      new Color("#86EFAC"),
    ],
    kawaii: true,
  },
}

const T = themes[resolveTheme()]

// ——— math / time ———
function rad(deg) {
  return (deg * Math.PI) / 180
}
function sin(deg) {
  return Math.sin(rad(deg))
}
function cos(deg) {
  return Math.cos(rad(deg))
}
function minsOf(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}
function ang(mins) {
  return (mins / DAY_MIN) * 360
}
function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function colorFor(event, i) {
  try {
    if (!T.kawaii && event.calendar && event.calendar.color) return event.calendar.color
  } catch (_) {}
  return T.palette[i % T.palette.length]
}

function withAlpha(color, alpha) {
  try {
    const toHex = (v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0")
    return new Color(
      `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`,
      alpha
    )
  } catch (_) {
    return color
  }
}

// ——— completion store (tick off calendar tasks) ———
function storePath() {
  const fm = FileManager.local()
  return fm.joinPath(fm.documentsDirectory(), STORE_NAME)
}

function readCompleted() {
  const fm = FileManager.local()
  const path = storePath()
  if (!fm.fileExists(path)) return {}
  try {
    return JSON.parse(fm.readString(path)) || {}
  } catch (_) {
    return {}
  }
}

function writeCompleted(data) {
  const fm = FileManager.local()
  fm.writeString(storePath(), JSON.stringify(data))
}

function isDone(completedMap, key, id) {
  return (completedMap[key] || []).indexOf(id) >= 0
}

function toggleDone(id, now) {
  const key = dayKey(now)
  const data = readCompleted()
  const list = data[key] ? data[key].slice() : []
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  data[key] = list
  // drop older days
  Object.keys(data).forEach((k) => {
    if (k !== key) delete data[k]
  })
  writeCompleted(data)
  return idx < 0
}

function eventId(event) {
  return event.identifier || `${event.title}-${event.startDate.getTime()}`
}

function toggleUrl(id) {
  let name = SCRIPT_NAME_FALLBACK
  try {
    if (Script.name()) name = Script.name()
  } catch (_) {}
  return `scriptable:///run?scriptName=${encodeURIComponent(name)}&toggle=${encodeURIComponent(id)}`
}

// ——— calendar ———
async function loadDayEvents(now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const all = await CalendarEvent.between(start, end)
  const timed = all
    .filter((e) => !e.isAllDay)
    .filter((e) => e.endDate > start && e.startDate < end)
    .sort((a, b) => a.startDate - b.startDate)
  const allDay = all.filter((e) => e.isAllDay)
  // task list = all-day first, then timed
  const tasks = allDay.concat(timed)
  return { start, end, timed, allDay, tasks }
}

// ——— drawing helpers ———
function fillWedge(ctx, cx, cy, radius, a0, a1, color) {
  if (a1 <= a0) return
  const path = new Path()
  path.move(new Point(cx, cy))
  const steps = Math.max(8, Math.ceil((a1 - a0) / 2))
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    path.addLine(new Point(cx + radius * sin(a), cy - radius * cos(a)))
  }
  path.closeSubpath()
  ctx.setFillColor(color)
  ctx.addPath(path)
  ctx.fillPath()
}

function strokeArc(ctx, cx, cy, radius, thickness, a0, a1, color) {
  if (a1 <= a0) return
  ctx.setFillColor(color)
  const step = Math.max(0.5, 140 / (Math.PI * radius))
  for (let a = a0; a <= a1; a += step) {
    ctx.fillEllipse(
      new Rect(
        cx + radius * sin(a) - thickness / 2,
        cy - radius * cos(a) - thickness / 2,
        thickness,
        thickness
      )
    )
  }
}

function drawLine(ctx, x1, y1, x2, y2, color, width) {
  const p = new Path()
  p.move(new Point(x1, y1))
  p.addLine(new Point(x2, y2))
  ctx.addPath(p)
  ctx.setStrokeColor(color)
  ctx.setLineWidth(width)
  ctx.strokePath()
}

const HEART_PX = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
]

function drawPixelHeart(ctx, x, y, pixel, fill, outline) {
  const rows = HEART_PX.length
  const cols = HEART_PX[0].length
  if (outline) {
    ctx.setFillColor(outline)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!HEART_PX[r][c]) continue
        ctx.fillRect(
          new Rect(x + (c - 0.15) * pixel, y + (r - 0.15) * pixel, pixel * 1.3, pixel * 1.3)
        )
      }
    }
  }
  ctx.setFillColor(fill)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!HEART_PX[r][c]) continue
      ctx.fillRect(new Rect(x + c * pixel, y + r * pixel, pixel, pixel))
    }
  }
}

function bubbleImage(done, accent) {
  const size = 22
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  if (T.kawaii) {
    const px = 2.4
    const hx = (size - HEART_PX[0].length * px) / 2
    const hy = (size - HEART_PX.length * px) / 2
    if (done) {
      drawPixelHeart(ctx, hx, hy, px, accent, Color.white())
      // little check sparkle
      ctx.setFillColor(Color.white())
      ctx.fillRect(new Rect(hx + px, hy + px, px, px))
    } else {
      // hollow heart = outline only + soft fill
      drawPixelHeart(ctx, hx, hy, px, T.bubbleEmpty, T.bubbleStroke)
    }
  } else {
    // normal circular task bubble
    const pad = 2
    const r = size - pad * 2
    ctx.setFillColor(done ? accent : T.bubbleEmpty)
    ctx.fillEllipse(new Rect(pad, pad, r, r))
    ctx.setStrokeColor(done ? accent : T.bubbleStroke)
    ctx.setLineWidth(2)
    ctx.strokeEllipse(new Rect(pad, pad, r, r))
    if (done) {
      // checkmark
      const p = new Path()
      p.move(new Point(6.5, 11))
      p.addLine(new Point(9.5, 14.5))
      p.addLine(new Point(15.5, 7.5))
      ctx.addPath(p)
      ctx.setStrokeColor(Color.white())
      ctx.setLineWidth(2)
      ctx.strokePath()
    }
  }
  return ctx.getImage()
}

function drawSparkle(ctx, x, y, size, color) {
  drawLine(ctx, x - size, y, x + size, y, color, 1.5)
  drawLine(ctx, x, y - size, x, y + size, color, 1.5)
}

function drawDial(size, timed, dayStart, dayEnd, now, completedMap) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47
  const key = dayKey(now)

  if (T.kawaii) {
    ctx.setFillColor(new Color("#FFB7DE", 0.35))
    ctx.fillEllipse(new Rect(cx - R - 4, cy - R - 4, (R + 4) * 2, (R + 4) * 2))
  }

  ctx.setFillColor(T.dial)
  ctx.fillEllipse(new Rect(cx - R, cy - R, R * 2, R * 2))
  fillWedge(ctx, cx, cy, R * 0.98, 0, 90, T.night)
  fillWedge(ctx, cx, cy, R * 0.98, 270, 360, T.night)
  ctx.setStrokeColor(T.track)
  ctx.setLineWidth(size * 0.02)
  ctx.strokeEllipse(new Rect(cx - R * 0.92, cy - R * 0.92, R * 1.84, R * 1.84))

  const nowA = ang(minsOf(now))
  fillWedge(ctx, cx, cy, R * 0.9, 0, nowA, T.past)

  timed.forEach((event, i) => {
    const s = event.startDate < dayStart ? dayStart : event.startDate
    const e = event.endDate > dayEnd ? dayEnd : event.endDate
    if (e <= s) return
    let a0 = ang(minsOf(s))
    let a1 = e.getTime() >= dayEnd.getTime() ? 360 : ang(minsOf(e))
    if (a1 - a0 < 3) a1 = a0 + 3
    const done = isDone(completedMap, key, eventId(event))
    const c = done ? T.done : colorFor(event, i)
    fillWedge(ctx, cx, cy, R * 0.88, a0, a1, withAlpha(c, T.kawaii ? 0.4 : 0.55))
    strokeArc(ctx, cx, cy, R * 0.93, size * 0.07, a0, a1, c)
    if (T.kawaii) {
      const mid = (a0 + a1) / 2
      const px = Math.max(2, Math.round(size * 0.012))
      drawPixelHeart(
        ctx,
        cx + R * 0.93 * sin(mid) - (HEART_PX[0].length * px) / 2,
        cy - R * 0.93 * cos(mid) - (HEART_PX.length * px) / 2,
        px,
        c,
        Color.white()
      )
    }
  })

  for (let h = 0; h < 24; h++) {
    const a = ang(h * 60)
    const major = h % 3 === 0
    drawLine(
      ctx,
      cx + R * (major ? 0.78 : 0.82) * sin(a),
      cy - R * (major ? 0.78 : 0.82) * cos(a),
      cx + R * 0.96 * sin(a),
      cy - R * 0.96 * cos(a),
      T.label,
      major ? 2 : 1
    )
    if (major) {
      const fs = Math.max(9, Math.round(size * 0.05))
      const lr = R * 0.66
      ctx.setFont(Font.mediumSystemFont(fs))
      ctx.setTextColor(T.label)
      ctx.setTextAlignedCenter()
      ctx.drawTextInRect(
        String(h).padStart(2, "0"),
        new Rect(cx + lr * sin(a) - fs, cy - lr * cos(a) - fs * 0.55, fs * 2, fs * 1.2)
      )
    }
  }

  if (T.kawaii) {
    ;[30, 100, 170, 240, 300].forEach((a, i) => {
      const colors = [new Color("#FF80B5"), new Color("#C4B5FD"), new Color("#7DD3FC")]
      drawSparkle(ctx, cx + R * 0.5 * sin(a), cy - R * 0.5 * cos(a), size * 0.022, colors[i % 3])
    })
  }

  const tipX = cx + R * 0.97 * sin(nowA)
  const tipY = cy - R * 0.97 * cos(nowA)
  drawLine(ctx, cx, cy, tipX, tipY, T.hand, 2.5)
  if (T.kawaii) {
    const px = Math.max(2, Math.round(size * 0.014))
    drawPixelHeart(
      ctx,
      tipX - (HEART_PX[0].length * px) / 2,
      tipY - (HEART_PX.length * px) / 2,
      px,
      T.hand,
      Color.white()
    )
  } else {
    ctx.setFillColor(T.hand)
    ctx.fillEllipse(new Rect(cx - 5, cy - 5, 10, 10))
    ctx.setFillColor(T.hub)
    ctx.fillEllipse(new Rect(cx - 2.5, cy - 2.5, 5, 5))
  }

  const hubR = size * 0.16
  ctx.setFillColor(T.hubFill)
  ctx.fillEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))
  if (T.kawaii) {
    ctx.setStrokeColor(new Color("#FF8FBF", 0.8))
    ctx.setLineWidth(2)
    ctx.strokeEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))
  }

  const tSize = Math.round(size * 0.11)
  ctx.setFont(Font.boldSystemFont(tSize))
  ctx.setTextColor(T.title)
  ctx.setTextAlignedCenter()
  ctx.drawTextInRect(hhmm(now), new Rect(0, cy - tSize * 0.55, size, tSize))
  const tagSize = Math.max(8, Math.round(size * 0.045))
  ctx.setFont(Font.boldSystemFont(tagSize))
  ctx.setTextColor(T.hand)
  ctx.drawTextInRect(T.centerTag, new Rect(0, cy + tSize * 0.35, size, tagSize + 2))

  return ctx.getImage()
}

// ——— task rows ———
function addTaskRow(parent, event, index, completedMap, now) {
  const id = eventId(event)
  const done = isDone(completedMap, dayKey(now), id)
  const accent = colorFor(event, index)

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.url = toggleUrl(id)
  row.size = new Size(0, 0)

  const bubble = row.addImage(bubbleImage(done, accent))
  bubble.imageSize = new Size(18, 18)

  row.addSpacer(5)

  const col = row.addStack()
  col.layoutVertically()
  col.size = new Size(0, 0)

  const title = col.addText(event.title || "Untitled")
  title.font = Font.semiboldSystemFont(11)
  title.textColor = done ? T.done : T.title
  title.lineLimit = 1
  title.minimumScaleFactor = 0.8

  const meta = col.addText(
    event.isAllDay ? "all day" : `${hhmm(event.startDate)}–${hhmm(event.endDate)}`
  )
  meta.font = Font.regularSystemFont(9)
  meta.textColor = done ? T.done : T.muted
  meta.lineLimit = 1

  return row
}

function addTaskColumn(stack, tasks, completedMap, now, startIndex, count) {
  const col = stack.addStack()
  col.layoutVertically()
  col.size = new Size(0, 0)

  const slice = tasks.slice(startIndex, startIndex + count)
  if (slice.length === 0) {
    const empty = col.addText(T.freeText)
    empty.font = Font.mediumSystemFont(11)
    empty.textColor = T.muted
    return col
  }
  slice.forEach((event, i) => {
    addTaskRow(col, event, startIndex + i, completedMap, now)
    if (i < slice.length - 1) col.addSpacer(6)
  })
  return col
}

function sortTasksForList(tasks, completedMap, now) {
  const key = dayKey(now)
  // open tasks first, completed at bottom; keep time order within groups
  return tasks.slice().sort((a, b) => {
    const da = isDone(completedMap, key, eventId(a)) ? 1 : 0
    const db = isDone(completedMap, key, eventId(b)) ? 1 : 0
    if (da !== db) return da - db
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
    return a.startDate - b.startDate
  })
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = T.bg
  widget.setPadding(10, 10, 10, 10)
  // background tap opens calendar; task rows override with toggle URLs
  widget.url = "calshow://"

  const now = new Date()
  const completedMap = readCompleted()
  const { start, end, timed, tasks } = await loadDayEvents(now)
  const list = sortTasksForList(tasks, completedMap, now)

  // —— SMALL: clock only ——
  if (family === "small") {
    widget.setPadding(6, 6, 6, 6)
    const dialSize = 155
    const img = widget.addImage(drawDial(dialSize, timed, start, end, now, completedMap))
    img.imageSize = new Size(dialSize, dialSize)
    img.centerAlignImage()
    return widget
  }

  // header
  const head = widget.addStack()
  head.layoutHorizontally()
  head.centerAlignContent()
  const brand = head.addText(T.brandText)
  brand.font = Font.boldSystemFont(T.kawaii ? 10 : 11)
  brand.textColor = T.brand
  head.addSpacer()
  const open = list.filter((t) => !isDone(completedMap, dayKey(now), eventId(t))).length
  const count = head.addText(T.kawaii ? `♡ ${open} left` : `${open} left`)
  count.font = Font.mediumSystemFont(10)
  count.textColor = T.muted
  widget.addSpacer(6)

  // —— LARGE: dial left, tasks 2 columns right ——
  if (family === "large") {
    const dialSize = 220
    const body = widget.addStack()
    body.layoutHorizontally()
    body.topAlignContent()

    const img = body.addImage(drawDial(dialSize, timed, start, end, now, completedMap))
    img.imageSize = new Size(dialSize, dialSize)

    body.addSpacer(10)

    const right = body.addStack()
    right.layoutVertically()
    right.size = new Size(0, 0)

    const label = right.addText(T.kawaii ? "today's quests" : "today's tasks")
    label.font = Font.boldSystemFont(12)
    label.textColor = T.title
    right.addSpacer(8)

    if (list.length === 0) {
      const empty = right.addText(T.freeText)
      empty.font = Font.mediumSystemFont(12)
      empty.textColor = T.muted
    } else {
      const cols = right.addStack()
      cols.layoutHorizontally()
      cols.topAlignContent()
      const perCol = Math.ceil(Math.min(list.length, 12) / 2)
      addTaskColumn(cols, list, completedMap, now, 0, perCol)
      cols.addSpacer(8)
      addTaskColumn(cols, list, completedMap, now, perCol, perCol)
    }
    return widget
  }

  // —— MEDIUM: one task column on the LEFT + sectograph ——
  const dialSize = 145
  const body = widget.addStack()
  body.layoutHorizontally()
  body.centerAlignContent()

  const left = body.addStack()
  left.layoutVertically()
  left.size = new Size(0, 0)
  const label = left.addText(T.kawaii ? "quests" : "tasks")
  label.font = Font.boldSystemFont(11)
  label.textColor = T.title
  left.addSpacer(6)
  addTaskColumn(left, list, completedMap, now, 0, 4)

  body.addSpacer(8)

  const img = body.addImage(drawDial(dialSize, timed, start, end, now, completedMap))
  img.imageSize = new Size(dialSize, dialSize)

  return widget
}

// ——— handle tap-to-toggle, then show / set widget ———
const toggleId = args.queryParameters.toggle
if (toggleId) {
  toggleDone(decodeURIComponent(toggleId), new Date())
}

const widget = await createWidget()
widget.refreshAfterDate = new Date(Date.now() + 1000 * 30)

if (config.runsInWidget) {
  Script.setWidget(widget)
} else if (toggleId) {
  // Came from a bubble tap — push an updated widget snapshot, then preview
  Script.setWidget(widget)
  if (family === "large") await widget.presentLarge()
  else if (family === "small") await widget.presentSmall()
  else await widget.presentMedium()
} else if (family === "small") {
  await widget.presentSmall()
} else if (family === "large") {
  await widget.presentLarge()
} else {
  await widget.presentMedium()
}
Script.complete()
