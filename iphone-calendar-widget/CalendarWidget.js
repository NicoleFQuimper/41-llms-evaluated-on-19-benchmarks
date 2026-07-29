// Sectograph 24h Calendar Widget for Scriptable (iPhone)
// Circular 24-hour clock with calendar events as colored sectors.
//
// Setup:
// 1. Install "Scriptable" from the App Store
// 2. Create a new script, paste this file's contents
// 3. Name it "Calendar Widget"
// 4. Long-press Home Screen → + → Scriptable → choose size → select this script
// 5. Allow Calendar access when prompted
//
// Tip: Medium or Large looks best for the clock + event list.

const WIDGET_BG = new Color("#0B0E13")
const DIAL_BG = new Color("#151A22")
const RING_TRACK = new Color("#2A3340")
const PAST_SHADE = new Color("#1A222D", 0.55)
const NIGHT_SHADE = new Color("#10151C", 0.9)
const ACCENT = new Color("#4AA3F5")
const NOW_HAND = new Color("#FF5A5F")
const TEXT_PRIMARY = new Color("#F2F4F7")
const TEXT_SECONDARY = new Color("#8B95A5")
const TICK = new Color("#5A6575")
const HOUR_LABEL = new Color("#A8B0BD")

const widgetFamily = config.widgetFamily || "medium"
const MINUTES_IN_DAY = 24 * 60

function sinDeg(deg) {
  return Math.sin((deg * Math.PI) / 180)
}

function cosDeg(deg) {
  return Math.cos((deg * Math.PI) / 180)
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}

function angleForMinutes(minutes) {
  // Midnight at top, clockwise through the day
  return (minutes / MINUTES_IN_DAY) * 360
}

function formatClock(date) {
  const h = date.getHours()
  const m = date.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function formatHourRange(start, end) {
  const fmt = (d) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return `${fmt(start)}–${fmt(end)}`
}

function eventColor(event, index) {
  try {
    if (event.calendar && event.calendar.color) return event.calendar.color
  } catch (_) {}
  const palette = [
    new Color("#4AA3F5"),
    new Color("#57C3A7"),
    new Color("#F0B429"),
    new Color("#E879F9"),
    new Color("#FB7185"),
    new Color("#A78BFA"),
  ]
  return palette[index % palette.length]
}

async function loadEvents() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const events = await CalendarEvent.between(start, end)
  return events
    .filter((e) => !e.isAllDay)
    .filter((e) => e.endDate > start && e.startDate < end)
    .sort((a, b) => a.startDate - b.startDate)
}

function drawArcDots(ctx, cx, cy, radius, thickness, startDeg, endDeg, color) {
  if (endDeg <= startDeg) return
  ctx.setFillColor(color)
  const step = Math.max(0.6, 180 / (Math.PI * radius))
  for (let t = startDeg; t <= endDeg; t += step) {
    const x = cx + radius * sinDeg(t) - thickness / 2
    const y = cy - radius * cosDeg(t) - thickness / 2
    ctx.fillEllipse(new Rect(x, y, thickness, thickness))
  }
}

function drawLine(ctx, x1, y1, x2, y2, color, width) {
  const path = new Path()
  path.move(new Point(x1, y1))
  path.addLine(new Point(x2, y2))
  ctx.setStrokeColor(color)
  ctx.setLineWidth(width)
  ctx.addPath(path)
  ctx.strokePath()
}

function drawSectograph(size, events, now) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.46
  const ringWidth = size * 0.11
  const ringR = outerR - ringWidth / 2
  const innerR = outerR - ringWidth - size * 0.02

  // Dial background
  ctx.setFillColor(DIAL_BG)
  ctx.fillEllipse(new Rect(cx - outerR - 2, cy - outerR - 2, (outerR + 2) * 2, (outerR + 2) * 2))

  // Night hours (00–06 and 18–24) subtle shading on outer ring track
  drawArcDots(ctx, cx, cy, ringR, ringWidth, 0, 90, NIGHT_SHADE) // 0–6
  drawArcDots(ctx, cx, cy, ringR, ringWidth, 270, 360, NIGHT_SHADE) // 18–24

  // Full ring track
  ctx.setStrokeColor(RING_TRACK)
  ctx.setLineWidth(ringWidth)
  ctx.strokeEllipse(new Rect(cx - ringR, cy - ringR, ringR * 2, ringR * 2))

  // Past portion of the day
  const nowMinutes = minutesSinceMidnight(now)
  const nowAngle = angleForMinutes(nowMinutes)
  drawArcDots(ctx, cx, cy, ringR, ringWidth * 0.92, 0, nowAngle, PAST_SHADE)

  // Event sectors on the ring
  events.forEach((event, index) => {
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const start =
      event.startDate < dayStart ? dayStart : new Date(event.startDate)
    const end = event.endDate > dayEnd ? dayEnd : new Date(event.endDate)
    if (end <= start) return

    const startAngle = angleForMinutes(minutesSinceMidnight(start))
    let endAngle = angleForMinutes(minutesSinceMidnight(end))
    if (end.getTime() === dayEnd.getTime()) {
      endAngle = 360
    }
    // Minimum visible span (~8 minutes)
    if (endAngle - startAngle < 2) endAngle = startAngle + 2
    drawArcDots(
      ctx,
      cx,
      cy,
      ringR,
      ringWidth * 0.86,
      startAngle,
      endAngle,
      eventColor(event, index)
    )
  })

  // Hour ticks + labels (every 3 hours for clarity)
  for (let hour = 0; hour < 24; hour++) {
    const angle = angleForMinutes(hour * 60)
    const isMajor = hour % 3 === 0
    const tickOuter = outerR - 1
    const tickInner = tickOuter - (isMajor ? size * 0.035 : size * 0.02)
    const x1 = cx + tickOuter * sinDeg(angle)
    const y1 = cy - tickOuter * cosDeg(angle)
    const x2 = cx + tickInner * sinDeg(angle)
    const y2 = cy - tickInner * cosDeg(angle)
    drawLine(ctx, x1, y1, x2, y2, TICK, isMajor ? 2 : 1)

    if (isMajor) {
      const labelR = innerR - size * 0.06
      const lx = cx + labelR * sinDeg(angle)
      const ly = cy - labelR * cosDeg(angle)
      const label = String(hour).padStart(2, "0")
      const fontSize = Math.max(9, Math.round(size * 0.055))
      const tw = fontSize * 1.4
      const th = fontSize * 1.2
      ctx.setFont(Font.mediumSystemFont(fontSize))
      ctx.setTextColor(HOUR_LABEL)
      ctx.setTextAlignedCenter()
      ctx.drawTextInRect(label, new Rect(lx - tw / 2, ly - th / 2, tw, th))
    }
  }

  // Current time hand
  const handLen = outerR - 2
  const hx = cx + handLen * sinDeg(nowAngle)
  const hy = cy - handLen * cosDeg(nowAngle)
  drawLine(ctx, cx, cy, hx, hy, NOW_HAND, 2.5)

  // Hub
  ctx.setFillColor(NOW_HAND)
  ctx.fillEllipse(new Rect(cx - 4, cy - 4, 8, 8))
  ctx.setFillColor(DIAL_BG)
  ctx.fillEllipse(new Rect(cx - 2, cy - 2, 4, 4))

  // Center time
  const timeText = formatClock(now)
  const timeSize = Math.round(size * 0.12)
  ctx.setFont(Font.boldSystemFont(timeSize))
  ctx.setTextColor(TEXT_PRIMARY)
  ctx.setTextAlignedCenter()
  ctx.drawTextInRect(timeText, new Rect(0, cy - timeSize * 0.35, size, timeSize))

  const sub = "24h"
  const subSize = Math.round(size * 0.05)
  ctx.setFont(Font.mediumSystemFont(subSize))
  ctx.setTextColor(TEXT_SECONDARY)
  ctx.drawTextInRect(sub, new Rect(0, cy + timeSize * 0.45, size, subSize + 2))

  return ctx.getImage()
}

function addEventLegend(stack, events, now, limit) {
  const upcoming = events
    .filter((e) => e.endDate > now)
    .slice(0, limit)

  if (upcoming.length === 0) {
    const empty = stack.addText("No more events")
    empty.font = Font.mediumSystemFont(12)
    empty.textColor = TEXT_SECONDARY
    return
  }

  upcoming.forEach((event, index) => {
    const row = stack.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    const dot = row.addStack()
    dot.size = new Size(8, 8)
    dot.cornerRadius = 4
    // Match color to full events list index when possible
    const fullIndex = events.indexOf(event)
    dot.backgroundColor = eventColor(event, fullIndex >= 0 ? fullIndex : index)

    row.addSpacer(6)

    const col = row.addStack()
    col.layoutVertically()

    const title = col.addText(event.title || "Untitled")
    title.font = Font.semiboldSystemFont(12)
    title.textColor = TEXT_PRIMARY
    title.lineLimit = 1

    const time = col.addText(formatHourRange(event.startDate, event.endDate))
    time.font = Font.regularSystemFont(10)
    time.textColor = TEXT_SECONDARY
    time.lineLimit = 1

    if (index < upcoming.length - 1) stack.addSpacer(8)
  })
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = WIDGET_BG
  widget.setPadding(12, 12, 12, 12)
  widget.url = "calshow://"

  const now = new Date()
  const events = await loadEvents()

  const dialSize =
    widgetFamily === "small" ? 150 : widgetFamily === "large" ? 280 : 170

  const dialImage = drawSectograph(dialSize, events, now)

  if (widgetFamily === "small") {
    widget.setPadding(8, 8, 8, 8)
    const img = widget.addImage(dialImage)
    img.imageSize = new Size(dialSize, dialSize)
    img.centerAlignImage()
  } else if (widgetFamily === "large") {
    const top = widget.addStack()
    top.layoutHorizontally()
    top.centerAlignContent()

    const titleCol = top.addStack()
    titleCol.layoutVertically()
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const heading = titleCol.addText(`${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}`)
    heading.font = Font.boldSystemFont(16)
    heading.textColor = TEXT_PRIMARY
    const sub = titleCol.addText("Sectograph · 24h")
    sub.font = Font.mediumSystemFont(11)
    sub.textColor = TEXT_SECONDARY

    top.addSpacer()

    const count = top.addText(`${events.length} events`)
    count.font = Font.mediumSystemFont(12)
    count.textColor = TEXT_SECONDARY

    widget.addSpacer(10)

    const body = widget.addStack()
    body.layoutHorizontally()
    body.centerAlignContent()

    const img = body.addImage(dialImage)
    img.imageSize = new Size(dialSize, dialSize)

    body.addSpacer(14)

    const legend = body.addStack()
    legend.layoutVertically()
    legend.size = new Size(120, dialSize)
    addEventLegend(legend, events, now, 7)
  } else {
    // medium
    const body = widget.addStack()
    body.layoutHorizontally()
    body.centerAlignContent()

    const img = body.addImage(dialImage)
    img.imageSize = new Size(dialSize, dialSize)

    body.addSpacer(12)

    const legend = body.addStack()
    legend.layoutVertically()
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const header = legend.addText(days[now.getDay()])
    header.font = Font.boldSystemFont(13)
    header.textColor = TEXT_PRIMARY
    const dateLine = legend.addText(
      `${now.getMonth() + 1}/${now.getDate()} · 24h`
    )
    dateLine.font = Font.mediumSystemFont(10)
    dateLine.textColor = TEXT_SECONDARY
    legend.addSpacer(10)
    addEventLegend(legend, events, now, 4)
  }

  return widget
}

const widget = await createWidget()

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  if (widgetFamily === "small") {
    await widget.presentSmall()
  } else if (widgetFamily === "large") {
    await widget.presentLarge()
  } else {
    await widget.presentMedium()
  }
}

Script.complete()
