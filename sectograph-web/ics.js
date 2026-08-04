// Minimal iCalendar reader: enough to put a real calendar on the dial.
// Supports VEVENT with DTSTART/DTEND/DURATION, all-day events, EXDATE and the
// common RRULE shapes (daily, weekly with BYDAY, monthly, yearly).

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "")
}

function parseParams(raw) {
  const params = {}
  raw.split(";").forEach((part, i) => {
    if (i === 0) return
    const [key, value] = part.split("=")
    if (key) params[key.toUpperCase()] = (value || "").replace(/"/g, "")
  })
  return params
}

/** ICS date/time → JS Date. Floating and TZID times are read as local time. */
function parseDate(value, params) {
  const v = (value || "").trim()
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    return { date: new Date(+y, +m - 1, +d), allDay: true }
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v)
  if (!dateTime) return null
  const [, y, m, d, hh, mm, ss, utc] = dateTime
  const allDay = (params.VALUE || "").toUpperCase() === "DATE"
  if (utc) {
    return { date: new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss)), allDay }
  }
  return { date: new Date(+y, +m - 1, +d, +hh, +mm, +ss), allDay }
}

/** "PT1H30M" / "P1D" → milliseconds. */
function parseDuration(value) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    (value || "").trim()
  )
  if (!m) return 0
  const [, w, d, h, mi, s] = m.map((x) => (x === undefined ? 0 : x))
  return (
    (+w * 7 + +d) * DAY_MS + (+h * 3600 + +mi * 60 + +s) * 1000
  )
}

function parseRule(value) {
  const rule = {}
  ;(value || "").split(";").forEach((part) => {
    const [key, val] = part.split("=")
    if (key) rule[key.toUpperCase()] = val
  })
  const parsed = {
    freq: (rule.FREQ || "").toUpperCase(),
    interval: Math.max(1, parseInt(rule.INTERVAL || "1", 10) || 1),
    count: rule.COUNT ? parseInt(rule.COUNT, 10) : null,
    until: null,
    byDay: rule.BYDAY
      ? rule.BYDAY.split(",").map((d) => d.replace(/^[-+]?\d+/, "").toUpperCase())
      : null,
    byMonthDay: rule.BYMONTHDAY
      ? rule.BYMONTHDAY.split(",").map((d) => parseInt(d, 10))
      : null,
  }
  if (rule.UNTIL) {
    const until = parseDate(rule.UNTIL, {})
    if (until) parsed.until = until.date
  }
  return parsed.freq ? parsed : null
}

export function parseICS(text) {
  const lines = unfold(String(text || "")).split("\n")
  const events = []
  let current = null

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (trimmed === "BEGIN:VEVENT") {
      current = { exdates: [] }
      continue
    }
    if (trimmed === "END:VEVENT") {
      if (current && current.start) {
        if (!current.end) {
          current.end = current.duration
            ? new Date(current.start.getTime() + current.duration)
            : new Date(current.start.getTime() + (current.allDay ? DAY_MS : 3600000))
        }
        events.push(current)
      }
      current = null
      continue
    }
    if (!current) continue

    const colon = trimmed.indexOf(":")
    if (colon < 0) continue
    const head = trimmed.slice(0, colon)
    const value = trimmed.slice(colon + 1)
    const name = head.split(";")[0].toUpperCase()
    const params = parseParams(head)

    if (name === "SUMMARY") current.title = value.replace(/\\([,;n])/g, (_, c) => (c === "n" ? "\n" : c))
    else if (name === "UID") current.uid = value
    else if (name === "DTSTART") {
      const parsed = parseDate(value, params)
      if (parsed) {
        current.start = parsed.date
        current.allDay = parsed.allDay
      }
    } else if (name === "DTEND") {
      const parsed = parseDate(value, params)
      if (parsed) current.end = parsed.date
    } else if (name === "DURATION") current.duration = parseDuration(value)
    else if (name === "RRULE") current.rrule = parseRule(value)
    else if (name === "EXDATE") {
      value.split(",").forEach((part) => {
        const parsed = parseDate(part, params)
        if (parsed) current.exdates.push(parsed.date.getTime())
      })
    } else if (name === "STATUS" && value.toUpperCase() === "CANCELLED") {
      current.cancelled = true
    }
  }

  return events.filter((e) => !e.cancelled && !e.allDay)
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const daysBetween = (a, b) =>
  Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)

/** How many occurrences precede this one, for honouring COUNT. */
function occurrenceIndex(rule, start, candidate) {
  switch (rule.freq) {
    case "DAILY":
      return Math.floor(daysBetween(start, candidate) / rule.interval)
    case "WEEKLY": {
      const weeks = Math.floor(daysBetween(start, candidate) / 7)
      const perWeek = rule.byDay ? rule.byDay.length : 1
      return Math.floor(weeks / rule.interval) * perWeek
    }
    case "MONTHLY": {
      const months =
        (candidate.getFullYear() - start.getFullYear()) * 12 +
        (candidate.getMonth() - start.getMonth())
      return Math.floor(months / rule.interval)
    }
    case "YEARLY":
      return Math.floor(
        (candidate.getFullYear() - start.getFullYear()) / rule.interval
      )
    default:
      return 0
  }
}

function ruleHits(rule, start, candidate) {
  if (candidate < startOfDay(start)) return false
  if (rule.until && candidate > rule.until) return false

  let hit = false
  switch (rule.freq) {
    case "DAILY":
      hit = daysBetween(start, candidate) % rule.interval === 0
      break
    case "WEEKLY": {
      const days = rule.byDay || [WEEKDAYS[start.getDay()]]
      const weeks = Math.floor(daysBetween(start, candidate) / 7)
      hit =
        weeks % rule.interval === 0 &&
        days.includes(WEEKDAYS[candidate.getDay()])
      break
    }
    case "MONTHLY": {
      const days = rule.byMonthDay || [start.getDate()]
      const months =
        (candidate.getFullYear() - start.getFullYear()) * 12 +
        (candidate.getMonth() - start.getMonth())
      hit = months % rule.interval === 0 && days.includes(candidate.getDate())
      break
    }
    case "YEARLY":
      hit =
        (candidate.getFullYear() - start.getFullYear()) % rule.interval === 0 &&
        candidate.getMonth() === start.getMonth() &&
        candidate.getDate() === start.getDate()
      break
    default:
      hit = false
  }
  if (!hit) return false
  if (rule.count !== null && occurrenceIndex(rule, start, candidate) >= rule.count) {
    return false
  }
  return true
}

/**
 * Every occurrence that overlaps the given day, including ones that began the
 * day before and run past midnight.
 */
export function eventsForDay(parsed, day) {
  const dayStart = startOfDay(day)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)
  const out = []

  parsed.forEach((event, i) => {
    const length = Math.max(60000, event.end - event.start)
    const push = (start) => {
      const end = new Date(start.getTime() + length)
      if (end <= dayStart || start >= dayEnd) return
      if (event.exdates.includes(start.getTime())) return
      out.push({
        id: `${event.uid || "ics"}-${start.getTime()}-${i}`,
        title: event.title || "Event",
        start,
        end,
        source: "ics",
      })
    }

    if (!event.rrule) {
      push(event.start)
      return
    }
    // A candidate can only start today or yesterday and still touch today
    for (const offset of [-1, 0]) {
      const candidateDay = new Date(dayStart.getTime() + offset * DAY_MS)
      if (!ruleHits(event.rrule, event.start, candidateDay)) continue
      const start = new Date(candidateDay)
      start.setHours(
        event.start.getHours(),
        event.start.getMinutes(),
        event.start.getSeconds(),
        0
      )
      push(start)
    }
  })

  return out.sort((a, b) => a.start - b.start)
}
