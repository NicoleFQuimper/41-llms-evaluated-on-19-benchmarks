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
    bg: new Color("#070A0F"),
    dial: new Color("#121722"),
    track: new Color("#2B3444"),
    past: new Color("#0C111A", 0.75),
    night: new Color("#080B12", 0.8),
    hand: new Color("#FF4D5E"),
    label: new Color("#A9B3C4"),
    title: new Color("#F7F9FC"),
    muted: new Color("#8B95A8"),
    brand: new Color("#E7EAF0"),
    done: new Color("#5A6579"),
    brandText: "SECTOGRAPH · 24H",
    freeText: "No tasks left",
    hubFill: new Color("#0B0F16", 0.95),
    palette: [
      new Color("#5B9DF9"),
      new Color("#38D39F"),
      new Color("#F2C14E"),
      new Color("#B683F7"),
      new Color("#FF6B81"),
      new Color("#4FD1E0"),
    ],
    kawaii: false,
  },
  kawaii: {
    bg: new Color("#FFF3F9"),
    dial: new Color("#FFE7F4"),
    track: new Color("#FBC9E4"),
    past: new Color("#F6D8EC", 0.6),
    night: new Color("#EADFFF", 0.5),
    hand: new Color("#FF4D8D"),
    label: new Color("#BF5C8C"),
    title: new Color("#5E2750"),
    muted: new Color("#AC7896"),
    brand: new Color("#FF4D8D"),
    done: new Color("#D9A9C2"),
    brandText: "✦ MAGICAL SECTOGRAPH ✦",
    freeText: "all clear, starlight ♡",
    hubFill: new Color("#FFFBFD", 0.96),
    palette: [
      new Color("#FF7AB8"),
      new Color("#C69BFF"),
      new Color("#8FD3FF"),
      new Color("#FFA8D4"),
      new Color("#B39CFB"),
      new Color("#FF95A8"),
      new Color("#9BE7C4"),
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

/** Pixel-art heart. `outline` draws a chunky border for the magical-girl look. */
function drawPixelHeart(ctx, x, y, px, fill, outline) {
  const rows = HEART_PX.length
  const cols = HEART_PX[0].length
  if (outline) {
    ctx.setFillColor(outline)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!HEART_PX[r][c]) continue
        ctx.fillRect(
          new Rect(x + (c - 0.2) * px, y + (r - 0.2) * px, px * 1.4, px * 1.4)
        )
      }
    }
  }
  ctx.setFillColor(fill)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!HEART_PX[r][c]) continue
      ctx.fillRect(new Rect(x + c * px, y + r * px, px, px))
    }
  }
}

/** Hollow pixel heart: outline pixels only. */
function drawPixelHeartOutline(ctx, x, y, px, color) {
  const rows = HEART_PX.length
  const cols = HEART_PX[0].length
  const on = (r, c) =>
    r >= 0 && r < rows && c >= 0 && c < cols ? HEART_PX[r][c] : 0
  ctx.setFillColor(color)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!on(r, c)) continue
      const edge =
        !on(r - 1, c) || !on(r + 1, c) || !on(r, c - 1) || !on(r, c + 1)
      if (edge) ctx.fillRect(new Rect(x + c * px, y + r * px, px, px))
    }
  }
}

function pixelHeartSize(px) {
  return { w: HEART_PX[0].length * px, h: HEART_PX.length * px }
}

/** Chunky pixel-stepped line, for the magical-girl dial. */
function drawPixelLine(ctx, x0, y0, x1, y1, px, color) {
  const dx = x1 - x0
  const dy = y1 - y0
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (px * 0.7)))
  ctx.setFillColor(color)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = Math.round((x0 + dx * t) / px) * px
    const y = Math.round((y0 + dy * t) / px) * px
    ctx.fillRect(new Rect(x, y, px, px))
  }
}

/** Task bubble: pixel heart (kawaii) or circle checkbox (classic). */
function bubbleImage(done, accent) {
  const size = 26
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  if (T.kawaii) {
    const px = 2.8
    const { w, h } = pixelHeartSize(px)
    const hx = (size - w) / 2
    const hy = (size - h) / 2
    if (done) {
      drawPixelHeart(ctx, hx, hy, px, accent, Color.white())
      // Pixel glint
      ctx.setFillColor(Color.white())
      ctx.fillRect(new Rect(hx + px, hy + px, px, px))
    } else {
      ctx.setFillColor(withAlpha(accent, 0.18))
      ctx.fillRect(new Rect(hx, hy, w, h))
      drawPixelHeartOutline(ctx, hx, hy, px, accent)
    }
  } else {
    const pad = 3
    const r = size - pad * 2
    ctx.setFillColor(done ? accent : withAlpha(accent, 0.14))
    ctx.fillEllipse(new Rect(pad, pad, r, r))
    ctx.setStrokeColor(withAlpha(accent, done ? 1 : 0.85))
    ctx.setLineWidth(1.8)
    ctx.strokeEllipse(new Rect(pad, pad, r, r))
    if (done) {
      const p = new Path()
      p.move(new Point(size * 0.31, size * 0.51))
      p.addLine(new Point(size * 0.44, size * 0.65))
      p.addLine(new Point(size * 0.7, size * 0.36))
      ctx.addPath(p)
      ctx.setStrokeColor(Color.white())
      ctx.setLineWidth(2.2)
      ctx.strokePath()
    }
  }
  return ctx.getImage()
}

/** Pixel sparkle: a plus made of blocks. */
function drawSparkle(ctx, x, y, px, color) {
  ctx.setFillColor(color)
  ctx.fillRect(new Rect(x - px / 2, y - px * 1.5, px, px * 3))
  ctx.fillRect(new Rect(x - px * 1.5, y - px / 2, px * 3, px))
}

/**
 * Floating task bubble on the sectograph rim:
 * pixel heart in kawaii, plain bubble in classic.
 */
function drawRimTaskBubble(ctx, x, y, r, accent, dim) {
  if (T.kawaii) {
    const px = Math.max(1.4, r * 0.3)
    const { w, h } = pixelHeartSize(px)
    drawPixelHeart(
      ctx,
      x - w / 2,
      y - h / 2,
      px,
      dim ? withAlpha(accent, 0.4) : accent,
      new Color("#FFFFFF", dim ? 0.7 : 0.95)
    )
    if (!dim) {
      ctx.setFillColor(new Color("#FFFFFF", 0.9))
      ctx.fillRect(new Rect(x - w / 2 + px, y - h / 2 + px, px, px))
    }
    return
  }

  ctx.setFillColor(withAlpha(accent, dim ? 0.14 : 0.24))
  ctx.fillEllipse(new Rect(x - r, y - r, r * 2, r * 2))
  ctx.setFillColor(new Color("#0E131B", 0.94))
  ctx.fillEllipse(new Rect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64))
  ctx.setStrokeColor(withAlpha(accent, dim ? 0.5 : 0.95))
  ctx.setLineWidth(Math.max(1, r * 0.22))
  ctx.strokeEllipse(new Rect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64))
  ctx.setFillColor(dim ? withAlpha(accent, 0.45) : accent)
  ctx.fillEllipse(new Rect(x - r * 0.42, y - r * 0.42, r * 0.84, r * 0.84))
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

  let result = null
  for (let n = 1; n <= maxLines; n++) {
    const rows = []
    for (let i = 0; i < n; i++) {
      const top = ay - (n * lineH) / 2 + i * lineH
      const span = rowSpanInSector(ax, top, lineH, geo)
      rows.push({ top, x: span ? span.x : ax, w: span ? span.w : 0 })
    }
    const { lines, remaining, hyphens } = wrapIntoRows(words, rows, fontSize)
    const placed = lines
      .map((text, i) =>
        text ? { text, x: rows[i].x, y: rows[i].top, w: rows[i].w } : null
      )
      .filter(Boolean)
    if (!placed.length) continue
    result = { lines: placed, lineH, remaining: remaining.length, hyphens }
    if (!remaining.length) return result
  }
  return result
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

  // Small type so more of the title fits inside the wedge
  const maxFs = Math.min(sec.isCurrent ? 10 : 9, Math.round(size * 0.05))
  const minFs = Math.max(5, size * 0.025)
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

/** Clock: event sectors with radial labels + heart bubbles on the rim. */
function drawDial(size, timedEvents, dayStart, dayEnd, now, dialTasks) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.42

  if (T.kawaii) {
    // Soft blush halo for depth
    for (let i = 5; i >= 1; i--) {
      ctx.setFillColor(new Color("#FF9ACB", 0.04 * i))
      const rr = R + i * (size * 0.01)
      ctx.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2))
    }
  } else {
    // Machined bezel
    const bz = R + size * 0.022
    ctx.setFillColor(new Color("#1B2330", 0.9))
    ctx.fillEllipse(new Rect(cx - bz, cy - bz, bz * 2, bz * 2))
    ctx.setStrokeColor(new Color("#FFFFFF", 0.12))
    ctx.setLineWidth(1)
    ctx.strokeEllipse(new Rect(cx - bz, cy - bz, bz * 2, bz * 2))
  }

  // Dial face
  ctx.setFillColor(T.dial)
  ctx.fillEllipse(new Rect(cx - R, cy - R, R * 2, R * 2))

  // Night bands
  fillWedge(ctx, cx, cy, R * 0.98, 0, 90, T.night)
  fillWedge(ctx, cx, cy, R * 0.98, 270, 360, T.night)

  // Past shading
  const nowA = ang(minsOf(now))
  fillWedge(ctx, cx, cy, R * 0.92, 0, nowA, T.past)

  // Polished rim
  ctx.setStrokeColor(withAlpha(T.track, 0.9))
  ctx.setLineWidth(Math.max(1.5, size * 0.012))
  ctx.strokeEllipse(new Rect(cx - R, cy - R, R * 2, R * 2))
  ctx.setStrokeColor(T.kawaii ? new Color("#FFFFFF", 0.75) : new Color("#FFFFFF", 0.1))
  ctx.setLineWidth(1)
  ctx.strokeEllipse(new Rect(cx - R * 0.93, cy - R * 0.93, R * 1.86, R * 1.86))

  const sectorMeta = []
  timedEvents.forEach((event, i) => {
    const s = event.startDate < dayStart ? dayStart : event.startDate
    const e = event.endDate > dayEnd ? dayEnd : event.endDate
    if (e <= s) return
    let a0 = ang(minsOf(s))
    let a1 = e.getTime() >= dayEnd.getTime() ? 360 : ang(minsOf(e))
    if (a1 - a0 < 3) a1 = a0 + 3
    const c = colorFor(event, i)
    const isCurrent = now >= event.startDate && now < event.endDate

    // Layered wedge for a gradient-like falloff
    fillWedge(ctx, cx, cy, R * 0.9, a0, a1, withAlpha(c, T.kawaii ? 0.4 : 0.5))
    fillWedge(ctx, cx, cy, R * 0.66, a0, a1, withAlpha(c, T.kawaii ? 0.24 : 0.3))
    strokeArc(ctx, cx, cy, R * 0.9, size * 0.035, a0, a1, withAlpha(c, 0.95))
    // Radial edges
    ;[a0, a1].forEach((a) => {
      drawLine(
        ctx,
        cx + R * 0.14 * sin(a),
        cy - R * 0.14 * cos(a),
        cx + R * 0.9 * sin(a),
        cy - R * 0.9 * cos(a),
        withAlpha(c, isCurrent ? 0.9 : 0.55),
        isCurrent ? 1.6 : 1
      )
    })

    sectorMeta.push({
      title: event.title || "Event",
      a0,
      a1,
      isCurrent,
      color: c,
      start: s,
      end: e,
    })
  })

  // Hour ticks + labels
  const tickPx = Math.max(1.6, size * 0.014)
  for (let h = 0; h < 24; h++) {
    const a = ang(h * 60)
    const major = h % 3 === 0
    if (T.kawaii) {
      // Chunky pixel blocks instead of hairlines
      const tr = R * (major ? 0.945 : 0.96)
      const bs = major ? tickPx * 1.6 : tickPx
      ctx.setFillColor(withAlpha(T.label, major ? 0.95 : 0.55))
      ctx.fillRect(
        new Rect(cx + tr * sin(a) - bs / 2, cy - tr * cos(a) - bs / 2, bs, bs)
      )
    } else {
      drawLine(
        ctx,
        cx + R * (major ? 0.93 : 0.955) * sin(a),
        cy - R * (major ? 0.93 : 0.955) * cos(a),
        cx + R * 0.99 * sin(a),
        cy - R * 0.99 * cos(a),
        withAlpha(T.label, major ? 0.95 : 0.5),
        major ? 2 : 1
      )
    }
    if (major) {
      const fs = Math.max(8, Math.round(size * 0.045))
      const lr = R * 0.86
      ctx.setFont(Font.semiboldSystemFont(fs))
      ctx.setTextColor(withAlpha(T.label, 0.95))
      ctx.setTextAlignedCenter()
      ctx.drawTextInRect(
        String(h).padStart(2, "0"),
        new Rect(cx + lr * sin(a) - fs, cy - lr * cos(a) - fs * 0.6, fs * 2, fs * 1.3)
      )
    }
  }

  if (T.kawaii) {
    ;[42, 128, 214, 318].forEach((a, i) => {
      const colors = [new Color("#FF9FCB"), new Color("#C9B6FD"), new Color("#A8D8FF")]
      drawSparkle(
        ctx,
        cx + R * 0.985 * sin(a),
        cy - R * 0.985 * cos(a),
        Math.max(1.4, size * 0.012),
        colors[i % 3]
      )
    })
  }

  // Now hand
  const tipX = cx + R * 0.96 * sin(nowA)
  const tipY = cy - R * 0.96 * cos(nowA)
  if (T.kawaii) {
    const hpx = Math.max(1.8, size * 0.016)
    drawPixelLine(ctx, cx, cy, tipX, tipY, hpx, Color.white())
    drawPixelLine(ctx, cx, cy, tipX, tipY, hpx * 0.7, T.hand)
    const heartPx = Math.max(1.4, size * 0.011)
    const hs = pixelHeartSize(heartPx)
    drawPixelHeart(
      ctx,
      tipX - hs.w / 2,
      tipY - hs.h / 2,
      heartPx,
      T.hand,
      Color.white()
    )
  } else {
    drawLine(ctx, cx, cy, tipX, tipY, new Color("#000000", 0.6), 5)
    drawLine(ctx, cx, cy, tipX, tipY, T.hand, 2.4)
    ctx.setFillColor(T.hand)
    ctx.fillEllipse(new Rect(tipX - 3, tipY - 3, 6, 6))
  }

  // Center hub
  const hubR = size * 0.155
  ctx.setFillColor(T.kawaii ? new Color("#000000", 0.06) : new Color("#000000", 0.35))
  ctx.fillEllipse(new Rect(cx - hubR - 1.5, cy - hubR + 1, (hubR + 1.5) * 2, (hubR + 1.5) * 2))
  ctx.setFillColor(T.hubFill)
  ctx.fillEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))
  if (T.kawaii) {
    // Pixel-block ring around the hub
    const bpx = Math.max(1.8, size * 0.015)
    ctx.setFillColor(new Color("#FF8FBF", 0.9))
    for (let a = 0; a < 360; a += 7.5) {
      ctx.fillRect(
        new Rect(cx + hubR * sin(a) - bpx / 2, cy - hubR * cos(a) - bpx / 2, bpx, bpx)
      )
    }
  } else {
    ctx.setStrokeColor(new Color("#FFFFFF", 0.18))
    ctx.setLineWidth(2)
    ctx.strokeEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))
  }

  const tSize = Math.round(size * 0.1)
  ctx.setFont(Font.boldSystemFont(tSize))
  ctx.setTextColor(T.title)
  ctx.setTextAlignedCenter()
  ctx.drawTextInRect(hhmm(now), new Rect(0, cy - tSize * 0.78, size, tSize * 1.2))
  const tagSize = Math.max(7, Math.round(size * 0.04))
  ctx.setFont(Font.mediumSystemFont(tagSize))
  ctx.setTextColor(withAlpha(T.muted, 0.95))
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  ctx.drawTextInRect(
    `${days[now.getDay()]} ${now.getDate()}`,
    new Rect(0, cy + tSize * 0.28, size, tagSize + 3)
  )

  // Event names — flowed inside their own sector, drawn above all dial art
  sectorMeta
    .slice()
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? 1 : -1))
    .forEach((sec) => {
      drawSectorTitle(ctx, sec, cx, cy, R, size, sec.color)
    })

  // Floating heart bubbles on the rim for timed tasks
  const bubbles = (dialTasks || [])
    .map((task) => ({ task, due: reminderDueDate(task) }))
    .filter((b) => !!b.due)
    .sort((a, b) => a.due - b.due)
  let lastAngle = null
  let ring = 0
  bubbles.forEach((b) => {
    const a = ang(minsOf(b.due))
    if (lastAngle !== null && a - lastAngle < 9) ring += 1
    else ring = 0
    lastAngle = a
    const rr = Math.max(5, size * 0.042)
    const br = R * 1.045 - ring * rr * 1.9
    drawRimTaskBubble(
      ctx,
      cx + br * sin(a),
      cy - br * cos(a),
      rr,
      taskAccent(b.task, 0),
      !!b.task.isCompleted
    )
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

function addTaskRow(parent, reminder, index) {
  const done = !!reminder.isCompleted
  const overdue = isOverdueTask(reminder)
  const timed = hasDueTime(reminder)
  const accent = taskAccent(reminder, index)

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.url = toggleUrl(reminder.identifier)
  row.setPadding(4, 6, 4, 6)
  row.cornerRadius = 9
  row.backgroundColor = done
    ? withAlpha(T.done, 0.1)
    : withAlpha(accent, T.kawaii ? 0.1 : 0.13)

  const bubble = row.addImage(bubbleImage(done, accent))
  bubble.imageSize = new Size(17, 17)

  row.addSpacer(6)

  const col = row.addStack()
  col.layoutVertically()

  const title = col.addText(reminder.title || "Untitled")
  title.font = Font.semiboldSystemFont(11)
  title.textColor = done
    ? T.done
    : overdue
      ? OVERDUE_TEXT
      : timed
        ? TODAY_TEXT
        : PINK_TEXT
  title.lineLimit = 1
  title.minimumScaleFactor = 0.75

  const meta = col.addText(taskMeta(reminder))
  meta.font = Font.mediumSystemFont(9)
  meta.textColor = done
    ? T.done
    : overdue
      ? withAlpha(CUTE_PURPLE, 0.95)
      : timed
        ? withAlpha(BABY_BLUE, 0.95)
        : withAlpha(KAWAII_PINK, 0.95)
  meta.lineLimit = 1

  row.addSpacer()

  return row
}

function addTaskColumn(stack, tasks, startIndex, count) {
  const col = stack.addStack()
  col.layoutVertically()

  const slice = tasks.slice(startIndex, startIndex + count)
  if (slice.length === 0) {
    const empty = col.addText(T.freeText)
    empty.font = Font.mediumSystemFont(11)
    empty.textColor = T.muted
    return col
  }
  slice.forEach((task, i) => {
    addTaskRow(col, task, startIndex + i)
    if (i < slice.length - 1) col.addSpacer(5)
  })
  return col
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = T.bg
  widget.setPadding(10, 10, 10, 10)
  widget.url = "calshow://"

  const now = new Date()
  const { start, end, timed } = await loadEvents(now)
  const allTasks = await loadTasks(now)
  const timedTasks = allTasks.filter(
    (t) => hasDueTime(t) && reminderDueDate(t) && sameDay(reminderDueDate(t), now)
  )
  const tasks = family === "small" ? [] : allTasks

  // —— SMALL: clock only (events + baby-blue timed-task hearts; no task list) ——
  if (family === "small") {
    widget.setPadding(6, 6, 6, 6)
    const dialSize = 155
    const img = widget.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
    img.imageSize = new Size(dialSize, dialSize)
    img.centerAlignImage()
    return widget
  }

  const head = widget.addStack()
  head.layoutHorizontally()
  head.centerAlignContent()
  const brand = head.addText(T.brandText)
  brand.font = Font.boldSystemFont(T.kawaii ? 10 : 10.5)
  brand.textColor = T.brand
  head.addSpacer()

  const open = tasks.filter((t) => !t.isCompleted).length
  const pill = head.addStack()
  pill.setPadding(2, 7, 2, 7)
  pill.cornerRadius = 8
  pill.backgroundColor = withAlpha(T.brand, T.kawaii ? 0.14 : 0.2)
  const count = pill.addText(T.kawaii ? `♡ ${open}` : `${open} open`)
  count.font = Font.semiboldSystemFont(9.5)
  count.textColor = T.kawaii ? T.brand : T.title
  widget.addSpacer(8)

  // —— LARGE: clock left, ONE task column right ——
  if (family === "large") {
    const dialSize = 215
    const body = widget.addStack()
    body.layoutHorizontally()
    body.topAlignContent()

    const img = body.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
    img.imageSize = new Size(dialSize, dialSize)

    body.addSpacer(12)

    const right = body.addStack()
    right.layoutVertically()

    const label = right.addText(T.kawaii ? "today's quests" : "today's tasks")
    label.font = Font.boldSystemFont(12)
    label.textColor = T.title
    right.addSpacer(8)

    if (tasks.length === 0) {
      const empty = right.addText(T.freeText)
      empty.font = Font.mediumSystemFont(12)
      empty.textColor = T.muted
    } else {
      addTaskColumn(right, tasks, 0, 11)
    }
    right.addSpacer()
    return widget
  }

  // —— MEDIUM: one task column LEFT + clock ——
  const dialSize = 138
  const body = widget.addStack()
  body.layoutHorizontally()
  body.centerAlignContent()

  const left = body.addStack()
  left.layoutVertically()
  const label = left.addText(T.kawaii ? "quests" : "tasks")
  label.font = Font.boldSystemFont(11)
  label.textColor = T.title
  left.addSpacer(6)
  addTaskColumn(left, tasks, 0, 4)

  body.addSpacer(10)

  const img = body.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
  img.imageSize = new Size(dialSize, dialSize)

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
