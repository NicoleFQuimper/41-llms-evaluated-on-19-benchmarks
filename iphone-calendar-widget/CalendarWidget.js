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
const BABY_BLUE = new Color("#A8D8FF") // today / timed-task hearts
const CUTE_PURPLE = new Color("#C084FC") // overdue task hearts
const OVERDUE_TEXT = new Color("#7C3AED")
const TODAY_TEXT = new Color("#4A7AA8")

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

function isOverdueTask(reminder, now) {
  if (reminder.isCompleted) return false
  const due = reminderDueDate(reminder)
  if (!due) return false
  const dayStart = new Date(now || new Date())
  dayStart.setHours(0, 0, 0, 0)
  return due < dayStart
}

function taskAccent(reminder, index) {
  if (reminder.isCompleted) return T.done
  if (isOverdueTask(reminder)) return CUTE_PURPLE
  return BABY_BLUE // today + open quests
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
  // Timed tasks first (baby blue), then untimed; completed sink to bottom
  tasks.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
    const ta = hasDueTime(a)
    const tb = hasDueTime(b)
    if (ta !== tb) return ta ? -1 : 1
    if (ta && tb) return reminderDueDate(a) - reminderDueDate(b)
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
      drawPixelHeart(ctx, hx, hy, px, T.bubbleEmpty, T.bubbleStroke)
    }
  } else {
    const pad = 2
    const r = size - pad * 2
    ctx.setFillColor(done ? accent : T.bubbleEmpty)
    ctx.fillEllipse(new Rect(pad, pad, r, r))
    ctx.setStrokeColor(done ? accent : T.bubbleStroke)
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

/**
 * Draw title along one or more arcs inside the event wedge
 * (curved around the clock — not a flat text block).
 */
function drawArcTextRow(ctx, text, cx, cy, radius, a0, a1, fontSize, color) {
  const raw = String(text || "").trim()
  if (!raw) return 0
  const chars = raw.split("")
  const span = Math.max(1, a1 - a0)
  const arcLen = rad(span) * radius

  let fs = fontSize
  const adv = (ch, s) => (ch === " " ? s * 0.32 : s * 0.62)

  while (fs >= 6) {
    let need = 0
    for (let i = 0; i < chars.length; i++) need += adv(chars[i], fs)
    if (need <= arcLen * 0.96) break
    fs -= 1
  }

  let total = 0
  for (let i = 0; i < chars.length; i++) total += adv(chars[i], fs)
  const textSpan = Math.min(span * 0.96, (total / radius) * (180 / Math.PI))
  let a = (a0 + a1) / 2 - textSpan / 2

  ctx.setFillColor(color)
  ctx.setTextColor(color)
  ctx.setFont(Font.boldSystemFont(fs))
  ctx.setTextAlignedCenter()

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const w = adv(ch, fs)
    const step = (w / radius) * (180 / Math.PI)
    const midA = a + step / 2
    if (ch !== " ") {
      const tw = fs * 0.85
      const th = fs * 1.15
      ctx.drawTextInRect(
        ch,
        new Rect(
          cx + radius * sin(midA) - tw / 2,
          cy - radius * cos(midA) - th / 2,
          tw,
          th
        )
      )
    }
    a += step
  }
  return fs
}

function fitArcLines(title, radiusOuter, radiusInner, spanDeg, maxFs) {
  const lines = []
  let left = String(title || "Event").trim().replace(/\s+/g, " ")
  let r = radiusOuter
  const minR = radiusInner
  let fs = maxFs

  while (left.length && r >= minR + fs * 0.4) {
    const arcLen = rad(spanDeg) * r * 0.94
    // largest fs that fits at least a few chars on this ring
    let useFs = fs
    while (useFs >= 6) {
      const charW = useFs * 0.62
      if (arcLen / charW >= 3) break
      useFs -= 1
    }
    const maxChars = Math.max(3, Math.floor(arcLen / (useFs * 0.62)))
    // prefer breaking on spaces
    let take = Math.min(maxChars, left.length)
    if (take < left.length) {
      const slice = left.slice(0, take)
      const sp = slice.lastIndexOf(" ")
      if (sp >= Math.floor(maxChars * 0.4)) take = sp
    }
    const piece = left.slice(0, take).trim()
    if (!piece) break
    lines.push({ text: piece, radius: r, fontSize: useFs })
    left = left.slice(take).trim()
    r -= useFs * 1.18
    fs = Math.min(fs, useFs)
  }
  // if leftover remains and we have room, cram on last line with ellipsis skip — append to last
  if (left.length && lines.length) {
    const last = lines[lines.length - 1]
    last.text = (last.text + " " + left).trim()
  }
  return lines
}

function drawEventLabelInSector(ctx, title, a0, a1, cx, cy, R, size, isCurrent) {
  const span = a1 - a0
  if (span < 4) return

  // Keep labels inside the faded wedge band (outside hub, inside outer ring)
  const outerR = R * (span >= 50 ? 0.72 : 0.7)
  const innerR = R * 0.3
  const pad = Math.min(6, span * 0.08)
  const la0 = a0 + pad
  const la1 = a1 - pad
  if (la1 - la0 < 3) return

  const maxFs = Math.floor(
    Math.min(
      size * (isCurrent ? 0.085 : 0.07),
      ((la1 - la0) / 360) * Math.PI * outerR * 0.9
    )
  )

  const rows = fitArcLines(title, outerR, innerR, la1 - la0, Math.max(8, maxFs))
  const color = isCurrent
    ? T.kawaii
      ? new Color("#5B2148")
      : Color.white()
    : T.kawaii
      ? new Color("#6B2D5B", 0.92)
      : new Color("#F4F6F8", 0.9)

  rows.forEach((row) => {
    drawArcTextRow(ctx, row.text, cx, cy, row.radius, la0, la1, row.fontSize, color)
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

  // Event names inside faded wedges (current first / on top for quick glance)
  sectorMeta
    .slice()
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? 1 : -1))
    .forEach((sec) => {
      drawEventLabelInSector(
        ctx,
        sec.title,
        sec.a0,
        sec.a1,
        cx,
        cy,
        R,
        size,
        sec.isCurrent
      )
    })

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

function taskMeta(reminder) {
  const due = reminderDueDate(reminder)
  if (!due) return T.kawaii ? "open quest" : "no due date"
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  if (due < dayStart) {
    return hasDueTime(reminder)
      ? `overdue · ${hhmm(due)}`
      : T.kawaii
        ? "overdue ✦"
        : "overdue"
  }
  if (hasDueTime(reminder)) return `due ${hhmm(due)}`
  return T.kawaii ? "due today ♡" : "due today"
}

function addTaskRow(parent, reminder, index) {
  const done = !!reminder.isCompleted
  const overdue = isOverdueTask(reminder)
  const accent = taskAccent(reminder, index)

  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.url = toggleUrl(reminder.identifier)
  row.size = new Size(0, 0)

  const bubble = row.addImage(bubbleImage(done, accent))
  bubble.imageSize = new Size(18, 18)

  row.addSpacer(5)

  const col = row.addStack()
  col.layoutVertically()
  col.size = new Size(0, 0)

  const title = col.addText(reminder.title || "Untitled")
  title.font = Font.semiboldSystemFont(11)
  title.textColor = done ? T.done : overdue ? OVERDUE_TEXT : TODAY_TEXT
  title.lineLimit = 1
  title.minimumScaleFactor = 0.8

  const meta = col.addText(taskMeta(reminder))
  meta.font = Font.regularSystemFont(9)
  meta.textColor = done
    ? T.done
    : overdue
      ? withAlpha(CUTE_PURPLE, 0.95)
      : withAlpha(BABY_BLUE, 0.95)
  meta.lineLimit = 1

  return row
}

function addTaskColumn(stack, tasks, startIndex, count) {
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
  slice.forEach((task, i) => {
    addTaskRow(col, task, startIndex + i)
    if (i < slice.length - 1) col.addSpacer(6)
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
  brand.font = Font.boldSystemFont(T.kawaii ? 10 : 11)
  brand.textColor = T.brand
  head.addSpacer()
  const open = tasks.filter((t) => !t.isCompleted).length
  const count = head.addText(T.kawaii ? `♡ ${open} left` : `${open} left`)
  count.font = Font.mediumSystemFont(10)
  count.textColor = T.muted
  widget.addSpacer(6)

  // —— LARGE: clock left, ONE task column right ——
  if (family === "large") {
    const dialSize = 220
    const body = widget.addStack()
    body.layoutHorizontally()
    body.topAlignContent()

    const img = body.addImage(drawDial(dialSize, timed, start, end, now, timedTasks))
    img.imageSize = new Size(dialSize, dialSize)

    body.addSpacer(10)

    const right = body.addStack()
    right.layoutVertically()
    right.size = new Size(0, 0)

    const label = right.addText(T.kawaii ? "today's quests" : "today's tasks")
    label.font = Font.boldSystemFont(12)
    label.textColor = T.title
    right.addSpacer(8)

    if (tasks.length === 0) {
      const empty = right.addText(T.freeText)
      empty.font = Font.mediumSystemFont(12)
      empty.textColor = T.muted
    } else {
      addTaskColumn(right, tasks, 0, 12)
    }
    return widget
  }

  // —— MEDIUM: one task column LEFT + clock ——
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
  addTaskColumn(left, tasks, 0, 4)

  body.addSpacer(8)

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
