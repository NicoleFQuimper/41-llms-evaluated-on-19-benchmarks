import {
  drawDial,
  sectorAt,
  hhmm,
  HEART_PX,
  THEMES,
  BABY_BLUE,
  CUTE_PURPLE,
  KAWAII_PINK,
  withAlpha,
} from "./dial.js"
import { parseICS, eventsForDay } from "./ics.js"

const STORE_KEY = "magical-sectograph/v1"
const DAY_MS = 24 * 60 * 60 * 1000

const COPY = {
  kawaii: {
    brand: "✦ MAGICAL SECTOGRAPH ✦",
    tasks: "quests",
    count: (n) => `♡ ${n}`,
    empty: "all clear, starlight ♡",
    add: "new quest…",
    glyph: "✦",
  },
  classic: {
    brand: "SECTOGRAPH",
    tasks: "tasks",
    count: (n) => `${n} open`,
    empty: "No tasks left",
    add: "new task…",
    glyph: "◐",
  },
}

const el = (id) => document.getElementById(id)
const canvas = el("dial")
const ctx = canvas.getContext("2d")

let state = load()
let sectors = []
let dialSize = 0
let editingTaskId = null
let editingEventId = null

// —— storage ————————————————————————————————————————————————

function blank() {
  return { theme: "kawaii", tasks: [], events: [], calendars: [] }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return blank()
    const parsed = JSON.parse(raw)
    return {
      ...blank(),
      ...parsed,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      calendars: Array.isArray(parsed.calendars) ? parsed.calendars : [],
    }
  } catch (_) {
    return blank()
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch (err) {
    toast("Storage is full — try clearing finished quests")
  }
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Drop stale finished quests and one-off events so storage stays small. */
function prune() {
  const cutoff = Date.now() - 14 * DAY_MS
  const before = state.tasks.length + state.events.length
  state.tasks = state.tasks.filter(
    (t) => !t.done || !t.completedAt || new Date(t.completedAt).getTime() > cutoff
  )
  state.events = state.events.filter(
    (e) => e.repeat === "daily" || new Date(e.end).getTime() > cutoff
  )
  if (state.tasks.length + state.events.length !== before) save()
}

// —— day helpers ————————————————————————————————————————————

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

function taskDue(task) {
  return task.due ? new Date(task.due) : null
}

function isOverdue(task, now) {
  if (task.done || !task.hasTime) return false
  const due = taskDue(task)
  return !!due && due.getTime() < now.getTime()
}

function taskState(task, now) {
  if (task.done) return "done"
  if (!task.hasTime) return "pink"
  return isOverdue(task, now) ? "overdue" : "today"
}

function taskAccent(task, now) {
  const s = taskState(task, now)
  if (s === "done") return THEMES[state.theme].done
  if (s === "pink") return KAWAII_PINK
  return s === "overdue" ? CUTE_PURPLE : BABY_BLUE
}

function taskMeta(task, now) {
  const kawaii = state.theme === "kawaii"
  if (!task.hasTime) return kawaii ? "open quest" : "no time set"
  const due = taskDue(task)
  if (!due) return kawaii ? "open quest" : "no time set"
  if (isOverdue(task, now)) return `overdue · ${hhmm(due)}`
  return `due ${hhmm(due)}`
}

/** Quests worth showing today: open ones, plus what was finished today. */
function visibleTasks(now) {
  const dayEnd = new Date(startOfDay(now).getTime() + DAY_MS)
  return state.tasks
    .filter((task) => {
      if (task.done) return task.completedAt && sameDay(new Date(task.completedAt), now)
      const due = taskDue(task)
      return !due || due < dayEnd
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!!a.hasTime !== !!b.hasTime) return a.hasTime ? -1 : 1
      if (a.hasTime && b.hasTime) {
        const oa = isOverdue(a, now)
        const ob = isOverdue(b, now)
        if (oa !== ob) return oa ? -1 : 1
        return taskDue(a) - taskDue(b)
      }
      return (a.title || "").localeCompare(b.title || "")
    })
}

/** Everything on the clock today: manual events plus imported calendars. */
function eventsToday(now) {
  const dayStart = startOfDay(now)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)

  const manual = state.events.flatMap((event) => {
    const start = new Date(event.start)
    const end = new Date(event.end)
    if (event.repeat === "daily") {
      const projStart = new Date(dayStart)
      projStart.setHours(start.getHours(), start.getMinutes(), 0, 0)
      const projEnd = new Date(projStart.getTime() + Math.max(60000, end - start))
      return [{ ...event, start: projStart, end: projEnd }]
    }
    if (end <= dayStart || start >= dayEnd) return []
    return [{ ...event, start, end }]
  })

  const imported = state.calendars.flatMap((cal) => {
    try {
      return eventsForDay(parseICS(cal.text), now).map((e) => ({
        ...e,
        calendar: cal.name,
      }))
    } catch (_) {
      return []
    }
  })

  return manual.concat(imported).sort((a, b) => a.start - b.start)
}

// —— hearts ——————————————————————————————————————————————————

const heartCache = new Map()

function heartSvg(fill, outline, checked) {
  const key = `${fill}|${outline}|${checked}`
  if (heartCache.has(key)) return heartCache.get(key)
  const cols = HEART_PX[0].length
  const rows = HEART_PX.length
  const cells = []
  HEART_PX.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) cells.push(`<rect x="${c}" y="${r}" width="1.02" height="1.02" />`)
    })
  )
  const shine = checked
    ? `<rect x="1" y="1" width="1.02" height="1.02" fill="#fff" opacity="0.9" />`
    : ""
  const svg = `<svg viewBox="-0.4 -0.4 ${cols + 0.8} ${rows + 0.8}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="${outline}" transform="translate(-0.16,-0.16) scale(1.045)">${cells.join("")}</g>
    <g fill="${fill}">${cells.join("")}</g>
    ${shine}
  </svg>`
  heartCache.set(key, svg)
  return svg
}

function bubbleSvg(task, now) {
  const accent = taskAccent(task, now)
  if (state.theme === "kawaii") {
    return task.done
      ? heartSvg(accent, "#ffffff", true)
      : heartSvg(withAlpha(accent, 0.28), accent, false)
  }
  const fill = task.done ? accent : withAlpha(accent, 0.2)
  const check = task.done
    ? `<path d="M7 12 l3.4 3.6 L17 8.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />`
    : ""
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="9.4" fill="${fill}" stroke="${accent}" stroke-width="2" />
    ${check}
  </svg>`
}

// —— rendering ————————————————————————————————————————————————

function sizeCanvas() {
  const rect = canvas.getBoundingClientRect()
  const size = Math.max(120, Math.round(rect.width))
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr
    canvas.height = size * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return size
}

function renderDial(now) {
  dialSize = sizeCanvas()
  sectors = drawDial(ctx, dialSize, {
    events: eventsToday(now),
    tasks: state.tasks.map((t) => ({ ...t, due: t.due })),
    now,
    theme: state.theme,
  })
}

function renderTasks(now) {
  const copy = COPY[state.theme]
  const list = el("taskList")
  const tasks = visibleTasks(now)
  list.innerHTML = ""

  tasks.forEach((task) => {
    const li = document.createElement("li")
    li.className = "task"
    li.dataset.state = taskState(task, now)

    const tick = document.createElement("button")
    tick.className = "tick"
    tick.type = "button"
    tick.setAttribute("role", "checkbox")
    tick.setAttribute("aria-checked", String(!!task.done))
    tick.setAttribute("aria-label", `${task.done ? "Reopen" : "Complete"} ${task.title}`)
    tick.innerHTML = bubbleSvg(task, now)
    tick.addEventListener("click", () => toggleTask(task.id, tick))

    const body = document.createElement("button")
    body.className = "task-body"
    body.type = "button"
    body.innerHTML = `<span class="task-title"></span><span class="task-meta"></span>`
    body.querySelector(".task-title").textContent = task.title
    body.querySelector(".task-meta").textContent = taskMeta(task, now)
    body.addEventListener("click", () => openTaskDialog(task.id))

    li.append(tick, body)
    list.append(li)
  })

  const open = tasks.filter((t) => !t.done).length
  el("taskCount").textContent = copy.count(open)
  el("emptyNote").textContent = copy.empty
  el("emptyNote").hidden = tasks.length > 0
}

function renderChrome(now) {
  const copy = COPY[state.theme]
  document.documentElement.dataset.theme = state.theme
  el("brand").textContent = copy.brand
  el("tasksTitle").textContent = copy.tasks
  el("themeGlyph").textContent = copy.glyph
  el("quickTitle").placeholder = copy.add
  el("today").textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", THEMES[state.theme].bg)
  document.querySelectorAll("#themePicker button").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.theme === state.theme))
  })
}

function render() {
  const now = new Date()
  renderChrome(now)
  renderTasks(now)
  renderDial(now)
}

// —— actions ——————————————————————————————————————————————————

function toggleTask(id, tickEl) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  task.done = !task.done
  task.completedAt = task.done ? new Date().toISOString() : null
  save()
  if (tickEl) {
    tickEl.classList.add("pop")
    setTimeout(() => tickEl.classList.remove("pop"), 180)
  }
  if (navigator.vibrate) navigator.vibrate(task.done ? 12 : 6)
  render()
}

function timeToDate(value, base) {
  if (!value) return null
  const [h, m] = value.split(":").map(Number)
  const d = new Date(base || new Date())
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

function addTask(title, timeValue) {
  const clean = title.trim()
  if (!clean) return
  const due = timeToDate(timeValue)
  state.tasks.push({
    id: uid(),
    title: clean,
    done: false,
    due: due ? due.toISOString() : null,
    hasTime: !!due,
    createdAt: new Date().toISOString(),
    completedAt: null,
  })
  save()
  render()
}

function openTaskDialog(id) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  editingTaskId = id
  el("taskTitle").value = task.title
  el("taskTime").value = task.hasTime && task.due ? hhmm(new Date(task.due)) : ""
  el("taskDialogTitle").textContent = COPY[state.theme].tasks.replace(/s$/, "")
  el("taskDialog").showModal()
}

function openEventDialog(id) {
  const event = id ? state.events.find((e) => e.id === id) : null
  const imported = id && !event
  editingEventId = id || null

  if (event) {
    el("eventTitle").value = event.title
    el("eventStart").value = hhmm(new Date(event.start))
    el("eventEnd").value = hhmm(new Date(event.end))
    el("eventRepeat").checked = event.repeat === "daily"
  } else if (imported) {
    const found = sectors.find((s) => s.id === id)
    el("eventTitle").value = found ? found.title : ""
    el("eventStart").value = ""
    el("eventEnd").value = ""
    el("eventRepeat").checked = false
  } else {
    const now = new Date()
    const start = new Date(now.getTime() + (60 - (now.getMinutes() % 60)) * 60000)
    el("eventTitle").value = ""
    el("eventStart").value = hhmm(start)
    el("eventEnd").value = hhmm(new Date(start.getTime() + 3600000))
    el("eventRepeat").checked = false
  }

  const readOnly = !!imported
  el("eventHint").hidden = !readOnly
  el("eventSave").disabled = readOnly
  el("eventDelete").hidden = readOnly || !event
  ;["eventTitle", "eventStart", "eventEnd", "eventRepeat"].forEach((f) => {
    el(f).disabled = readOnly
  })
  el("eventDialog").showModal()
}

function saveEvent() {
  const title = el("eventTitle").value.trim()
  const start = timeToDate(el("eventStart").value)
  let end = timeToDate(el("eventEnd").value)
  if (!title || !start || !end) return
  // An end before the start means it runs past midnight
  if (end <= start) end = new Date(end.getTime() + DAY_MS)

  const repeat = el("eventRepeat").checked ? "daily" : "none"
  const existing = state.events.find((e) => e.id === editingEventId)
  if (existing) {
    Object.assign(existing, {
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      repeat,
    })
  } else {
    state.events.push({
      id: uid(),
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      repeat,
      source: "manual",
    })
  }
  save()
  render()
}

async function importCalendarText(name, text, url) {
  const events = parseICS(text)
  if (!events.length) {
    toast("No events found in that calendar")
    return false
  }
  state.calendars.push({
    id: uid(),
    name: name || "Calendar",
    text,
    url: url || null,
    importedAt: new Date().toISOString(),
  })
  save()
  render()
  renderCalendarList()
  toast(`Imported ${events.length} event${events.length === 1 ? "" : "s"}`)
  return true
}

async function importFromUrl(rawUrl) {
  const url = rawUrl.trim().replace(/^webcal:/i, "https:")
  if (!url) return
  toast("Fetching calendar…")
  try {
    const res = await fetch(url, { redirect: "follow" })
    if (!res.ok) throw new Error(String(res.status))
    const text = await res.text()
    const ok = await importCalendarText(hostOf(url), text, url)
    if (ok) el("icsUrl").value = ""
  } catch (_) {
    toast("That host blocked the request — import the .ics file instead")
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch (_) {
    return "Calendar"
  }
}

async function refreshCalendar(cal) {
  if (!cal.url) return
  try {
    const res = await fetch(cal.url, { redirect: "follow" })
    if (!res.ok) throw new Error(String(res.status))
    cal.text = await res.text()
    cal.importedAt = new Date().toISOString()
    save()
    render()
  } catch (_) {
    /* keep the copy we already have */
  }
}

function renderCalendarList() {
  const list = el("calendarList")
  list.innerHTML = ""
  if (!state.calendars.length) {
    const li = document.createElement("li")
    li.innerHTML = "<span>No calendars imported yet</span>"
    list.append(li)
    return
  }
  state.calendars.forEach((cal) => {
    const li = document.createElement("li")
    const name = document.createElement("span")
    name.textContent = cal.name
    const remove = document.createElement("button")
    remove.type = "button"
    remove.textContent = "remove"
    remove.addEventListener("click", () => {
      state.calendars = state.calendars.filter((c) => c.id !== cal.id)
      save()
      render()
      renderCalendarList()
    })
    li.append(name, remove)
    list.append(li)
  })
}

let toastTimer = null
function toast(message) {
  const node = el("toast")
  node.textContent = message
  node.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    node.hidden = true
  }, 2600)
}

// —— wiring ————————————————————————————————————————————————————

el("quickAdd").addEventListener("submit", (e) => {
  e.preventDefault()
  addTask(el("quickTitle").value, el("quickTime").value)
  el("quickTitle").value = ""
  el("quickTime").value = ""
  el("quickTitle").blur()
})

el("taskForm").addEventListener("submit", () => {
  const task = state.tasks.find((t) => t.id === editingTaskId)
  if (!task) return
  task.title = el("taskTitle").value.trim() || task.title
  const due = timeToDate(el("taskTime").value, task.due ? new Date(task.due) : new Date())
  task.due = due ? due.toISOString() : null
  task.hasTime = !!due
  save()
  render()
})

el("taskCancel").addEventListener("click", () => el("taskDialog").close())
el("taskDelete").addEventListener("click", () => {
  state.tasks = state.tasks.filter((t) => t.id !== editingTaskId)
  save()
  render()
  el("taskDialog").close()
})

el("addEventBtn").addEventListener("click", () => openEventDialog(null))
el("eventForm").addEventListener("submit", saveEvent)
el("eventCancel").addEventListener("click", () => el("eventDialog").close())
el("eventDelete").addEventListener("click", () => {
  state.events = state.events.filter((e) => e.id !== editingEventId)
  save()
  render()
  el("eventDialog").close()
})

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect()
  const scale = dialSize / rect.width
  const hit = sectorAt(
    sectors,
    (e.clientX - rect.left) * scale,
    (e.clientY - rect.top) * scale,
    dialSize
  )
  if (hit) openEventDialog(hit.id)
})

el("themeBtn").addEventListener("click", () => {
  state.theme = state.theme === "kawaii" ? "classic" : "kawaii"
  save()
  render()
})

el("settingsBtn").addEventListener("click", () => {
  renderCalendarList()
  el("settingsDialog").showModal()
})
el("settingsClose").addEventListener("click", () => el("settingsDialog").close())

document.querySelectorAll("#themePicker button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.theme = btn.dataset.theme
    save()
    render()
  })
})

el("importBtn").addEventListener("click", () => {
  renderCalendarList()
  el("settingsDialog").showModal()
  el("icsFile").click()
})

el("icsFile").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const text = await file.text()
  await importCalendarText(file.name.replace(/\.ics$/i, ""), text, null)
  e.target.value = ""
})

el("icsUrlForm").addEventListener("submit", (e) => {
  e.preventDefault()
  importFromUrl(el("icsUrl").value)
})

el("clearDone").addEventListener("click", () => {
  state.tasks = state.tasks.filter((t) => !t.done)
  save()
  render()
  toast("Cleared")
})

// —— add to Home Screen ————————————————————————————————————

const INSTALL_KEY = "magical-sectograph/install-tip"

function setupInstallTip() {
  const tip = el("installTip")
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  if (standalone || localStorage.getItem(INSTALL_KEY) === "dismissed") return

  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

  const show = (text, prompt) => {
    el("installText").textContent = text
    el("installAction").hidden = !prompt
    tip.hidden = false
    if (prompt) {
      el("installAction").onclick = async () => {
        prompt.prompt()
        await prompt.userChoice
        tip.hidden = true
      }
    }
  }

  if (iOS) {
    show("Keep it on your Home Screen: tap Share, then “Add to Home Screen”.", null)
  } else {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      show("Install this as an app for offline use.", e)
    })
  }

  el("installDismiss").addEventListener("click", () => {
    tip.hidden = true
    localStorage.setItem(INSTALL_KEY, "dismissed")
  })
}

window.addEventListener("resize", () => renderDial(new Date()))
window.addEventListener("orientationchange", () => setTimeout(render, 250))
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    render()
    state.calendars.forEach(refreshCalendar)
  }
})

// The hand should keep sweeping, and a task can fall overdue while watching
setInterval(() => render(), 20000)

prune()
render()
setupInstallTip()
state.calendars.forEach(refreshCalendar)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {})
  })
}
