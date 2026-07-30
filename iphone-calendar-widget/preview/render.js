// Local preview harness: stubs Scriptable APIs and renders the widget's
// DrawContext calls to an SVG so the dial layout can be inspected.
const fs = require("fs")
const path = require("path")

function hexOf(c) {
  return c && c.__hex ? c.__hex : "#000000"
}

class Color {
  constructor(hex, alpha) {
    let h = String(hex || "#000000").replace("#", "")
    if (h.length === 3) h = h.split("").map((x) => x + x).join("")
    this.__hex = "#" + h
    this.alpha = alpha === undefined ? 1 : alpha
    this.red = parseInt(h.slice(0, 2), 16) / 255
    this.green = parseInt(h.slice(2, 4), 16) / 255
    this.blue = parseInt(h.slice(4, 6), 16) / 255
  }
  static white() {
    return new Color("#FFFFFF", 1)
  }
}

class Size {
  constructor(w, h) {
    this.width = w
    this.height = h
  }
}
class Point {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}
class Rect {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.width = w
    this.height = h
  }
}

class Font {
  constructor(weight, size) {
    this.weight = weight
    this.size = size
  }
  static boldSystemFont(s) {
    return new Font(700, s)
  }
  static semiboldSystemFont(s) {
    return new Font(600, s)
  }
  static mediumSystemFont(s) {
    return new Font(500, s)
  }
  static regularSystemFont(s) {
    return new Font(400, s)
  }
}

class Path {
  constructor() {
    this.d = []
  }
  move(p) {
    this.d.push(`M ${p.x} ${p.y}`)
  }
  addLine(p) {
    this.d.push(`L ${p.x} ${p.y}`)
  }
  addCurve(p, c1, c2) {
    this.d.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p.x} ${p.y}`)
  }
  addQuadCurve(p, c) {
    this.d.push(`Q ${c.x} ${c.y} ${p.x} ${p.y}`)
  }
  closeSubpath() {
    this.d.push("Z")
  }
  toString() {
    return this.d.join(" ")
  }
}

class DrawContext {
  constructor() {
    this.size = new Size(200, 200)
    this.opaque = true
    this.respectScreenScale = true
    this.parts = []
    this._fill = new Color("#000000")
    this._stroke = new Color("#000000")
    this._lw = 1
    this._font = Font.regularSystemFont(12)
    this._textColor = new Color("#000000")
    this._align = "middle"
    this._path = null
  }
  setFillColor(c) {
    this._fill = c
  }
  setStrokeColor(c) {
    this._stroke = c
  }
  setLineWidth(w) {
    this._lw = w
  }
  setFont(f) {
    this._font = f
  }
  setTextColor(c) {
    this._textColor = c
  }
  setTextAlignedCenter() {
    this._align = "middle"
  }
  setTextAlignedLeft() {
    this._align = "start"
  }
  fillRect(r) {
    this.parts.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${hexOf(this._fill)}" fill-opacity="${this._fill.alpha}"/>`
    )
  }
  strokeRect(r) {
    this.parts.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="${hexOf(this._stroke)}" stroke-opacity="${this._stroke.alpha}" stroke-width="${this._lw}"/>`
    )
  }
  fillEllipse(r) {
    this.parts.push(
      `<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width / 2}" ry="${r.height / 2}" fill="${hexOf(this._fill)}" fill-opacity="${this._fill.alpha}"/>`
    )
  }
  strokeEllipse(r) {
    this.parts.push(
      `<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width / 2}" ry="${r.height / 2}" fill="none" stroke="${hexOf(this._stroke)}" stroke-opacity="${this._stroke.alpha}" stroke-width="${this._lw}"/>`
    )
  }
  addPath(p) {
    this._path = p
  }
  fillPath() {
    if (!this._path) return
    this.parts.push(
      `<path d="${this._path}" fill="${hexOf(this._fill)}" fill-opacity="${this._fill.alpha}"/>`
    )
    this._path = null
  }
  strokePath() {
    if (!this._path) return
    this.parts.push(
      `<path d="${this._path}" fill="none" stroke="${hexOf(this._stroke)}" stroke-opacity="${this._stroke.alpha}" stroke-width="${this._lw}"/>`
    )
    this._path = null
  }
  drawTextInRect(text, r) {
    const x = this._align === "middle" ? r.x + r.width / 2 : r.x
    const y = r.y + r.height / 2 + this._font.size * 0.36
    const esc = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
    this.parts.push(
      `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${this._font.size}" font-weight="${this._font.weight}" fill="${hexOf(this._textColor)}" fill-opacity="${this._textColor.alpha}" text-anchor="${this._align}">${esc}</text>`
    )
  }
  getImage() {
    return {
      __svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${this.size.width}" height="${this.size.height}" viewBox="0 0 ${this.size.width} ${this.size.height}">${this.parts.join("")}</svg>`,
      size: this.size,
    }
  }
}

// ——— widget UI stubs (we only need images out) ———
const images = []
class WidgetStack {
  constructor() {
    this.children = []
  }
  addStack() {
    const s = new WidgetStack()
    this.children.push(s)
    return s
  }
  addText(t) {
    const o = {
      text: t,
      centerAlignText() {},
      leftAlignText() {},
      rightAlignText() {},
    }
    this.children.push(o)
    return o
  }
  addImage(img) {
    images.push(img)
    return {
      centerAlignImage() {},
      leftAlignImage() {},
      applyFittingContentMode() {},
      applyFillingContentMode() {},
    }
  }
  addSpacer() {}
  layoutHorizontally() {}
  layoutVertically() {}
  centerAlignContent() {}
  topAlignContent() {}
  setPadding() {}
}
class ListWidget extends WidgetStack {
  constructor() {
    super()
    this.backgroundColor = null
  }
  async presentSmall() {}
  async presentMedium() {}
  async presentLarge() {}
}

// ——— data stubs ———
function at(h, m) {
  const d = new Date(2026, 6, 29, h, m, 0, 0)
  return d
}
const NOW = at(14, 47)

class CalendarEvent {
  constructor(title, sh, sm, eh, em) {
    this.title = title
    this.startDate = at(sh, sm)
    this.endDate = at(eh, em)
    this.isAllDay = false
    this.identifier = title
    this.calendar = { color: new Color("#3B82F6") }
  }
  static async between() {
    return [
      new CalendarEvent("Breakfast with Mom", 9, 0, 10, 0),
      new CalendarEvent("Collect the mail", 10, 0, 12, 0),
      new CalendarEvent("Revisar instrucciones de chequeo oncológico", 13, 30, 15, 30),
      new CalendarEvent("Meeting", 18, 0, 19, 0),
    ]
  }
}

class Reminder {
  constructor(title, dueH, dueM, opts) {
    const o = opts || {}
    this.title = title
    this.identifier = "r-" + title
    this.isCompleted = !!o.done
    if (dueH === null) {
      this.dueDate = null
      this.dueDateIncludesTime = false
    } else {
      this.dueDate = at(dueH, dueM)
      this.dueDateIncludesTime = o.timed !== false
    }
    this.completionDate = o.done ? NOW : null
    this.calendar = { color: new Color("#FF6BAF") }
  }
  static async allIncomplete() {
    return [
      new Reminder("Water the plants", null, null),
      new Reminder("Call the clinic", 11, 0),
      new Reminder("Pick up laundry", 17, 30),
      new Reminder("Stretch", null, null),
      new Reminder("Pay the bill", 8, 0),
    ]
  }
  static async allCompleted() {
    return [new Reminder("Vitamins", 7, 30, { done: true })]
  }
  save() {}
}

const [screenW, screenH] = (process.env.SCREEN || "393x852").split("x").map(Number)
const Device = {
  screenSize: () => new Size(screenW, screenH),
  isPad: () => Math.min(screenW, screenH) >= 700,
}
const config = { widgetFamily: process.env.FAMILY || "large", runsInWidget: false }
const args = { widgetParameter: process.env.THEME || "kawaii", queryParameters: {} }
const Script = { name: () => "Sectograph 24h", setWidget() {}, complete() {} }

const source = fs.readFileSync(
  path.join(__dirname, "..", "CalendarWidget.js"),
  "utf8"
)

const runner = new Function(
  "Color,Size,Point,Rect,Font,Path,DrawContext,ListWidget,CalendarEvent,Reminder,config,args,Script,Device,Date",
  `return (async () => { ${source} })()`
)

class FixedDate extends Date {
  constructor(...a) {
    if (a.length === 0) super(NOW.getTime())
    else super(...a)
  }
  static now() {
    return NOW.getTime()
  }
}

runner(
  Color,
  Size,
  Point,
  Rect,
  Font,
  Path,
  DrawContext,
  ListWidget,
  CalendarEvent,
  Reminder,
  config,
  args,
  Script,
  Device,
  FixedDate
)
  .then(() => {
    const dial = images.find((i) => i.size.width > 100)
    if (!dial) throw new Error("no dial image rendered")
    const out = path.join(
      __dirname,
      `dial-${args.widgetParameter}-${config.widgetFamily}.svg`
    )
    fs.writeFileSync(out, dial.__svg)
    console.log("wrote", out)
  })
  .catch((err) => {
    console.error("RENDER FAILED:", err)
    process.exit(1)
  })
