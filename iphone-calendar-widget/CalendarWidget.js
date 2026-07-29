// ============================================================
// SECTOGRAPH 24H — v3 (classic + kawaii magical girl)
//
// THEME: change THEME below, OR set Widget Parameter in
// Edit Widget to:  classic  |  kawaii
//
// Fresh install tip: name this script "Sectograph 24h", paste
// ALL of this file, Save, Play — you should see a circular dial.
// ============================================================

// "classic" = dark 24h dial | "kawaii" = magical girl + pixel hearts
const THEME = "kawaii"

const family = config.widgetFamily || "medium"
const DAY_MIN = 24 * 60

function resolveTheme() {
  const param = (args.widgetParameter || "").trim().toLowerCase()
  if (param === "classic" || param === "kawaii") return param
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
    brandText: "SECTOGRAPH",
    subtitle: "24-hour clock",
    freeText: "Free rest of day",
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
    sparkles: false,
    pixelHearts: false,
    heartHand: false,
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
    sparkles: true,
    pixelHearts: true,
    heartHand: true,
  },
}

const T = themes[resolveTheme()]

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
    if (!T.pixelHearts && event.calendar && event.calendar.color) {
      return event.calendar.color
    }
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

/** Classic 8-bit heart bitmap (7x6). */
const HEART_PX = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
]

function drawPixelHeart(ctx, x, y, pixel, color, outline) {
  const rows = HEART_PX.length
  const cols = HEART_PX[0].length
  if (outline) {
    ctx.setFillColor(outline)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!HEART_PX[r][c]) continue
        ctx.fillRect(
          new Rect(x + (c - 0.2) * pixel, y + (r - 0.2) * pixel, pixel * 1.4, pixel * 1.4)
        )
      }
    }
  }
  ctx.setFillColor(color)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!HEART_PX[r][c]) continue
      ctx.fillRect(new Rect(x + c * pixel, y + r * pixel, pixel, pixel))
    }
  }
}

function pixelHeartImage(color, scale) {
  const pixel = scale || 3
  const pad = 1
  const w = HEART_PX[0].length * pixel + pad * 2
  const h = HEART_PX.length * pixel + pad * 2
  const ctx = new DrawContext()
  ctx.size = new Size(w, h)
  ctx.opaque = false
  ctx.respectScreenScale = true
  drawPixelHeart(ctx, pad, pad, pixel, color, new Color("#FFFFFF", 0.85))
  // shine pixel
  ctx.setFillColor(new Color("#FFFFFF", 0.9))
  ctx.fillRect(new Rect(pad + pixel, pad + pixel, pixel, pixel))
  return { image: ctx.getImage(), size: new Size(w, h) }
}

function drawSparkle(ctx, x, y, size, color) {
  drawLine(ctx, x - size, y, x + size, y, color, 1.5)
  drawLine(ctx, x, y - size, x, y + size, color, 1.5)
  const d = size * 0.55
  drawLine(ctx, x - d, y - d, x + d, y + d, withAlpha(color, 0.7), 1)
  drawLine(ctx, x - d, y + d, x + d, y - d, withAlpha(color, 0.7), 1)
}

function drawDial(size, timed, dayStart, dayEnd, now) {
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47

  // Soft outer glow ring for kawaii
  if (T.sparkles) {
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
    const c = colorFor(event, i)
    fillWedge(ctx, cx, cy, R * 0.88, a0, a1, withAlpha(c, T.sparkles ? 0.45 : 0.55))
    strokeArc(ctx, cx, cy, R * 0.93, size * 0.07, a0, a1, c)

    // Pixel heart at the midpoint of each event arc
    if (T.pixelHearts) {
      const mid = (a0 + a1) / 2
      const hr = R * 0.93
      const px = Math.max(2, Math.round(size * 0.012))
      const hx = cx + hr * sin(mid) - (HEART_PX[0].length * px) / 2
      const hy = cy - hr * cos(mid) - (HEART_PX.length * px) / 2
      drawPixelHeart(ctx, hx, hy, px, c, new Color("#FFFFFF", 0.95))
    }
  })

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
      T.label,
      major ? 2 : 1
    )
    if (major) {
      const lr = R * 0.66
      const fs = Math.max(9, Math.round(size * 0.05))
      ctx.setFont(Font.mediumSystemFont(fs))
      ctx.setTextColor(T.label)
      ctx.setTextAlignedCenter()
      ctx.drawTextInRect(
        String(h).padStart(2, "0"),
        new Rect(cx + lr * sin(a) - fs, cy - lr * cos(a) - fs * 0.55, fs * 2, fs * 1.2)
      )
    }
  }

  if (T.sparkles) {
    const sparkColors = [new Color("#FF80B5"), new Color("#C4B5FD"), new Color("#7DD3FC")]
    ;[25, 70, 130, 200, 250, 310].forEach((a, i) => {
      const sr = R * 0.5
      drawSparkle(
        ctx,
        cx + sr * sin(a),
        cy - sr * cos(a),
        size * 0.025,
        sparkColors[i % sparkColors.length]
      )
    })
  }

  // Now hand (heart tip in kawaii mode)
  const handR = R * 0.97
  const tipX = cx + handR * sin(nowA)
  const tipY = cy - handR * cos(nowA)
  drawLine(ctx, cx, cy, tipX, tipY, T.hand, T.heartHand ? 2.5 : 3)
  if (T.heartHand) {
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
  if (T.sparkles) {
    ctx.setStrokeColor(new Color("#FF8FBF", 0.8))
    ctx.setLineWidth(2)
    ctx.strokeEllipse(new Rect(cx - hubR, cy - hubR, hubR * 2, hubR * 2))
  }

  const timeStr = hhmm(now)
  const tSize = Math.round(size * 0.11)
  ctx.setFont(Font.boldSystemFont(tSize))
  ctx.setTextColor(T.title)
  ctx.setTextAlignedCenter()
  ctx.drawTextInRect(timeStr, new Rect(0, cy - tSize * 0.55, size, tSize))

  const tagSize = Math.max(8, Math.round(size * 0.045))
  ctx.setFont(Font.boldSystemFont(tagSize))
  ctx.setTextColor(T.hand)
  ctx.drawTextInRect(T.centerTag, new Rect(0, cy + tSize * 0.35, size, tagSize + 2))

  return ctx.getImage()
}

function addLegend(stack, timed, now, limit) {
  const upcoming = timed.filter((e) => e.endDate > now).slice(0, limit)
  if (upcoming.length === 0) {
    const t = stack.addText(T.freeText)
    t.font = Font.mediumSystemFont(12)
    t.textColor = T.muted
    return
  }
  upcoming.forEach((event, i) => {
    const row = stack.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    const idx = timed.indexOf(event)
    const c = colorFor(event, idx >= 0 ? idx : i)

    if (T.pixelHearts) {
      const heart = pixelHeartImage(c, 3)
      const img = row.addImage(heart.image)
      img.imageSize = heart.size
    } else {
      const swatch = row.addStack()
      swatch.size = new Size(8, 8)
      swatch.cornerRadius = 4
      swatch.backgroundColor = c
    }

    row.addSpacer(6)
    const col = row.addStack()
    col.layoutVertically()
    const title = col.addText(event.title || "Untitled")
    title.font = Font.semiboldSystemFont(12)
    title.textColor = T.title
    title.lineLimit = 1
    const meta = col.addText(`${hhmm(event.startDate)}–${hhmm(event.endDate)}`)
    meta.font = Font.regularSystemFont(10)
    meta.textColor = T.muted
    meta.lineLimit = 1
    if (i < upcoming.length - 1) stack.addSpacer(7)
  })
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = T.bg
  widget.setPadding(10, 10, 10, 10)
  widget.url = "calshow://"

  const now = new Date()
  const { start, end, timed, allDay } = await loadDayEvents(now)
  const dialSize = family === "small" ? 155 : family === "large" ? 270 : 168
  const dial = drawDial(dialSize, timed, start, end, now)

  if (family !== "small") {
    const head = widget.addStack()
    head.layoutHorizontally()
    head.centerAlignContent()
    const brand = head.addText(T.brandText)
    brand.font = Font.boldSystemFont(T.sparkles ? 10 : 11)
    brand.textColor = T.brand
    if (!T.sparkles) {
      head.addSpacer(6)
      const sub = head.addText(T.subtitle)
      sub.font = Font.mediumSystemFont(11)
      sub.textColor = T.muted
    }
    head.addSpacer()
    if (allDay.length > 0) {
      const label = T.pixelHearts
        ? `♡ ${allDay.length} all-day`
        : `All-day: ${allDay.length}`
      const ad = head.addText(label)
      ad.font = Font.mediumSystemFont(10)
      ad.textColor = T.muted
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
    const h = side.addText(
      T.pixelHearts
        ? `♡ ${days[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}`
        : `${days[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}`
    )
    h.font = Font.boldSystemFont(15)
    h.textColor = T.title
    if (T.sparkles) {
      const quest = side.addText("today's quests")
      quest.font = Font.mediumSystemFont(10)
      quest.textColor = T.muted
    }
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
    if (T.sparkles) {
      const quest = side.addText("today's quests")
      quest.font = Font.boldSystemFont(11)
      quest.textColor = T.title
      side.addSpacer(6)
    }
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
