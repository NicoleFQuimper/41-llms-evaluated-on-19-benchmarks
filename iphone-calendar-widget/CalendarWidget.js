// Calendar Widget for Scriptable (iPhone)
// Shows today's upcoming events on your Home Screen.
//
// Setup:
// 1. Install "Scriptable" from the App Store
// 2. Create a new script, paste this file's contents
// 3. Name it "Calendar Widget"
// 4. Long-press Home Screen → + → Scriptable → choose size → select this script
// 5. Allow Calendar access when prompted

const WIDGET_BG = new Color("#0F1419")
const ACCENT = new Color("#3D9CF0")
const TEXT_PRIMARY = new Color("#F2F4F7")
const TEXT_SECONDARY = new Color("#8B95A5")
const widgetFamily = config.widgetFamily || "medium"
const maxEvents = widgetFamily === "small" ? 3 : widgetFamily === "large" ? 8 : 5

async function loadEvents() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const events = await CalendarEvent.between(start, end)
  const now = new Date()

  return events
    .filter((event) => !event.isAllDay || event.startDate <= end)
    .filter((event) => event.isAllDay || event.endDate > now)
    .sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
      return a.startDate - b.startDate
    })
    .slice(0, maxEvents)
}

function formatTime(date) {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  const minute = m < 10 ? `0${m}` : `${m}`
  return `${hour}:${minute} ${ampm}`
}

function formatDayHeader(date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return {
    weekday: days[date.getDay()],
    monthDay: `${months[date.getMonth()]} ${date.getDate()}`,
  }
}

function eventColor(event) {
  try {
    if (event.calendar && event.calendar.color) {
      return event.calendar.color
    }
  } catch (_) {}
  return ACCENT
}

function addHeader(widget) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()

  const day = formatDayHeader(new Date())

  const left = header.addStack()
  left.layoutVertically()

  const weekday = left.addText(day.weekday)
  weekday.font = Font.boldSystemFont(widgetFamily === "small" ? 13 : 15)
  weekday.textColor = TEXT_PRIMARY

  if (widgetFamily !== "small") {
    const monthDay = left.addText(day.monthDay)
    monthDay.font = Font.mediumSystemFont(12)
    monthDay.textColor = TEXT_SECONDARY
  }

  header.addSpacer()

  const badge = header.addStack()
  badge.backgroundColor = ACCENT
  badge.cornerRadius = 8
  badge.setPadding(4, 8, 4, 8)

  const dayNum = badge.addText(String(new Date().getDate()))
  dayNum.font = Font.boldSystemFont(14)
  dayNum.textColor = Color.white()

  widget.addSpacer(10)
}

function addEmptyState(widget) {
  widget.addSpacer()
  const empty = widget.addText("No more events today")
  empty.font = Font.mediumSystemFont(13)
  empty.textColor = TEXT_SECONDARY
  empty.centerAlignText()
  widget.addSpacer()
}

function addEventRow(widget, event, isLast) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const stripe = row.addStack()
  stripe.size = new Size(3, widgetFamily === "small" ? 28 : 34)
  stripe.backgroundColor = eventColor(event)
  stripe.cornerRadius = 2

  row.addSpacer(8)

  const content = row.addStack()
  content.layoutVertically()

  const title = content.addText(event.title || "Untitled")
  title.font = Font.semiboldSystemFont(widgetFamily === "small" ? 12 : 13)
  title.textColor = TEXT_PRIMARY
  title.lineLimit = 1

  const meta = content.addText(
    event.isAllDay
      ? "All day"
      : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`
  )
  meta.font = Font.regularSystemFont(11)
  meta.textColor = TEXT_SECONDARY
  meta.lineLimit = 1

  if (event.location && widgetFamily !== "small") {
    const loc = content.addText(event.location)
    loc.font = Font.regularSystemFont(10)
    loc.textColor = TEXT_SECONDARY
    loc.lineLimit = 1
  }

  if (!isLast) {
    widget.addSpacer(8)
  }
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = WIDGET_BG
  widget.setPadding(14, 14, 14, 14)
  widget.url = "calshow://"

  addHeader(widget)

  const events = await loadEvents()

  if (events.length === 0) {
    addEmptyState(widget)
  } else {
    events.forEach((event, index) => {
      addEventRow(widget, event, index === events.length - 1)
    })
    if (widgetFamily === "large" || events.length < maxEvents) {
      widget.addSpacer()
    }
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
