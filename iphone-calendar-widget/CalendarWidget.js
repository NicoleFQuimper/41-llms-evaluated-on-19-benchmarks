// ============================================================
// SECTOGRAPH 24H — v5
// EVENTS (Calendar) → shown ONLY on the 24h clock
// TASKS  (Reminders) → heart / bubble list you can tick off
//
// Themes: classic | kawaii  (THEME below, or Widget Parameter)
// Layouts:
//   small  → clock only
//   medium → tasks (1 col, left) + clock
//   large  → clock (left) + tasks (2 cols, right)
// ============================================================

const THEME = "kawaii" // "kawaii" | "classic"
const SCRIPT_NAME_FALLBACK = "Sectograph 24h"

const family = config.widgetFamily || "medium"
const DAY_MIN = 24 * 60

function resolveTheme() {
  const param = (args.widgetParameter || "").trim().toLowerCase()
  if (param === "classic" || param.startsWith("classic")) return "classic"
  if (param === "kawaii" || param.startsWith("kawaii")) return "kawaii"
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
const BABY_BLUE = new Color("#A8D8FF") // timed tasks due today
const CUTE_PURPLE = new Color("#C084FC") // timed tasks that are overdue
const KAWAII_PINK = new Color("#FF8FBF") // untimed tasks (never overdue)
const OVERDUE_TEXT = new Color("#7C3AED")
const TODAY_TEXT = new Color("#4A7AA8")
const PINK_TEXT = new Color("#C45B8C")

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
function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function colorFor(item, i) {
  try {
    if (!T.kawaii && item.calendar && item.calendar.color) return item.calendar.color
  } catch (_) {}
  return T.palette[i % T.palette.length]
}

/**
 * Home Screen widget dimensions in points, per screen size. Needed so the
 * dial can fill the widget exactly instead of guessing and getting clipped.
 * Keys are "screenWidth x screenHeight" in portrait points.
 * iPad widgets are much smaller relative to the screen than iPhone ones, so
 * they need their own entries rather than a scaled guess.
 */
const WIDGET_BOXES = {
  // iPhone
  "320x568": { small: 141, medium: [291, 141], large: [291, 299] },
  "375x667": { small: 148, medium: [322, 148], large: [322, 324] },
  "375x812": { small: 155, medium: [329, 155], large: [329, 345] },
  "390x844": { small: 158, medium: [338, 158], large: [338, 354] },
  "393x852": { small: 158, medium: [338, 158], large: [338, 354] },
  "402x874": { small: 162, medium: [344, 162], large: [344, 366] },
  "414x736": { small: 157, medium: [348, 157], large: [348, 357] },
  "414x896": { small: 169, medium: [360, 169], large: [360, 379] },
  "428x926": { small: 170, medium: [364, 170], large: [364, 382] },
  "430x932": { small: 170, medium: [364, 170], large: [364, 382] },
  "440x956": { small: 170, medium: [364, 170], large: [364, 382] },
  // iPad — large is square here, not tall, and extra large is a wide double large
  "744x1133": { small: 141, medium: [305, 141], large: [305, 305], extraLarge: [634, 305] },
  "768x1024": { small: 141, medium: [305, 141], large: [305, 305], extraLarge: [634, 305] },
  "810x1080": { small: 146, medium: [320, 146], large: [320, 320], extraLarge: [669, 320] },
  "820x1180": { small: 155, medium: [342, 155], large: [342, 342], extraLarge: [715, 342] },
  "834x1112": { small: 150, medium: [327, 150], large: [327, 327], extraLarge: [682, 327] },
  "834x1194": { small: 155, medium: [342, 155], large: [342, 342], extraLarge: [715, 342] },
  "954x1373": { small: 162, medium: [350, 162], large: [350, 350], extraLarge: [726, 350] },
  "970x1389": { small: 162, medium: [350, 162], large: [350, 350], extraLarge: [726, 350] },
  "1024x1366": { small: 170, medium: [378, 170], large: [378, 378], extraLarge: [795, 378] },
  "1192x1590": { small: 188, medium: [412, 188], large: [412, 412], extraLarge: [860, 412] },
}

function widgetBox(fam) {
  let sw = 393
  let sh = 852
  let isPad = false
  try {
    const screen = Device.screenSize()
    sw = Math.round(Math.min(screen.width, screen.height))
    sh = Math.round(Math.max(screen.width, screen.height))
  } catch (_) {}
  try {
    isPad = Device.isPad()
  } catch (_) {
    isPad = sw >= 700
  }

  const entry =
    WIDGET_BOXES[`${sw}x${sh}`] ||
    (isPad
      ? // Unlisted iPad: widget sizes barely move across models, so the
        // 11-inch numbers are a safe default rather than scaling by screen.
        { small: 155, medium: [342, 155], large: [342, 342], extraLarge: [715, 342] }
      : {
          small: sw * 0.4,
          medium: [sw * 0.865, sw * 0.4],
          large: [sw * 0.865, sw * 0.9],
        })

  const value = entry[fam] || entry.medium
  const [w, h] = Array.isArray(value) ? value : [value, value]
  // A hair of slack so nothing can be clipped by rounding
  return { w: Math.floor(w) - 2, h: Math.floor(h) - 2 }
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

function toggleUrl(id) {
  let name = SCRIPT_NAME_FALLBACK
  try {
    if (Script.name()) name = Script.name()
  } catch (_) {}
  return `scriptable:///run?scriptName=${encodeURIComponent(name)}&toggle=${encodeURIComponent(id)}`
}

// ——— EVENTS = Calendar (clock only) ———
async function loadEvents(now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const all = await CalendarEvent.between(start, end)
  const timed = all
    .filter((e) => !e.isAllDay)
    .filter((e) => e.endDate > start && e.startDate < end)
    .sort((a, b) => a.startDate - b.startDate)
  return { start, end, timed }
}

// ——— TASKS = Reminders (list only, tickable) ———
function reminderDueDate(reminder) {
  if (reminder.dueDate) return reminder.dueDate
  try {
    if (reminder.dueDateComponents && reminder.dueDateComponents.date) {
      return reminder.dueDateComponents.date
    }
  } catch (_) {}
  return null
}

/** True when the Reminder has a real clock time (not date-only). */
function hasDueTime(reminder) {
  try {
    if (typeof reminder.dueDateIncludesTime === "boolean") {
      return !!reminder.dueDate && reminder.dueDateIncludesTime
    }
  } catch (_) {}
  const due = reminderDueDate(reminder)
  if (!due) return false
  return due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0
}

/** Overdue only applies to timed reminders (date-only / open quests cannot be overdue). */
function isOverdueTask(reminder, now) {
  if (reminder.isCompleted) return false
  if (!hasDueTime(reminder)) return false
  const due = reminderDueDate(reminder)
  if (!due) return false
  return due.getTime() < (now || new Date()).getTime()
}

function taskAccent(reminder, index) {
  if (reminder.isCompleted) return T.done
  if (!hasDueTime(reminder)) return KAWAII_PINK
  if (isOverdueTask(reminder)) return CUTE_PURPLE
  return BABY_BLUE
}

async function loadTasks(now) {
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  let incomplete = []
  let completed = []
  try {
    incomplete = await Reminder.allIncomplete()
  } catch (_) {
    incomplete = []
  }
  try {
    completed = await Reminder.allCompleted()
  } catch (_) {
    completed = []
  }

  const open = incomplete.filter((r) => {
    const due = reminderDueDate(r)
    if (!due) return true // undated todo
    return due < dayEnd // overdue or due today
  })

  const doneToday = completed.filter((r) => {
    if (r.completionDate && sameDay(r.completionDate, now)) return true
    const due = reminderDueDate(r)
    return due && sameDay(due, now) && r.isCompleted
  })

  const tasks = open.concat(doneToday)
  // Timed first (overdue → upcoming), then untimed pink quests; completed last
  tasks.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
    const ta = hasDueTime(a)
    const tb = hasDueTime(b)
    if (ta !== tb) return ta ? -1 : 1
    if (ta && tb) {
      const oa = isOverdueTask(a)
      const ob = isOverdueTask(b)
      if (oa !== ob) return oa ? -1 : 1
      return reminderDueDate(a) - reminderDueDate(b)
    }
    return (a.title || "").localeCompare(b.title || "")
  })
  return tasks
}

async function toggleReminder(id) {
  const decoded = decodeURIComponent(id)
  let pool = []
  try {
    pool = pool.concat(await Reminder.allIncomplete())
  } catch (_) {}
  try {
    pool = pool.concat(await Reminder.allCompleted())
  } catch (_) {}
  const match = pool.find((r) => r.identifier === decoded)
  if (!match) return
  match.isCompleted = !match.isCompleted
  match.save()
}

// ——— drawing ———
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

/** Task bubble: heart (kawaii) or circle checkbox (classic). */
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
      ctx.setFillColor(Color.white())
      ctx.fillRect(new Rect(hx + px, hy + px, px, px))
    } else {
      // Hollow heart tinted baby blue (today) or purple (overdue)
      drawPixelHeart(ctx, hx, hy, px, withAlpha(accent, 0.28), accent)
    }
  } else {
    const pad = 2
    const r = size - pad * 2
    ctx.setFillColor(done ? accent : withAlpha(accent, 0.2))
    ctx.fillEllipse(new Rect(pad, pad, r, r))
    ctx.setStrokeColor(accent)
    ctx.setLineWidth(2)
    ctx.strokeEllipse(new Rect(pad, pad, r, r))
    if (done) {
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

const CHAR_W = 0.55 // rough advance width per character, relative to font size

/** Dial angle (degrees, 0 = 12 o'clock, clockwise) of a point. */
function angleOfPoint(px, py, cx, cy) {
  let a = (Math.atan2(px - cx, cy - py) * 180) / Math.PI
  return a < 0 ? a + 360 : a
}

/** Is a point inside the wedge, clear of the hub and inside the dial? */
function pointInSector(px, py, geo) {
  const dx = px - geo.cx
  const dy = py - geo.cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > geo.outerR || dist < geo.hubR) return false
  const a = angleOfPoint(px, py, geo.cx, geo.cy)
  const a0 = geo.a0
  const a1 = geo.a1
  return a1 <= 360 ? a >= a0 && a <= a1 : a >= a0 || a <= a1 - 360
}

/**
 * Widest horizontal row that stays completely inside the wedge at this
 * height. Each side is scanned separately, so rows in a diagonal wedge use
 * all of the space available instead of staying centred on the mid-ray.
 */
function rowSpanInSector(anchorX, rowTop, rowH, geo) {
  const okAt = (x) =>
    pointInSector(x, rowTop, geo) && pointInSector(x, rowTop + rowH, geo)
  if (!okAt(anchorX)) return null
  const reach = (dir) => {
    let lo = 0
    let hi = geo.outerR * 2
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2
      if (okAt(anchorX + dir * mid)) lo = mid
      else hi = mid
    }
    return lo
  }
  const left = reach(-1)
  const right = reach(1)
  return { x: anchorX - left, w: left + right }
}

function wrapIntoRows(words, rows, fontSize) {
  const charW = fontSize * CHAR_W
  const queue = words.slice()
  const lines = []
  const widestChars = Math.floor(
    Math.max(0, ...rows.map((row) => row.w)) / charW
  )
  let hyphens = 0
  for (const row of rows) {
    if (!queue.length) break
    const maxChars = Math.floor(row.w / charW)
    if (maxChars < 2) {
      lines.push(null)
      continue
    }
    let line = ""
    while (queue.length) {
      const next = line ? `${line} ${queue[0]}` : queue[0]
      if (next.length <= maxChars) {
        line = next
        queue.shift()
        continue
      }
      // Only hyphenate a word that will not fit on any row of this block;
      // otherwise leave the row empty and let a wider row take it.
      if (!line && queue[0].length > widestChars) {
        line = `${queue[0].slice(0, maxChars - 1)}-`
        queue[0] = queue[0].slice(maxChars - 1)
        hyphens++
      }
      break
    }
    lines.push(line || null)
  }
  return { lines, remaining: queue, hyphens }
}

/**
 * Flow a title inside a wedge: rows stack top→bottom around the sector's
 * mid-ray and every row is clipped to the width the wedge actually offers,
 * so text never spills outside its own sector.
 */
function layoutSectorText(title, fontSize, anchorR, geo) {
  const lineH = fontSize * 1.16
  const words = String(title || "Event").trim().replace(/\s+/g, " ").split(" ")
  const ax = geo.cx + anchorR * sin(geo.mid)
  const ay = geo.cy - anchorR * cos(geo.mid)
  const maxLines = Math.max(1, Math.min(6, Math.floor((geo.outerR * 1.4) / lineH)))

  // Rows step along the sector itself (so a diagonal wedge gets diagonal
  // rows), always moving down the screen so they read top to bottom. Wedges
  // that run nearly horizontally fall back to plain vertical stacking.
  const ux = sin(geo.mid)
  const uy = -cos(geo.mid)
  const step =
    Math.abs(uy) >= 0.45
      ? { x: (ux * lineH) / Math.abs(uy), y: lineH }
      : { x: 0, y: lineH }

  let result = null
  let complete = null
  for (let n = 1; n <= maxLines; n++) {
    const rows = []
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2
      const rowCx = ax + step.x * k
      const top = ay + step.y * k - lineH / 2
      const span = rowSpanInSector(rowCx, top, lineH, geo)
      rows.push({ top, x: span ? span.x : rowCx, w: span ? span.w : 0 })
    }
    const { lines, remaining, hyphens } = wrapIntoRows(words, rows, fontSize)
    const placed = lines
      .map((text, i) =>
        text ? { text, x: rows[i].x, y: rows[i].top, w: rows[i].w } : null
      )
      .filter(Boolean)
    if (!placed.length) continue
    result = { lines: placed, lineH, remaining: remaining.length, hyphens }
    if (!remaining.length) {
      // A layout that fits everything without hyphens beats one that needed
      // them, so keep looking at taller blocks before settling.
      if (!hyphens) return result
      if (!complete) complete = result
    }
  }
  return complete || result
}

/** Text with a soft halo so it stays readable without a background box. */
function drawHaloText(ctx, text, rect, font, color, haloColor) {
  ctx.setFont(font)
  ctx.setTextAlignedCenter()
  ctx.setTextColor(haloColor)
  const o = Math.max(0.6, font.__size ? font.__size * 0.05 : 0.7)
  ;[
    [-o, 0],
    [o, 0],
    [0, -o],
    [0, o],
    [-o, -o],
    [o, o],
    [-o, o],
    [o, -o],
  ].forEach(([dx, dy]) => {
    ctx.drawTextInRect(
      text,
      new Rect(rect.x + dx, rect.y + dy, rect.width, rect.height)
    )
  })
  ctx.setTextColor(color)
  ctx.drawTextInRect(text, rect)
}

/**
 * Event name rendered inside its own sector: small upright left→right rows
 * stacked along the sector's mid-ray, every row clipped to the wedge.
 */
function drawSectorTitle(ctx, sec, cx, cy, R, size, accent) {
  const hubR = size * 0.155 + size * 0.012
  const geo = {
    cx,
    cy,
    mid: (sec.a0 + sec.a1) / 2,
    a0: sec.a0,
    a1: sec.a1,
    hubR,
    outerR: R * 0.9, // matches the painted wedge radius
    size,
  }
  if (geo.outerR <= geo.hubR) return

  // Small type so more of the title fits, but scaled to the dial
  const maxFs = Math.min(sec.isCurrent ? 22 : 20, Math.round(size * 0.055))
  // Flat floor: narrow sectors need small type even on a huge dial
  const minFs = 5.5
  const anchors = [0.68, 0.78, 0.58, 0.88, 0.48].map((f) => R * f)

  let fallback = null
  let fallbackScore = -Infinity
  const search = (accept) => {
    for (let fs = maxFs; fs >= minFs; fs -= 0.5) {
      for (const anchorR of anchors) {
        if (anchorR <= geo.hubR || anchorR >= geo.outerR) continue
        const attempt = layoutSectorText(sec.title, fs, anchorR, geo)
        if (!attempt) continue
        if (accept(attempt)) return { fs, ...attempt }
        const chars = attempt.lines.reduce((n, l) => n + l.text.length, 0)
        const score = chars - attempt.hyphens * 4 - attempt.remaining * 3
        if (score > fallbackScore) {
          fallbackScore = score
          fallback = { fs, ...attempt }
        }
      }
    }
    return null
  }

  // Prefer whole words; only accept hyphenation when nothing else fits
  const best =
    search((a) => !a.remaining && !a.hyphens) ||
    search((a) => !a.remaining) ||
    fallback
  if (!best || !best.lines.length) return
  if (best.remaining) {
    const last = best.lines[best.lines.length - 1]
    last.text = `${last.text.replace(/[\s\-…]+$/, "")}…`
  }

  const halo = T.kawaii ? new Color("#FFFFFF", 0.92) : new Color("#05070B", 0.92)
  const titleFont = sec.isCurrent
    ? Font.boldSystemFont(best.fs)
    : Font.semiboldSystemFont(best.fs)
  titleFont.__size = best.fs

  best.lines.forEach((line) => {
    drawHaloText(
      ctx,
      line.text,
      new Rect(line.x, line.y, line.w, best.lineH),
      titleFont,
      T.title,
      halo
    )
  })
}

/** Clock: Calendar event arcs + baby-blue hearts at timed-task start times. */
function drawDial(size, timedEvents, dayStart, dayEnd, now, timedTasks) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47

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

  const sectorMeta = []
  timedEvents.forEach((event, i) => {
    const s = event.startDate < dayStart ? dayStart : event.startDate
    const e = event.endDate > dayEnd ? dayEnd : event.endDate
    if (e <= s) return
    let a0 = ang(minsOf(s))
    let a1 = e.getTime() >= dayEnd.getTime() ? 360 : ang(minsOf(e))
    if (a1 - a0 < 3) a1 = a0 + 3
    const c = colorFor(event, i)
    fillWedge(ctx, cx, cy, R * 0.88, a0, a1, withAlpha(c, T.kawaii ? 0.4 : 0.55))
    strokeArc(ctx, cx, cy, R * 0.93, size * 0.07, a0, a1, c)
    const isCurrent = now >= event.startDate && now < event.endDate
    sectorMeta.push({
      title: event.title || "Event",
      a0,
      a1,
      isCurrent,
      color: c,
    })
  })

  // Timed reminders: single baby-blue pixel heart at start time only
  ;(timedTasks || []).forEach((task) => {
    const due = reminderDueDate(task)
    if (!due || !sameDay(due, now)) return
    const a = ang(minsOf(due))
    const px = Math.max(2, Math.round(size * 0.015))
    const hr = R * 0.93
    const fill = task.isCompleted ? withAlpha(BABY_BLUE, 0.45) : BABY_BLUE
    drawPixelHeart(
      ctx,
      cx + hr * sin(a) - (HEART_PX[0].length * px) / 2,
      cy - hr * cos(a) - (HEART_PX.length * px) / 2,
      px,
      fill,
      Color.white()
    )
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

  // Event names LAST — flowed inside their own sector, above all dial art
  sectorMeta
    .slice()
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? 1 : -1))
    .forEach((sec) => {
      drawSectorTitle(ctx, sec, cx, cy, R, size, sec.color)
    })

  return ctx.getImage()
}

function taskMeta(reminder) {
  const due = reminderDueDate(reminder)
  if (!due) return T.kawaii ? "open quest" : "no due date"
  if (!hasDueTime(reminder)) {
    return T.kawaii ? "open quest" : "no time set"
  }
  if (isOverdueTask(reminder)) return `overdue · ${hhmm(due)}`
  return `due ${hhmm(due)}`
}

function addTaskRow(parent, reminder, index, scale = 1) {
  const done = !!reminder.isCompleted
  const overdue = isOverdueTask(reminder)
  const timed = hasDueTime(reminder)
  const accent = taskAccent(reminder, index)

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.url = toggleUrl(reminder.identifier)
  row.size = new Size(0, 0)

  const bubble = row.addImage(bubbleImage(done, accent))
  bubble.imageSize = new Size(18 * scale, 18 * scale)

  row.addSpacer(5 * scale)

  const col = row.addStack()
  col.layoutVertically()
  col.size = new Size(0, 0)

  const title = col.addText(reminder.title || "Untitled")
  title.font = Font.semiboldSystemFont(11 * scale)
  title.textColor = done
    ? T.done
    : overdue
      ? OVERDUE_TEXT
      : timed
        ? TODAY_TEXT
        : PINK_TEXT
  title.lineLimit = 1
  title.minimumScaleFactor = 0.8

  const meta = col.addText(taskMeta(reminder))
  meta.font = Font.regularSystemFont(9 * scale)
  meta.textColor = done
    ? T.done
    : overdue
      ? withAlpha(CUTE_PURPLE, 0.95)
      : timed
        ? withAlpha(BABY_BLUE, 0.95)
        : withAlpha(KAWAII_PINK, 0.95)
  meta.lineLimit = 1

  return row
}

function addTaskColumn(stack, tasks, startIndex, count, scale = 1) {
  const col = stack.addStack()
  col.layoutVertically()
  col.size = new Size(0, 0)

  const slice = tasks.slice(startIndex, startIndex + count)
  if (slice.length === 0) {
    const empty = col.addText(T.freeText)
    empty.font = Font.mediumSystemFont(11 * scale)
    empty.textColor = T.muted
    return col
  }
  slice.forEach((task, i) => {
    addTaskRow(col, task, startIndex + i, scale)
    if (i < slice.length - 1) col.addSpacer(6 * scale)
  })
  return col
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = T.bg
  widget.url = "calshow://"

  const now = new Date()
  const { start, end, timed } = await loadEvents(now)
  const allTasks = await loadTasks(now)
  const timedTasks = allTasks.filter(
    (t) => hasDueTime(t) && reminderDueDate(t) && sameDay(reminderDueDate(t), now)
  )
  const box = widgetBox(family)

  // —— SQUARE (small + large): nothing but the clock, as big as it fits ——
  // Wide families (medium, and iPad's extra large) keep the task column.
  const isWide = family === "medium" || family === "extraLarge"
  if (!isWide) {
    const padTop = 5
    widget.setPadding(padTop, 2, 2, 2)
    const brandFs = family === "small" ? 8.5 : 11
    const brand = widget.addText(T.brandText)
    brand.font = Font.boldSystemFont(brandFs)
    brand.textColor = T.brand
    brand.lineLimit = 1
    brand.minimumScaleFactor = 0.6
    brand.centerAlignText()

    const dialSize = Math.min(box.w - 4, box.h - padTop - brandFs * 1.5 - 4)
    widget.addSpacer()
    const img = widget.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
    img.imageSize = new Size(dialSize, dialSize)
    img.centerAlignImage()
    img.applyFittingContentMode()
    widget.addSpacer()
    return widget
  }

  // —— WIDE (medium, and iPad's extra large): square clock filling the height
  // + tasks in the space left. Extra large is two big squares side by side:
  // the same square the large widget uses, doubled — tasks left, clock right.
  const xl = family === "extraLarge"
  const scale = xl ? 1.6 : 1
  const padY = 4
  const padX = 8
  const gap = xl ? 12 : 8
  widget.setPadding(padY, padX, padY, padX)

  const inner = box.w - padX * 2
  // Take the square from the large widget, so the clock here is exactly the
  // big square clock; the width guard only kicks in if that can't fit twice.
  const square = xl ? Math.min(box.h, widgetBox("large").h) : box.h
  const dialSize = Math.min(square - padY * 2, xl ? inner / 2 - gap : inner)
  const taskWidth = xl ? dialSize : inner - dialSize - gap

  const body = widget.addStack()
  body.layoutHorizontally()
  body.centerAlignContent()

  const left = body.addStack()
  left.layoutVertically()
  if (xl) left.size = new Size(taskWidth, dialSize)

  const brand = left.addText(T.brandText)
  brand.font = Font.boldSystemFont((T.kawaii ? 9.5 : 10) * scale)
  brand.textColor = T.brand
  brand.lineLimit = 1
  brand.minimumScaleFactor = 0.7
  left.addSpacer(4 * scale)

  const head = left.addStack()
  head.layoutHorizontally()
  head.centerAlignContent()
  const label = head.addText(T.kawaii ? "quests" : "tasks")
  label.font = Font.boldSystemFont(11 * scale)
  label.textColor = T.title
  head.addSpacer(6 * scale)
  const open = allTasks.filter((t) => !t.isCompleted).length
  const count = head.addText(T.kawaii ? `♡ ${open}` : `${open} open`)
  count.font = Font.mediumSystemFont(10 * scale)
  count.textColor = T.muted
  left.addSpacer(6 * scale)

  // Rows are ~27pt tall at scale 1; the header eats roughly two of them.
  const headerHeight = 34 * scale
  const rows = xl
    ? Math.max(3, Math.min(8, Math.floor((dialSize - headerHeight) / (27 * scale))))
    : 4
  addTaskColumn(left, allTasks, 0, rows, scale)
  left.addSpacer()

  if (xl) body.addSpacer()
  else body.addSpacer(gap)

  const img = body.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
  img.imageSize = new Size(dialSize, dialSize)
  img.applyFittingContentMode()

  return widget
}

const toggleId = args.queryParameters.toggle
if (toggleId) {
  await toggleReminder(toggleId)
}

const widget = await createWidget()
widget.refreshAfterDate = new Date(Date.now() + 1000 * 30)

if (config.runsInWidget) {
  Script.setWidget(widget)
} else if (toggleId) {
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
