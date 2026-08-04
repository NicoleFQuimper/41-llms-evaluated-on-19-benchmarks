// 24h sectograph dial, drawn on a canvas. Port of the Scriptable widget's
// DrawContext version, so both stay visually identical.

const DAY_MIN = 24 * 60

export const HEART_PX = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
]

export const BABY_BLUE = "#a8d8ff" // timed tasks due today
export const CUTE_PURPLE = "#c084fc" // timed tasks that are overdue
export const KAWAII_PINK = "#ff8fbf" // untimed tasks (never overdue)

export const THEMES = {
  kawaii: {
    kawaii: true,
    bg: "#fff0f7",
    dial: "#ffe4f2",
    track: "#f9c2e0",
    past: "rgba(243, 208, 232, 0.65)",
    night: "rgba(232, 217, 255, 0.55)",
    hand: "#ff4d8d",
    hub: "#fff9fc",
    hubFill: "rgba(255, 247, 251, 0.95)",
    label: "#c45b8c",
    title: "#6b2d5b",
    muted: "#b07a9a",
    brand: "#ff4d8d",
    done: "#d4a5be",
    halo: "rgba(255, 255, 255, 0.92)",
    palette: [
      "#ff6baf",
      "#c084fc",
      "#7dd3fc",
      "#f9a8d4",
      "#a78bfa",
      "#fb7185",
      "#86efac",
    ],
  },
  classic: {
    kawaii: false,
    bg: "#0a0c10",
    dial: "#141820",
    track: "#252b36",
    past: "#1c2430",
    night: "rgba(13, 17, 24, 0.85)",
    hand: "#ff3b30",
    hub: "#ffffff",
    hubFill: "rgba(10, 12, 16, 0.92)",
    label: "#9aa3b2",
    title: "#f4f6f8",
    muted: "#7e8796",
    brand: "#ff3b30",
    done: "#4b5563",
    halo: "rgba(5, 7, 11, 0.92)",
    palette: [
      "#3b82f6",
      "#22c55e",
      "#eab308",
      "#a855f7",
      "#f43f5e",
      "#06b6d4",
    ],
  },
}

const rad = (deg) => (deg * Math.PI) / 180
const sin = (deg) => Math.sin(rad(deg))
const cos = (deg) => Math.cos(rad(deg))

export function minsOf(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}
const ang = (mins) => (mins / DAY_MIN) * 360

export function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`
}

export function withAlpha(color, alpha) {
  const hex = color.replace("#", "")
  if (hex.length !== 6) return color
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function wedge(ctx, cx, cy, radius, a0, a1, color) {
  if (a1 <= a0) return
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, radius, rad(a0 - 90), rad(a1 - 90))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function arc(ctx, cx, cy, radius, thickness, a0, a1, color) {
  if (a1 <= a0) return
  ctx.beginPath()
  ctx.arc(cx, cy, radius, rad(a0 - 90), rad(a1 - 90))
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.lineCap = "butt"
  ctx.stroke()
}

function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

export function pixelHeart(ctx, x, y, pixel, fill, outline) {
  if (outline) {
    ctx.fillStyle = outline
    HEART_PX.forEach((row, r) =>
      row.forEach((on, c) => {
        if (!on) return
        ctx.fillRect(
          x + (c - 0.15) * pixel,
          y + (r - 0.15) * pixel,
          pixel * 1.3,
          pixel * 1.3
        )
      })
    )
  }
  ctx.fillStyle = fill
  HEART_PX.forEach((row, r) =>
    row.forEach((on, c) => {
      if (!on) return
      ctx.fillRect(x + c * pixel, y + r * pixel, pixel, pixel)
    })
  )
}

function sparkle(ctx, x, y, size, color) {
  line(ctx, x - size, y, x + size, y, color, 1.5)
  line(ctx, x, y - size, x, y + size, color, 1.5)
}

/** Dial angle (degrees, 0 = midnight at the top, clockwise) of a point. */
function angleOfPoint(px, py, cx, cy) {
  const a = (Math.atan2(px - cx, cy - py) * 180) / Math.PI
  return a < 0 ? a + 360 : a
}

/** Is a point inside the wedge, clear of the hub and inside the dial? */
function pointInSector(px, py, geo) {
  const dx = px - geo.cx
  const dy = py - geo.cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > geo.outerR || dist < geo.hubR) return false
  const a = angleOfPoint(px, py, geo.cx, geo.cy)
  return geo.a1 <= 360
    ? a >= geo.a0 && a <= geo.a1
    : a >= geo.a0 || a <= geo.a1 - 360
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

function wrapIntoRows(words, rows, measure) {
  const queue = words.slice()
  const lines = []
  const widest = Math.max(0, ...rows.map((row) => row.w))
  let hyphens = 0
  for (const row of rows) {
    if (!queue.length) break
    if (row.w < 8) {
      lines.push(null)
      continue
    }
    let text = ""
    while (queue.length) {
      const next = text ? `${text} ${queue[0]}` : queue[0]
      if (measure(next) <= row.w) {
        text = next
        queue.shift()
        continue
      }
      // Only hyphenate a word that will not fit on any row of this block;
      // otherwise leave the row empty and let a wider row take it.
      if (!text && measure(queue[0]) > widest) {
        let cut = queue[0].length - 1
        while (cut > 1 && measure(`${queue[0].slice(0, cut)}-`) > row.w) cut--
        if (cut > 1) {
          text = `${queue[0].slice(0, cut)}-`
          queue[0] = queue[0].slice(cut)
          hyphens++
        }
      }
      break
    }
    lines.push(text || null)
  }
  return { lines, remaining: queue, hyphens }
}

/**
 * Flow a title inside a wedge: rows stack along the sector's mid-ray and
 * every row is clipped to the width the wedge actually offers, so text never
 * spills outside its own sector.
 */
function layoutSectorText(title, fontSize, anchorR, geo, measure) {
  const lineH = fontSize * 1.16
  const words = String(title || "Event").trim().replace(/\s+/g, " ").split(" ")
  const ax = geo.cx + anchorR * sin(geo.mid)
  const ay = geo.cy - anchorR * cos(geo.mid)
  const maxLines = Math.max(1, Math.min(6, Math.floor((geo.outerR * 1.4) / lineH)))

  // Rows step along the sector itself, so a diagonal wedge gets diagonal rows
  // while still reading top to bottom.
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
    const { lines, remaining, hyphens } = wrapIntoRows(words, rows, measure)
    const placed = lines
      .map((text, i) =>
        text ? { text, x: rows[i].x, y: rows[i].top, w: rows[i].w } : null
      )
      .filter(Boolean)
    if (!placed.length) continue
    result = { lines: placed, lineH, remaining: remaining.length, hyphens }
    if (!remaining.length) {
      if (!hyphens) return result
      if (!complete) complete = result
    }
  }
  return complete || result
}

function drawSectorTitle(ctx, sec, cx, cy, R, size, T) {
  const hubR = size * 0.155 + size * 0.012
  const geo = {
    cx,
    cy,
    mid: (sec.a0 + sec.a1) / 2,
    a0: sec.a0,
    a1: sec.a1,
    hubR,
    outerR: R * 0.9, // matches the painted wedge radius
  }
  if (geo.outerR <= geo.hubR) return

  const maxFs = Math.min(sec.isCurrent ? 22 : 20, Math.round(size * 0.055))
  const minFs = 5.5 // flat floor: narrow sectors need small type even when huge
  const anchors = [0.68, 0.78, 0.58, 0.88, 0.48].map((f) => R * f)
  const weight = sec.isCurrent ? 700 : 600
  const measurer = (fs) => {
    ctx.font = `${weight} ${fs}px ${FONT_STACK}`
    return (text) => ctx.measureText(text).width
  }

  let fallback = null
  let fallbackScore = -Infinity
  const search = (accept) => {
    for (let fs = maxFs; fs >= minFs; fs -= 0.5) {
      const measure = measurer(fs)
      for (const anchorR of anchors) {
        if (anchorR <= geo.hubR || anchorR >= geo.outerR) continue
        const attempt = layoutSectorText(sec.title, fs, anchorR, geo, measure)
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

  const best =
    search((a) => !a.remaining && !a.hyphens) ||
    search((a) => !a.remaining) ||
    fallback
  if (!best || !best.lines.length) return
  if (best.remaining) {
    const last = best.lines[best.lines.length - 1]
    last.text = `${last.text.replace(/[\s\-…]+$/, "")}…`
  }

  ctx.font = `${weight} ${best.fs}px ${FONT_STACK}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.lineJoin = "round"
  ctx.lineWidth = Math.max(1.4, best.fs * 0.3)
  ctx.strokeStyle = T.halo
  ctx.fillStyle = T.title
  best.lines.forEach((l) => {
    const x = l.x + l.w / 2
    const y = l.y + best.lineH / 2
    ctx.strokeText(l.text, x, y)
    ctx.fillText(l.text, x, y)
  })
}

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif'

/**
 * Paint the whole dial. Returns the sectors that were drawn, so a tap on the
 * canvas can be matched back to the event under it.
 */
export function drawDial(ctx, size, { events, tasks, now, theme }) {
  const T = THEMES[theme] || THEMES.kawaii
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47

  ctx.clearRect(0, 0, size, size)

  if (T.kawaii) {
    ctx.fillStyle = "rgba(255, 183, 222, 0.35)"
    ctx.beginPath()
    ctx.arc(cx, cy, R + 4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = T.dial
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  wedge(ctx, cx, cy, R * 0.98, 0, 90, T.night)
  wedge(ctx, cx, cy, R * 0.98, 270, 360, T.night)

  ctx.strokeStyle = T.track
  ctx.lineWidth = size * 0.02
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2)
  ctx.stroke()

  const nowA = ang(minsOf(now))
  wedge(ctx, cx, cy, R * 0.9, 0, nowA, T.past)

  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const sectors = []
  events.forEach((event, i) => {
    const s = event.start < dayStart ? dayStart : event.start
    const e = event.end > dayEnd ? dayEnd : event.end
    if (e <= s) return
    const a0 = ang(minsOf(s))
    let a1 = e.getTime() >= dayEnd.getTime() ? 360 : ang(minsOf(e))
    if (a1 - a0 < 3) a1 = a0 + 3
    const color = event.color || T.palette[i % T.palette.length]
    wedge(ctx, cx, cy, R * 0.88, a0, a1, withAlpha(color, T.kawaii ? 0.4 : 0.55))
    arc(ctx, cx, cy, R * 0.93, size * 0.07, a0, a1, color)
    sectors.push({
      id: event.id,
      title: event.title || "Event",
      a0,
      a1,
      isCurrent: now >= event.start && now < event.end,
      color,
    })
  })

  // Timed tasks: one pixel heart at their start time, colour by urgency
  tasks.forEach((task) => {
    if (!task.due || !task.hasTime) return
    const due = new Date(task.due)
    if (due < dayStart || due >= dayEnd) return
    const a = ang(minsOf(due))
    const px = Math.max(2, Math.round(size * 0.015))
    const hr = R * 0.93
    const base = task.done
      ? BABY_BLUE
      : due < now
        ? CUTE_PURPLE
        : BABY_BLUE
    pixelHeart(
      ctx,
      cx + hr * sin(a) - (HEART_PX[0].length * px) / 2,
      cy - hr * cos(a) - (HEART_PX.length * px) / 2,
      px,
      task.done ? withAlpha(base, 0.45) : base,
      "#ffffff"
    )
  })

  for (let h = 0; h < 24; h++) {
    const a = ang(h * 60)
    const major = h % 3 === 0
    line(
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
      ctx.font = `500 ${fs}px ${FONT_STACK}`
      ctx.fillStyle = T.label
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(String(h).padStart(2, "0"), cx + lr * sin(a), cy - lr * cos(a))
    }
  }

  if (T.kawaii) {
    const colors = ["#ff80b5", "#c4b5fd", "#7dd3fc"]
    ;[30, 100, 170, 240, 300].forEach((a, i) => {
      sparkle(
        ctx,
        cx + R * 0.5 * sin(a),
        cy - R * 0.5 * cos(a),
        size * 0.022,
        colors[i % 3]
      )
    })
  }

  const tipX = cx + R * 0.97 * sin(nowA)
  const tipY = cy - R * 0.97 * cos(nowA)
  line(ctx, cx, cy, tipX, tipY, T.hand, 2.5)
  if (T.kawaii) {
    const px = Math.max(2, Math.round(size * 0.014))
    pixelHeart(
      ctx,
      tipX - (HEART_PX[0].length * px) / 2,
      tipY - (HEART_PX.length * px) / 2,
      px,
      T.hand,
      "#ffffff"
    )
  } else {
    ctx.fillStyle = T.hand
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = T.hub
    ctx.beginPath()
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const hubR = size * 0.16
  ctx.fillStyle = T.hubFill
  ctx.beginPath()
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2)
  ctx.fill()
  if (T.kawaii) {
    ctx.strokeStyle = "rgba(255, 143, 191, 0.8)"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const tSize = Math.round(size * 0.11)
  ctx.font = `700 ${tSize}px ${FONT_STACK}`
  ctx.fillStyle = T.title
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(hhmm(now), cx, cy - tSize * 0.05)

  const tagSize = Math.max(8, Math.round(size * 0.045))
  ctx.font = `700 ${tagSize}px ${FONT_STACK}`
  ctx.fillStyle = T.hand
  ctx.fillText(T.kawaii ? "♡ 24H" : "24H", cx, cy + tSize * 0.62)

  // Event names last, so they sit above every other piece of dial art
  sectors
    .slice()
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? 1 : -1))
    .forEach((sec) => drawSectorTitle(ctx, sec, cx, cy, R, size, T))

  return sectors
}

/** Which drawn sector, if any, sits under a point on the canvas. */
export function sectorAt(sectors, x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.47
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > R * 0.96 || dist < size * 0.17) return null
  const a = angleOfPoint(x, y, cx, cy)
  return (
    sectors.find((s) =>
      s.a1 <= 360 ? a >= s.a0 && a <= s.a1 : a >= s.a0 || a <= s.a1 - 360
    ) || null
  )
}
