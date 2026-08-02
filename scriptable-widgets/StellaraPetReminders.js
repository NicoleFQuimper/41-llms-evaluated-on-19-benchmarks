// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♥ STELLARA PET — Reminder Success Console
// Premium coquette × girl-coder hacker pet buddy.
// Tracks completed / set reminders (success rate)
// for today · week · month · year.
//
// Widget Parameter:
//   day | week | month | year | panel | all
// Default: day (full detail + soft others)
//
// Allow Reminders access on first run.
// Re-paste + remove/re-add widget after updates.

const CONFIG = {
  name: "STELLARA PET",
  tagline: "soft sys · reminder success console",
  colors: {
    bg0: "#fff5fa",
    panel: "#ffffff",
    sakura: "#ff7eb6",
    sakuraSoft: "#ffb0d2",
    neonPink: "#ff2d8a",
    neonPinkSoft: "#ff5aa8",
    rose: "#e891b0",
    lav: "#d2b8ff",
    peach: "#ffd0bc",
    mint: "#9adfd0",
    star: "#ffe08a",
    ink: "#8a3a5c",
    inkSoft: "#a85878",
    mute: "#c49aaf",
    dim: "#ffe8f1",
    dimStroke: "#f3c6d8",
    frame: "#ffc1d9",
    chrome: "#f3e8ff",
    gYellow: "#ffe566",
    gPink: "#ff6fb5",
    gPurple: "#c084fc",
    gBlue: "#8ecbff",
    petBody: "#ffc9de",
    petCheek: "#ff8eb8",
    petEye: "#5a2a40",
  },
};

function parseMode(raw) {
  const m = String(raw || "day").trim().toLowerCase();
  if (["day", "week", "month", "year", "panel", "all"].includes(m)) return m;
  return "day";
}

// ─── Dates ───────────────────────────────────────────────────

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfWeek(d) {
  const s = startOfDay(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  return endOfDay(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6));
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}
function endOfYear(d) {
  return endOfDay(new Date(d.getFullYear(), 11, 31));
}
function dueDateOf(r) {
  if (r.dueDate) return r.dueDate;
  if (r.dueDateComponents && r.dueDateComponents.date) return r.dueDateComponents.date;
  return null;
}
function inRange(date, start, end) {
  return !!(date && date >= start && date <= end);
}
function rateOf(done, total) {
  if (!total || total <= 0) return null;
  return Math.min(1, Math.max(0, done / total));
}
function pctLabel(rate) {
  if (rate === null) return "—%";
  return `${Math.round(rate * 100)}%`;
}
function remKey(r) {
  const due = dueDateOf(r);
  return `${r.title || ""}::${due ? due.getTime() : "x"}::${r.isCompleted ? 1 : 0}`;
}

// ─── Stats ───────────────────────────────────────────────────

async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    return [];
  }
}

function tallyPeriod(lists, start, end) {
  const seen = new Set();
  let total = 0;
  let done = 0;
  const titles = [];
  for (const list of lists) {
    for (const r of list) {
      const due = dueDateOf(r);
      const completedAt = r.completionDate || null;
      const dueIn = inRange(due, start, end);
      const completedIn = inRange(completedAt, start, end);
      // Count if due in period, OR completed in period (covers no-due tasks)
      if (!dueIn && !completedIn) continue;
      const k = remKey(r) + (dueIn ? ":d" : ":c");
      if (seen.has(k)) continue;
      seen.add(k);
      total += 1;
      if (r.isCompleted) done += 1;
      if (titles.length < 6) {
        titles.push({
          title: (r.title || "untitled mission").slice(0, 42),
          done: !!r.isCompleted,
        });
      }
    }
  }
  return { total, done, rate: rateOf(done, total), titles };
}

async function gatherStats() {
  const now = new Date();
  const ranges = {
    day: [startOfDay(now), endOfDay(now)],
    week: [startOfWeek(now), endOfWeek(now)],
    month: [startOfMonth(now), endOfMonth(now)],
    year: [startOfYear(now), endOfYear(now)],
  };

  const dueToday = await safe(() => Reminder.allDueToday());
  const dueWeek = await safe(() => Reminder.allDueThisWeek());
  const completedToday = await safe(() => Reminder.completedToday());
  const completedWeek = await safe(() => Reminder.completedThisWeek());
  const all = await safe(() => Reminder.all());

  const day = tallyPeriod([dueToday, completedToday, all], ranges.day[0], ranges.day[1]);
  const week = tallyPeriod([dueWeek, completedWeek, all], ranges.week[0], ranges.week[1]);
  const month = tallyPeriod([all, dueWeek, completedWeek], ranges.month[0], ranges.month[1]);
  const year = tallyPeriod([all], ranges.year[0], ranges.year[1]);

  return { day, week, month, year, now };
}

// ─── Draw ────────────────────────────────────────────────────

function hex(h, a = 1) {
  return new Color(h, a);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mixHex(hexA, hexB, t) {
  const pa = String(hexA).replace("#", "");
  const pb = String(hexB).replace("#", "");
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const rr = Math.round(lerp(ch(pa, 0), ch(pb, 0), t));
  const gg = Math.round(lerp(ch(pa, 2), ch(pb, 2), t));
  const bb = Math.round(lerp(ch(pa, 4), ch(pb, 4), t));
  return (
    "#" +
    [rr, gg, bb].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}
function cyberGradient(t, c) {
  if (t < 1 / 3) return mixHex(c.gYellow, c.gPink, t * 3);
  if (t < 2 / 3) return mixHex(c.gPink, c.gPurple, (t - 1 / 3) * 3);
  return mixHex(c.gPurple, c.gBlue, (t - 2 / 3) * 3);
}
function fillRoundRect(dc, rect, radius, color) {
  const path = new Path();
  path.addRoundedRect(rect, radius, radius);
  dc.setFillColor(color);
  dc.addPath(path);
  dc.fillPath();
}
function strokeRoundRect(dc, rect, radius, color, width = 1) {
  const path = new Path();
  path.addRoundedRect(rect, radius, radius);
  dc.setStrokeColor(color);
  dc.setLineWidth(width);
  dc.addPath(path);
  dc.strokePath();
}
function softBlob(dc, cx, cy, r, colorHex, alpha) {
  for (let i = 10; i >= 1; i--) {
    const t = i / 10;
    const rr = r * (0.35 + t * 1.05);
    dc.setFillColor(hex(colorHex, alpha * Math.pow(1 - t, 1.65)));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
}
function softBarGlow(dc, x, y, w, h, colorHex, strength = 1) {
  for (let i = 6; i >= 1; i--) {
    const t = i / 6;
    const gx = i * 2.0 * strength;
    const gyDown = i * 2.4 * strength;
    fillRoundRect(
      dc,
      new Rect(x - gx, y, w + gx * 2, h + gyDown),
      (h + gyDown) / 2,
      hex(colorHex, 0.14 * strength * (1 - t) * (1 - t))
    );
  }
}
function drawHeart(dc, x, y, size, colorHex, alpha = 1) {
  const s = size;
  softBlob(dc, x, y + s * 0.08, s * 1.1, colorHex, alpha * 0.35);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - s * 0.62, y - s * 0.42, s * 0.66, s * 0.66));
  dc.fillEllipse(new Rect(x - s * 0.04, y - s * 0.42, s * 0.66, s * 0.66));
  const path = new Path();
  path.move(new Point(x - s * 0.62, y + s * 0.08));
  path.addLine(new Point(x, y + s * 0.82));
  path.addLine(new Point(x + s * 0.62, y + s * 0.08));
  path.closeSubpath();
  dc.addPath(path);
  dc.fillPath();
  dc.fillEllipse(new Rect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.55));
  dc.setFillColor(hex("#ffffff", alpha * 0.5));
  dc.fillEllipse(new Rect(x - s * 0.38, y - s * 0.28, s * 0.28, s * 0.22));
}
function drawSpark(dc, x, y, size, colorHex, alpha = 0.75) {
  softBlob(dc, x, y, size * 2.2, colorHex, alpha * 0.35);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6));
  dc.setFillColor(hex(colorHex, alpha * 0.45));
  dc.fillRect(new Rect(x - size * 0.08, y - size, size * 0.16, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.08, size * 2, size * 0.16));
}
function drawText(dc, text, rect, { font, color, align = "left" } = {}) {
  dc.setFont(font);
  dc.setTextColor(color);
  if (align === "center") dc.setTextAlignedCenter();
  else if (align === "right") dc.setTextAlignedRight();
  else dc.setTextAlignedLeft();
  dc.drawTextInRect(String(text), rect);
}
function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.45, finalHex } = {}) {
  for (const [ox, oy, a] of [
    [0, 0, glow],
    [0, 1, glow * 0.45],
    [0, -1, glow * 0.4],
    [1, 0, glow * 0.35],
    [-1, 0, glow * 0.35],
  ]) {
    drawText(dc, text, new Rect(rect.x + ox, rect.y + oy, rect.width, rect.height), {
      font,
      color: hex(colorHex, a),
      align,
    });
  }
  drawText(dc, text, rect, { font, color: hex(finalHex || colorHex, 1), align });
}

/** Soft chrome panel — coquette hacker window */
function paintChromePanel(dc, rect, c, { radius = 14, glow = true } = {}) {
  const { x, y, w, h } = rect;
  if (glow) softBlob(dc, x + w / 2, y + h / 2, Math.min(w, h) * 0.55, c.sakuraSoft, 0.18);
  fillRoundRect(dc, new Rect(x, y, w, h), radius, hex(c.panel, 0.72));
  // soft double frame
  strokeRoundRect(dc, new Rect(x, y, w, h), radius, hex(c.frame, 0.7), 1.3);
  strokeRoundRect(dc, new Rect(x + 2, y + 2, w - 4, h - 4), radius - 2, hex(c.lav, 0.28), 0.8);
  // tiny traffic-light hearts / dots (girl coder window chrome)
  const cy = y + 9;
  drawHeart(dc, x + 12, cy, 3.2, c.neonPink, 0.95);
  dc.setFillColor(hex(c.lav, 0.85));
  dc.fillEllipse(new Rect(x + 22, cy - 2.2, 4.4, 4.4));
  dc.setFillColor(hex(c.gBlue, 0.85));
  dc.fillEllipse(new Rect(x + 30, cy - 2.2, 4.4, 4.4));
}

function paintSoftGrid(dc, w, h, c) {
  // Very soft hacker grid — pastel dots, not harsh lines
  const step = 18;
  for (let x = 10; x < w - 8; x += step) {
    for (let y = 10; y < h - 8; y += step) {
      dc.setFillColor(hex(c.sakuraSoft, 0.07));
      dc.fillEllipse(new Rect(x, y, 1.6, 1.6));
    }
  }
}

// ─── Pet ─────────────────────────────────────────────────────

function moodFrom(rate) {
  if (rate === null) return "idle";
  if (rate >= 0.85) return "sparkle";
  if (rate >= 0.6) return "happy";
  if (rate >= 0.35) return "okay";
  if (rate > 0) return "sleepy";
  return "encourage";
}
function moodCopy(mood, focusLabel) {
  switch (mood) {
    case "sparkle":
      return `sys ♥ online · ${focusLabel} crushed`;
    case "happy":
      return `good-girl compile · ${focusLabel} glowing`;
    case "okay":
      return `soft progress · keep pushing ${focusLabel}`;
    case "sleepy":
      return `low power · ${focusLabel} needs love`;
    case "encourage":
      return `boot a mission · ${focusLabel} awaits`;
    default:
      return `idle cute mode · waiting for ${focusLabel}`;
  }
}

/** Classic pixel heart (filled or empty outline). x/y = top-left. */
function drawPixelHeart(dc, x, y, px, colorHex, filled) {
  // 7×6 pixel heart
  const map = filled
    ? ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]
    : ["0110110", "1001001", "1000001", "0100010", "0010100", "0001000"];
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      if (map[row][col] !== "1") continue;
      dc.setFillColor(hex(colorHex, filled ? 1 : 0.55));
      dc.fillRect(new Rect(x + col * px, y + row * px, px, px));
    }
  }
}

/** Year success rate → 0–4 hearts (the pet’s HP). */
function heartsFromYearRate(rate) {
  if (rate === null) return 0;
  return Math.max(0, Math.min(4, Math.round(rate * 4)));
}

/**
 * Circular health bay above the pet — 4 pixel hearts.
 * Health = yearly reminder success rate (the important bar).
 */
function drawHealthBay(dc, cx, cy, radius, yearRate, c) {
  const filled = heartsFromYearRate(yearRate);

  // Soft aura + circular compartment
  softBlob(dc, cx, cy, radius * 1.35, c.sakuraSoft, 0.35);
  softBlob(dc, cx, cy, radius * 1.05, c.gPink, 0.18);
  dc.setFillColor(hex("#fff7fb", 0.92));
  dc.fillEllipse(new Rect(cx - radius, cy - radius, radius * 2, radius * 2));
  dc.setStrokeColor(hex(c.neonPinkSoft, 0.55));
  dc.setLineWidth(2.2);
  dc.strokeEllipse(new Rect(cx - radius, cy - radius, radius * 2, radius * 2));
  dc.setStrokeColor(hex(c.lav, 0.35));
  dc.setLineWidth(1);
  dc.strokeEllipse(
    new Rect(cx - radius + 3, cy - radius + 3, (radius - 3) * 2, (radius - 3) * 2)
  );

  // Tiny HP label
  drawText(dc, "YR HP", new Rect(cx - radius, cy - radius + 4, radius * 2, 10), {
    font: Font.boldRoundedSystemFont(Math.max(6, radius * 0.22)),
    color: hex(c.mute, 0.95),
    align: "center",
  });

  // 4 pixel hearts in a neat row inside the circle
  const px = Math.max(1.35, radius * 0.11);
  const heartW = 7 * px;
  const heartH = 6 * px;
  const gap = Math.max(1.5, px * 0.7);
  const totalW = heartW * 4 + gap * 3;
  let hx = cx - totalW / 2;
  const hy = cy - heartH * 0.25;
  for (let i = 0; i < 4; i++) {
    const on = i < filled;
    drawPixelHeart(dc, hx, hy, px, on ? c.neonPink : c.dimStroke, on);
    if (on) softBlob(dc, hx + heartW / 2, hy + heartH / 2, px * 2.2, c.neonPinkSoft, 0.35);
    hx += heartW + gap;
  }

  // Tiny success hint under hearts
  drawText(dc, pctLabel(yearRate), new Rect(cx - radius, cy + radius * 0.45, radius * 2, 10), {
    font: Font.heavyRoundedSystemFont(Math.max(7, radius * 0.24)),
    color: hex(c.neonPink, 0.95),
    align: "center",
  });
}

function drawPet(dc, cx, cy, scale, mood, c, yearRate = null) {
  const s = scale;

  // Health bay floats above the head (year success = HP)
  const bayR = Math.max(16, s * 0.55);
  drawHealthBay(dc, cx, cy - s * 1.22, bayR, yearRate, c);

  const aura =
    mood === "sparkle"
      ? c.gYellow
      : mood === "happy"
        ? c.neonPinkSoft
        : mood === "okay"
          ? c.lav
          : mood === "sleepy"
            ? c.gBlue
            : c.sakuraSoft;
  softBlob(dc, cx, cy, s * 1.45, aura, 0.32);
  softBlob(dc, cx, cy + s * 0.08, s * 1.1, c.petBody, 0.4);

  dc.setFillColor(hex(c.petBody, 1));
  dc.fillEllipse(new Rect(cx - s * 0.9, cy - s * 0.78, s * 1.8, s * 1.7));
  dc.setFillColor(hex("#fff5fa", 0.9));
  dc.fillEllipse(new Rect(cx - s * 0.48, cy - s * 0.12, s * 0.96, s * 0.9));

  // ears
  dc.setFillColor(hex(c.petBody, 1));
  dc.fillEllipse(new Rect(cx - s * 0.9, cy - s * 1.1, s * 0.58, s * 0.58));
  dc.fillEllipse(new Rect(cx + s * 0.32, cy - s * 1.1, s * 0.58, s * 0.58));
  dc.setFillColor(hex(c.petCheek, 0.9));
  dc.fillEllipse(new Rect(cx - s * 0.76, cy - s * 0.98, s * 0.3, s * 0.3));
  dc.fillEllipse(new Rect(cx + s * 0.46, cy - s * 0.98, s * 0.3, s * 0.3));

  softBlob(dc, cx - s * 0.45, cy + s * 0.14, s * 0.2, c.petCheek, 0.55);
  softBlob(dc, cx + s * 0.45, cy + s * 0.14, s * 0.2, c.petCheek, 0.55);

  const eyeY = cy - s * 0.16;
  const eyeDX = s * 0.3;
  if (mood === "sleepy") {
    dc.setFillColor(hex(c.petEye, 0.9));
    dc.fillRect(new Rect(cx - eyeDX - s * 0.13, eyeY, s * 0.26, s * 0.055));
    dc.fillRect(new Rect(cx + eyeDX - s * 0.13, eyeY, s * 0.26, s * 0.055));
  } else {
    dc.setFillColor(hex(c.petEye, 1));
    dc.fillEllipse(new Rect(cx - eyeDX - s * 0.14, eyeY - s * 0.13, s * 0.28, s * 0.32));
    dc.fillEllipse(new Rect(cx + eyeDX - s * 0.14, eyeY - s * 0.13, s * 0.28, s * 0.32));
    // heart-ish shine
    dc.setFillColor(hex("#ffffff", 0.95));
    dc.fillEllipse(new Rect(cx - eyeDX - s * 0.02, eyeY - s * 0.15, s * 0.11, s * 0.11));
    dc.fillEllipse(new Rect(cx + eyeDX - s * 0.02, eyeY - s * 0.15, s * 0.11, s * 0.11));
  }

  dc.setFillColor(hex(c.petEye, 0.85));
  if (mood === "sparkle" || mood === "happy") {
    dc.fillEllipse(new Rect(cx - s * 0.17, cy + s * 0.24, s * 0.34, s * 0.2));
    dc.setFillColor(hex(c.petBody, 1));
    dc.fillEllipse(new Rect(cx - s * 0.17, cy + s * 0.15, s * 0.34, s * 0.18));
  } else if (mood === "okay" || mood === "idle") {
    dc.fillEllipse(new Rect(cx - s * 0.07, cy + s * 0.3, s * 0.14, s * 0.11));
  } else {
    dc.fillEllipse(new Rect(cx - s * 0.09, cy + s * 0.28, s * 0.18, s * 0.15));
  }

  if (mood === "sparkle") {
    drawSpark(dc, cx + s * 0.9, cy - s * 0.75, s * 0.17, c.star, 0.95);
    drawSpark(dc, cx - s * 0.95, cy - s * 0.35, s * 0.13, c.gYellow, 0.85);
    drawHeart(dc, cx + s * 0.8, cy + s * 0.6, s * 0.24, c.neonPink, 0.95);
  } else if (mood === "happy") {
    drawHeart(dc, cx + s * 0.85, cy - s * 0.55, s * 0.22, c.neonPink, 0.9);
  } else {
    drawSpark(dc, cx + s * 0.8, cy - s * 0.55, s * 0.12, c.lav, 0.7);
  }
}

// ─── Size ────────────────────────────────────────────────────

function widgetSizeFor(family) {
  if (family === "small") return new Size(170, 170);
  if (family === "large") return new Size(360, 380);
  if (family === "extraLarge") return new Size(720, 360);
  return new Size(360, 170);
}

// ─── Shared UI ───────────────────────────────────────────────

function paintBackground(dc, w, h, c) {
  dc.setFillColor(hex(c.bg0));
  dc.fillRect(new Rect(0, 0, w, h));
  softBlob(dc, w * 0.1, h * 0.0, Math.max(w, h) * 0.55, c.sakuraSoft, 0.28);
  softBlob(dc, w * 0.95, h * 0.15, Math.max(w, h) * 0.5, c.lav, 0.22);
  softBlob(dc, w * 0.8, h * 1.0, Math.max(w, h) * 0.5, c.gBlue, 0.16);
  softBlob(dc, w * 0.5, h * 0.55, Math.max(w, h) * 0.35, c.peach, 0.1);
  paintSoftGrid(dc, w, h, c);
  const inset = 3;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.panel, 0.4));
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.frame, 0.65), 1.4);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    15,
    hex(c.lav, 0.3),
    0.8
  );
}

function paintHeader(dc, pad, w, c, modeLabel, statusRight) {
  drawHeart(dc, pad + 7, pad + 8, 6, c.neonPink, 1);
  glowText(dc, CONFIG.name, new Rect(pad + 18, pad, w * 0.55, 15), {
    font: Font.boldRoundedSystemFont(12),
    colorHex: c.neonPinkSoft,
    align: "left",
    glow: 0.5,
    finalHex: c.neonPink,
  });
  drawText(dc, modeLabel, new Rect(pad, pad, w - pad * 2, 13), {
    font: Font.semiboldRoundedSystemFont(9),
    color: hex(c.mute, 0.95),
    align: "right",
  });
  drawText(dc, CONFIG.tagline, new Rect(pad, pad + 15, w * 0.62, 12), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.mute, 0.9),
    align: "left",
  });
  drawText(dc, statusRight || "sys ♥ online", new Rect(pad, pad + 15, w - pad * 2, 12), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.neonPinkSoft, 0.9),
    align: "right",
  });
}

function paintSuccessBar(dc, x, y, w, h, rate, c) {
  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.55), 0.7);
  if (rate === null || rate <= 0) return;
  const fillW = Math.max(h, w * rate);
  softBarGlow(dc, x, y, fillW, h, c.gPink, 1.25);
  softBarGlow(dc, x + fillW * 0.45, y, Math.max(h, fillW * 0.55), h, c.gPurple, 0.85);
  softBarGlow(dc, x + fillW * 0.7, y, Math.max(h, fillW * 0.35), h, c.gBlue, 0.7);
  const segs = 32;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.6, h), h / 2, hex(cyberGradient(t, c), 1));
  }
  softBlob(dc, x + fillW, y + h / 2, Math.max(6, h * 1.2), c.gPink, 0.45);
  drawHeart(dc, x + fillW, y + h / 2 - 0.3, Math.min(3.8, h * 0.7), "#ffffff", 0.95);
}

function paintNeonPct(dc, x, y, w, h, text, c, size) {
  const font = Font.heavyRoundedSystemFont(size);
  for (const [ox, oy, a] of [
    [0, 0, 0.7],
    [0, 1, 0.4],
    [0, -1, 0.4],
    [1, 0, 0.35],
    [-1, 0, 0.35],
  ]) {
    drawText(dc, text, new Rect(x + ox, y + oy, w, h), {
      font,
      color: hex("#ffffff", a),
      align: "center",
    });
  }
  glowText(dc, text, new Rect(x, y, w, h), {
    font,
    colorHex: c.neonPinkSoft,
    align: "center",
    glow: 0.6,
    finalHex: c.neonPink,
  });
}

function paintMissionList(dc, rect, titles, c) {
  const { x, y, w, h } = rect;
  drawText(dc, "missions // today", new Rect(x, y, w, 12), {
    font: Font.semiboldRoundedSystemFont(8),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  const rowH = 14;
  const maxRows = Math.max(1, Math.floor((h - 14) / rowH));
  if (!titles.length) {
    drawText(dc, "> no due missions queued · soft idle", new Rect(x, y + 14, w, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.inkSoft, 0.75),
      align: "left",
    });
    return;
  }
  titles.slice(0, maxRows).forEach((t, i) => {
    const yy = y + 14 + i * rowH;
    drawText(dc, t.done ? "♥" : "○", new Rect(x, yy, 12, 12), {
      font: Font.semiboldRoundedSystemFont(8),
      color: hex(t.done ? c.neonPink : c.mute, 0.95),
      align: "left",
    });
    drawText(dc, t.title, new Rect(x + 14, yy, w - 14, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(t.done ? c.mute : c.inkSoft, 0.95),
      align: "left",
    });
  });
}

function paintStatCard(dc, rect, label, stat, c, { featured = false } = {}) {
  const { x, y, w, h } = rect;
  paintChromePanel(dc, rect, c, { radius: featured ? 16 : 12, glow: featured });
  const topPad = 16; // under chrome dots
  drawText(dc, label.toUpperCase(), new Rect(x + 10, y + topPad - 2, w - 20, 12), {
    font: Font.semiboldRoundedSystemFont(featured ? 9 : 8),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  paintNeonPct(dc, x, y + topPad + 10, w, featured ? 36 : 26, pctLabel(stat.rate), c, featured ? 30 : 18);
  drawText(dc, `${stat.done}/${stat.total} done`, new Rect(x + 10, y + topPad + (featured ? 48 : 36), w - 20, 12), {
    font: Font.mediumRoundedSystemFont(featured ? 10 : 8),
    color: hex(c.inkSoft, 0.95),
    align: "left",
  });
  const barY = y + h - (featured ? 28 : 22);
  paintSuccessBar(dc, x + 10, barY, w - 20, featured ? 9 : 6, stat.rate === null ? 0 : stat.rate, c);
  drawText(dc, "success rate", new Rect(x + 10, barY + (featured ? 10 : 7), w - 20, 10), {
    font: Font.mediumRoundedSystemFont(6.5),
    color: hex(c.mute, 0.8),
    align: "left",
  });
}

function paintFooter(dc, pad, w, h, text, c) {
  fillRoundRect(dc, new Rect(pad, h - pad - 16, w - pad * 2, 16), 8, hex(c.dim, 0.7));
  drawText(dc, `> ${text}`, new Rect(pad + 8, h - pad - 14, w - pad * 2 - 16, 12), {
    font: Font.mediumRoundedSystemFont(7.5),
    color: hex(c.inkSoft, 0.9),
    align: "left",
  });
  drawSpark(dc, w - pad - 12, h - pad - 8, 1.3, c.star, 0.7);
}

function modeChip(mode) {
  return (
    {
      day: "DAY FOCUS",
      week: "WEEK FOCUS",
      month: "MONTH FOCUS",
      year: "YEAR FOCUS",
      panel: "PANEL",
      all: "CONTROL",
    }[mode] || "DAY FOCUS"
  );
}

function focusOf(stats, mode) {
  if (mode === "week") return { key: "week", title: "THIS WEEK", stat: stats.week };
  if (mode === "month") return { key: "month", title: "THIS MONTH", stat: stats.month };
  if (mode === "year") return { key: "year", title: "THIS YEAR", stat: stats.year };
  return { key: "day", title: "TODAY", stat: stats.day };
}

// ─── Layouts (space-maxed) ───────────────────────────────────

function paintDayFocus(dc, w, h, family, stats, c) {
  const pad = family === "small" ? 9 : 12;
  const mood = moodFrom(stats.day.rate);
  paintHeader(dc, pad, w, c, modeChip("day"), `${stats.day.done}/${stats.day.total} today`);

  if (family === "small") {
    // Compact: pet + % stacked tight
    drawPet(dc, pad + 32, pad + 62, 18, mood, c, stats.year.rate);
    paintNeonPct(dc, pad + 60, pad + 30, w - pad * 2 - 60, 34, pctLabel(stats.day.rate), c, 26);
    drawText(dc, `${stats.day.done}/${stats.day.total} done`, new Rect(pad + 60, pad + 62, w - pad * 2 - 60, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.inkSoft, 0.95),
      align: "center",
    });
    paintSuccessBar(dc, pad, pad + 78, w - pad * 2, 7, stats.day.rate === null ? 0 : stats.day.rate, c);
    // mini strip
    const y = pad + 92;
    const cw = (w - pad * 2 - 8) / 3;
    ["week", "month", "year"].forEach((k, i) => {
      const st = stats[k];
      fillRoundRect(dc, new Rect(pad + i * (cw + 4), y, cw, h - y - pad), 8, hex(c.dim, 0.75));
      drawText(dc, k, new Rect(pad + i * (cw + 4), y + 3, cw, 10), {
        font: Font.semiboldRoundedSystemFont(7),
        color: hex(c.mute, 0.95),
        align: "center",
      });
      glowText(dc, pctLabel(st.rate), new Rect(pad + i * (cw + 4), y + 14, cw, 16), {
        font: Font.heavyRoundedSystemFont(11),
        colorHex: c.neonPinkSoft,
        align: "center",
        glow: 0.35,
        finalHex: c.neonPink,
      });
      drawText(dc, `${st.done}/${st.total}`, new Rect(pad + i * (cw + 4), y + 30, cw, 10), {
        font: Font.mediumRoundedSystemFont(7),
        color: hex(c.inkSoft, 0.9),
        align: "center",
      });
    });
    return;
  }

  // MEDIUM / LARGE / XL — fill every band
  const headerH = 30;
  const footerH = 18;
  const gap = 8;
  const bodyTop = pad + headerH;
  const bodyBottom = h - pad - footerH - 4;
  const bodyH = bodyBottom - bodyTop;

  if (family === "medium") {
    // Left pet | right hero | bottom 3 cards spanning full width
    const topH = bodyH * 0.58;
    const petW = 100;
    drawPet(dc, pad + 48, bodyTop + topH * 0.55, 28, mood, c, stats.year.rate);

    const hero = { x: pad + petW, y: bodyTop, w: w - pad * 2 - petW, h: topH };
    paintChromePanel(dc, hero, c, { radius: 14 });
    drawText(dc, "TODAY // full detail", new Rect(hero.x + 36, hero.y + 8, hero.w - 46, 12), {
      font: Font.semiboldRoundedSystemFont(8),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    paintNeonPct(dc, hero.x, hero.y + 18, hero.w, 34, pctLabel(stats.day.rate), c, 28);
    drawText(dc, `${stats.day.done}/${stats.day.total} missions cleared`, new Rect(hero.x + 12, hero.y + 52, hero.w - 24, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.inkSoft, 0.95),
      align: "center",
    });
    paintSuccessBar(dc, hero.x + 12, hero.y + 68, hero.w - 24, 8, stats.day.rate === null ? 0 : stats.day.rate, c);

    const cardY = bodyTop + topH + gap;
    const cardH = bodyBottom - cardY;
    const cw = (w - pad * 2 - gap * 2) / 3;
    [
      ["week", stats.week],
      ["month", stats.month],
      ["year", stats.year],
    ].forEach(([label, st], i) => {
      paintStatCard(dc, { x: pad + i * (cw + gap), y: cardY, w: cw, h: cardH }, label, st, c);
    });
    paintFooter(dc, pad, w, h, moodCopy(mood, "today"), c);
    return;
  }

  // LARGE + XL — maximum density console
  const leftW = family === "extraLarge" ? w * 0.3 : w * 0.36;
  const rightX = pad + leftW + gap;
  const rightW = w - rightX - pad;

  // Left column: pet podium + mood + tiny week spark
  const leftPanel = { x: pad, y: bodyTop, w: leftW, h: bodyH * 0.62 };
  paintChromePanel(dc, leftPanel, c, { radius: 16 });
  drawText(dc, "buddy // yr hp", new Rect(leftPanel.x + 36, leftPanel.y + 8, leftPanel.w - 44, 12), {
    font: Font.semiboldRoundedSystemFont(8),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  const petScale = family === "extraLarge" ? 54 : 50;
  drawPet(
    dc,
    leftPanel.x + leftPanel.w / 2,
    leftPanel.y + leftPanel.h * 0.55,
    petScale * 0.92,
    mood,
    c,
    stats.year.rate
  );
  drawText(dc, moodCopy(mood, "today"), new Rect(leftPanel.x + 8, leftPanel.y + leftPanel.h - 28, leftPanel.w - 16, 22), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.inkSoft, 0.92),
    align: "center",
  });

  // Right top: TODAY hero (fills height with %)
  const heroH = bodyH * 0.62;
  const hero = { x: rightX, y: bodyTop, w: rightW, h: heroH };
  paintChromePanel(dc, hero, c, { radius: 16 });
  drawText(dc, "TODAY // full detail", new Rect(hero.x + 36, hero.y + 8, hero.w - 46, 12), {
    font: Font.semiboldRoundedSystemFont(9),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  paintNeonPct(dc, hero.x, hero.y + 22, hero.w * 0.48, 52, pctLabel(stats.day.rate), c, 42);
  drawText(dc, `${stats.day.done} / ${stats.day.total}`, new Rect(hero.x + 12, hero.y + 74, hero.w * 0.48 - 12, 14), {
    font: Font.boldRoundedSystemFont(12),
    color: hex(c.inkSoft, 0.95),
    align: "center",
  });
  drawText(dc, "cleared · set", new Rect(hero.x + 12, hero.y + 90, hero.w * 0.48 - 12, 12), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.mute, 0.9),
    align: "center",
  });
  paintSuccessBar(dc, hero.x + 12, hero.y + 108, hero.w * 0.48 - 12, 11, stats.day.rate === null ? 0 : stats.day.rate, c);
  drawText(dc, "success rate ♥", new Rect(hero.x + 12, hero.y + 122, hero.w * 0.48 - 12, 12), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.mute, 0.85),
    align: "center",
  });

  // Mission list on right half of hero
  paintMissionList(
    dc,
    {
      x: hero.x + hero.w * 0.5,
      y: hero.y + 22,
      w: hero.w * 0.48 - 8,
      h: hero.h - 36,
    },
    stats.day.titles,
    c
  );

  // Bottom row: week / month / year — tall cards eating remaining space
  const cardY = bodyTop + heroH + gap;
  const cardH = bodyBottom - cardY;
  const cw = (w - pad * 2 - gap * 2) / 3;
  [
    ["week", stats.week],
    ["month", stats.month],
    ["year", stats.year],
  ].forEach(([label, st], i) => {
    paintStatCard(
      dc,
      { x: pad + i * (cw + gap), y: cardY, w: cw, h: Math.max(70, cardH) },
      label,
      st,
      c,
      { featured: false }
    );
  });

  // Also fill left bottom under pet with a soft “uptime” card if space
  const leftBottom = { x: pad, y: cardY, w: leftW, h: cardH };
  // week/month/year already full width — left is part of that row. Good.

  paintFooter(dc, pad, w, h, moodCopy(mood, "today"), c);
}

function paintWeekFocus(dc, w, h, family, stats, c) {
  const pad = family === "small" ? 9 : 12;
  const mood = moodFrom(stats.week.rate);
  paintHeader(dc, pad, w, c, modeChip("week"), `${stats.week.done}/${stats.week.total} week`);

  const headerH = 30;
  const footerH = family === "small" ? 0 : 18;
  const bodyTop = pad + headerH;
  const bodyBottom = h - pad - footerH - (footerH ? 4 : 0);

  if (family === "small") {
    paintStatCard(dc, { x: pad, y: bodyTop, w: w - pad * 2, h: bodyBottom - bodyTop - 40 }, "this week", stats.week, c, {
      featured: true,
    });
    paintStatCard(dc, { x: pad, y: bodyBottom - 36, w: w - pad * 2, h: 36 }, "today", stats.day, c);
    return;
  }

  const gap = 8;
  const topH = (bodyBottom - bodyTop - gap) * 0.62;
  drawPet(
    dc,
    pad + 40,
    bodyTop + topH * 0.55,
    family === "large" ? 38 : 26,
    mood,
    c,
    stats.year.rate
  );
  paintStatCard(
    dc,
    { x: pad + 88, y: bodyTop, w: w - pad * 2 - 88, h: topH },
    "this week",
    stats.week,
    c,
    { featured: true }
  );
  const botY = bodyTop + topH + gap;
  const botH = bodyBottom - botY;
  const half = (w - pad * 2 - gap) / 2;
  paintStatCard(dc, { x: pad, y: botY, w: half, h: botH }, "today", stats.day, c);
  paintStatCard(dc, { x: pad + half + gap, y: botY, w: half, h: botH }, "month", stats.month, c);
  paintFooter(dc, pad, w, h, moodCopy(mood, "this week"), c);
}

function paintSingleFocus(dc, w, h, family, stats, c, mode) {
  const pad = family === "small" ? 9 : 12;
  const f = focusOf(stats, mode);
  const mood = moodFrom(f.stat.rate);
  paintHeader(dc, pad, w, c, modeChip(mode), `${f.stat.done}/${f.stat.total} ${f.key}`);

  const headerH = 30;
  const footerH = family === "small" ? 0 : 18;
  const bodyTop = pad + headerH;
  const bodyBottom = h - pad - footerH - (footerH ? 4 : 0);
  const gap = 8;

  if (family === "small") {
    paintStatCard(dc, { x: pad, y: bodyTop, w: w - pad * 2, h: bodyBottom - bodyTop }, f.title, f.stat, c, {
      featured: true,
    });
    return;
  }

  const leftW = family === "large" || family === "extraLarge" ? w * 0.32 : 100;
  drawPet(
    dc,
    pad + leftW * 0.45,
    (bodyTop + bodyBottom) / 2 + 8,
    family === "large" ? 42 : 28,
    mood,
    c,
    stats.year.rate
  );
  paintStatCard(
    dc,
    { x: pad + leftW, y: bodyTop, w: w - pad * 2 - leftW, h: bodyBottom - bodyTop },
    f.title,
    f.stat,
    c,
    { featured: true }
  );
  paintFooter(dc, pad, w, h, moodCopy(mood, f.key), c);
}

function paintPanel(dc, w, h, family, stats, c) {
  const pad = family === "small" ? 9 : 12;
  const mood = moodFrom(stats.day.rate);
  paintHeader(dc, pad, w, c, modeChip("panel"), "today · week · month");

  const headerH = 30;
  const footerH = family === "small" ? 0 : 18;
  const bodyTop = pad + headerH;
  const bodyBottom = h - pad - footerH - (footerH ? 4 : 0);
  const gap = 8;

  if (family === "small") {
    const h1 = (bodyBottom - bodyTop - gap) * 0.45;
    paintStatCard(dc, { x: pad, y: bodyTop, w: w - pad * 2, h: h1 }, "today", stats.day, c, { featured: true });
    const h2 = bodyBottom - bodyTop - gap - h1;
    const half = (w - pad * 2 - gap) / 2;
    paintStatCard(dc, { x: pad, y: bodyTop + h1 + gap, w: half, h: h2 }, "week", stats.week, c);
    paintStatCard(dc, { x: pad + half + gap, y: bodyTop + h1 + gap, w: half, h: h2 }, "month", stats.month, c);
    return;
  }

  // Day featured top, week+month bottom — full bleed
  const topH = (bodyBottom - bodyTop - gap) * 0.58;
  drawPet(
    dc,
    pad + 36,
    bodyTop + topH * 0.58,
    family === "large" ? 36 : 24,
    mood,
    c,
    stats.year.rate
  );
  paintStatCard(
    dc,
    { x: pad + 78, y: bodyTop, w: w - pad * 2 - 78, h: topH },
    "today",
    stats.day,
    c,
    { featured: true }
  );
  const botY = bodyTop + topH + gap;
  const botH = bodyBottom - botY;
  const half = (w - pad * 2 - gap) / 2;
  paintStatCard(dc, { x: pad, y: botY, w: half, h: botH }, "this week", stats.week, c);
  paintStatCard(dc, { x: pad + half + gap, y: botY, w: half, h: botH }, "this month", stats.month, c);
  paintFooter(dc, pad, w, h, moodCopy(mood, "today"), c);
}

// ─── Render ──────────────────────────────────────────────────

async function render(family, mode) {
  const c = CONFIG.colors;
  const stats = await gatherStats();
  const size = widgetSizeFor(family);
  const w = size.width;
  const h = size.height;

  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;

  paintBackground(dc, w, h, c);

  if (mode === "panel") paintPanel(dc, w, h, family, stats, c);
  else if (mode === "week") paintWeekFocus(dc, w, h, family, stats, c);
  else if (mode === "month" || mode === "year") paintSingleFocus(dc, w, h, family, stats, c, mode);
  else paintDayFocus(dc, w, h, family, stats, c); // day + all

  const widget = new ListWidget();
  widget.backgroundImage = dc.getImage();
  widget.setPadding(0, 0, 0, 0);
  widget.refreshAfterDate = new Date(Date.now() + 20 * 60 * 1000);
  return widget;
}

async function presentFamily(family, widget) {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else if (family === "extraLarge") await widget.presentExtraLarge();
  else await widget.presentMedium();
}

const mode = parseMode(args.widgetParameter);
const family = config.widgetFamily || "large";

if (config.runsInWidget) {
  Script.setWidget(await render(family, mode));
} else {
  const table = new UITable();
  table.showSeparators = false;
  const header = new UITableRow();
  header.addText("♥ Stellara Pet Console", "Pick view · use same word as Widget Parameter");
  table.addRow(header);

  for (const [m, hint] of [
    ["day", "DAY focus + soft week/month/year"],
    ["week", "WEEK focus + today"],
    ["month", "MONTH focus"],
    ["year", "YEAR focus"],
    ["panel", "today vs week vs month"],
    ["all", "same as day control panel"],
  ]) {
    const row = new UITableRow();
    row.addText(m.toUpperCase(), hint);
    row.dismissOnSelect = false;
    row.onSelect = async () => {
      const pick = new UITable();
      for (const f of ["small", "medium", "large", "extraLarge"]) {
        const r = new UITableRow();
        r.addText(f.toUpperCase(), "Preview");
        r.onSelect = async () => presentFamily(f, await render(f, m));
        pick.addRow(r);
      }
      await pick.present();
    };
    table.addRow(row);
  }

  try {
    const s = await gatherStats();
    const info = new UITableRow();
    info.addText(
      "Live",
      `today ${s.day.done}/${s.day.total} · week ${s.week.done}/${s.week.total} · month ${s.month.done}/${s.month.total} · year ${s.year.done}/${s.year.total}`
    );
    table.addRow(info);
  } catch (e) {
    const info = new UITableRow();
    info.addText("Reminders", "Allow access, then run again");
    table.addRow(info);
  }

  await table.present();
}

Script.complete();
