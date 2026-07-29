// ============================================================
// SECTOGRAPH 24H — v2
// If you still see a text event LIST, you are running the OLD
// script. In Scriptable: delete the old script, create a NEW
// one named "Sectograph 24h", paste THIS entire file, save,
// then edit your Home Screen widget → Script → "Sectograph 24h"
// ============================================================

const BG = new Color("#0A0C10")
const DIAL = new Color("#141820")
const TRACK = new Color("#252B36")
const PAST = new Color("#1C2430")
const HAND = new Color("#FF3B30")
const HUB = new Color("#FFFFFF")
const LABEL = new Color("#9AA3B2")
const TITLE = new Color("#F4F6F8")
const MUTED = new Color("#7E8796")

const family = config.widgetFamily || "medium"
const DAY_MIN = 24 * 60

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

function colorFor(event, i) {
  try {
    if (event.calendar && event.calendar.color) return event.calendar.color
  } catch (_) {}
  const palette = [
    new Color("#3B82F6"),
    new Color("#22C55E"),
    new Color("#EAB308"),
    new Color("#A855F7"),
    new Color("#F43F5E"),
    new Color("#06B6D4"),
  ]
  return palette[i % palette.length]
}

function withAlpha(color, alpha) {
  try {
    const toHex = (v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0")
    const hex = `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`
    return new Color(hex, alpha)
  } catch (_) {
    return color
  }
}

async function loadDayEvents(now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const all = await CalendarEvent.between(start, end)
  return {
    start,
    end,
    timed: all
      .filter((e) => !e.isAllDay)
      .filter((e) => e.endDate > start && e.startDate < end)
      .sort((a, b) => a.startDate - b.startDate),
    allDay: all.filter((e) => e.isAllDay),
  }
}

/** Filled pie wedge from center (classic sectograph sector). */
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

/** Thick arc band using many dots (ring style events on top of wedges). */
function strokeArc(ctx, cx, cy, radius, thickness, a0, a1, color) {
  if (a1 <= a0) return
  ctx.setFillColor(color)
  const step = Math.max(0.5, 140 / (Math.PI * radius))
  for (let a = a0; a <= a1; a += step) {
    const x = cx + radius * sin(a) - thickness / 2
    const y = cy - radius * cos(a) - thickness / 2
    ctx.fillEllipse(new Rect(x, y, thickness, thickness))
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

function drawDial(size, timed, dayStart, dayEnd, now) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47

  // Outer dial disc
  ctx.setFillColor(DIAL)
  ctx.fillEllipse(new Rect(cx - R, cy - R, R * 2, R * 2))

  // Night wedges (00–06, 18–24)
  fillWedge(ctx, cx, cy, R * 0.98, 0, 90, new Color("#0D1118", 0.85))
  fillWedge(ctx, cx, cy, R * 0.98, 270, 360, new Color("#0D1118", 0.85))

  // Day track ring
  ctx.setStrokeColor(TRACK)
  ctx.setLineWidth(size * 0.02)
  ctx.strokeEllipse(new Rect(cx - R * 0.92, cy - R * 0.92, R * 1.84, R * 1.84))

  // Past-of-day shade
  const nowA = ang(minsOf(now))
  fillWedge(ctx, cx, cy, R * 0.9, 0, nowA, PAST)

  // Event pie sectors
  timed.forEach((event, i) => {
    const s = event.startDate < dayStart ? dayStart : event.startDate
    const e = event.endDate > dayEnd ? dayEnd : event.endDate
    if (e <= s) return
    let a0 = ang(minsOf(s))
    let a1 = e.getTime() >= dayEnd.getTime() ? 360 : ang(minsOf(e))
    if (a1 - a0 < 3) a1 = a0 + 3
    const c = colorFor(event, i)
    fillWedge(ctx, cx, cy, R * 0.88, a0, a1, withAlpha(c, 0.55))
    strokeArc(ctx, cx, cy, R * 0.93, size * 0.07, a0, a1, c)
  })

  // Hour ticks
  for (let h = 0; h < 24; h++) {
    const a = ang(h * 60)
    const major = h % 3 === 0
    const r0 = R * (major ? 0.78 : 0.82)
    const r1 = R * 0.96
    drawLine(
      ctx,
      cx + r0 * sin(a),
      cy - r0 * cos(a),
      cx + r1 * sin(a),
      cy - r1 * cos(a),
      LABEL,
      major ? 2 : 1
    )
    if (major) {
      const lr = R * 0.68
      const fs = Math.max(9, Math.round(size * 0.05))
      ctx.setFont(Font.mediumSystemFont(fs))
      ctx.setTextColor(LABEL)
      ctx.setTextAlignedCenter()
      const label = String(h).padStart(2, "0")
      ctx.drawTextInRect(
        label,
        new Rect(cx + lr * sin(a) - fs, cy - lr * cos(a) - fs * 0.55, fs * 2, fs * 1.2)
      )
    }
  }

  // Now hand
  const handR = R * 0.97
  drawLine(ctx, cx, cy, cx + handR * sin(nowA), cy - handR * cos(nowA), HAND, 3)
  ctx.setFillColor(HAND)
  ctx.fillEllipse(new Rect(cx - 5, cy - 5, 10, 10))
  ctx.setFillColor(HUB)
  ctx.fillEllipse(new Rect(cx - 2.5, cy - 2.5, 5, 5))

  // Center time disc
  const hubR = size * 0.16
  ctx.setFillColor(new Color("#0A0C10", 0.92))
  ctx.fillEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))

  const timeStr = hhmm(now)
  const tSize = Math.round(size * 0.11)
  ctx.setFont(Font.boldSystemFont(tSize))
  ctx.setTextColor(TITLE)
  ctx.setTextAlignedCenter()
  ctx.drawTextInRect(timeStr, new Rect(0, cy - tSize * 0.55, size, tSize))

  const tagSize = Math.max(8, Math.round(size * 0.045))
  ctx.setFont(Font.boldSystemFont(tagSize))
  ctx.setTextColor(HAND)
  ctx.drawTextInRect("24H", new Rect(0, cy + tSize * 0.35, size, tagSize + 2))

  return ctx.getImage()
}

function addLegend(stack, timed, now, limit) {
  const upcoming = timed.filter((e) => e.endDate > now).slice(0, limit)
  if (upcoming.length === 0) {
    const t = stack.addText("Free rest of day")
    t.font = Font.mediumSystemFont(12)
    t.textColor = MUTED
    return
  }
  upcoming.forEach((event, i) => {
    const row = stack.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    const idx = timed.indexOf(event)
    const swatch = row.addStack()
    swatch.size = new Size(8, 8)
    swatch.cornerRadius = 4
    swatch.backgroundColor = colorFor(event, idx >= 0 ? idx : i)
    row.addSpacer(6)
    const col = row.addStack()
    col.layoutVertically()
    const title = col.addText(event.title || "Untitled")
    title.font = Font.semiboldSystemFont(12)
    title.textColor = TITLE
    title.lineLimit = 1
    const meta = col.addText(`${hhmm(event.startDate)}–${hhmm(event.endDate)}`)
    meta.font = Font.regularSystemFont(10)
    meta.textColor = MUTED
    meta.lineLimit = 1
    if (i < upcoming.length - 1) stack.addSpacer(7)
  })
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = BG
  widget.setPadding(10, 10, 10, 10)
  widget.url = "calshow://"

  const now = new Date()
  const { start, end, timed, allDay } = await loadDayEvents(now)

  const dialSize = family === "small" ? 155 : family === "large" ? 270 : 168
  const dial = drawDial(dialSize, timed, start, end, now)

  // Always show a SECTOGRAPH label so you know this script is loaded
  if (family !== "small") {
    const head = widget.addStack()
    head.layoutHorizontally()
    head.centerAlignContent()
    const brand = head.addText("SECTOGRAPH")
    brand.font = Font.boldSystemFont(11)
    brand.textColor = HAND
    head.addSpacer(6)
    const sub = head.addText("24-hour clock")
    sub.font = Font.mediumSystemFont(11)
    sub.textColor = MUTED
    head.addSpacer()
    if (allDay.length > 0) {
      const ad = head.addText(`All-day: ${allDay.length}`)
      ad.font = Font.mediumSystemFont(10)
      ad.textColor = MUTED
    }
    widget.addSpacer(6)
  }

  if (family === "small") {
    widget.setPadding(6, 6, 6, 6)
    const img = widget.addImage(dial)
    img.imageSize = new Size(dialSize, dialSize)
    img.centerAlignImage()
  } else if (family === "large") {
    const body = widget.addStack()
    body.layoutHorizontally()
    body.topAlignContent()
    const img = body.addImage(dial)
    img.imageSize = new Size(dialSize, dialSize)
    body.addSpacer(12)
    const side = body.addStack()
    side.layoutVertically()
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const h = side.addText(`${days[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}`)
    h.font = Font.boldSystemFont(15)
    h.textColor = TITLE
    side.addSpacer(8)
    addLegend(side, timed, now, 8)
  } else {
    const body = widget.addStack()
    body.layoutHorizontally()
    body.centerAlignContent()
    const img = body.addImage(dial)
    img.imageSize = new Size(dialSize, dialSize)
    body.addSpacer(10)
    const side = body.addStack()
    side.layoutVertically()
    addLegend(side, timed, now, 4)
  }

  return widget
}

const widget = await createWidget()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else if (family === "small") {
  await widget.presentSmall()
} else if (family === "large") {
  await widget.presentLarge()
} else {
  await widget.presentMedium()
}
Script.complete()
