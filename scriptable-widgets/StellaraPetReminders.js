// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♥ STELLARA PET — Reminder Success Console
// Premium coquette × girl-coder hacker pet buddy.
// Tracks completed / set reminders (success rate)
// for today · week · month · year.
//
// VERSION: 2026-08-02-focus-hp
// (if your Scriptable file does not say that, you have an old paste)
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

/** Focus success rate → 0–4 hearts (the pet’s HP). */
function heartsFromRate(rate) {
  if (rate === null) return 0;
  return Math.max(0, Math.min(4, Math.round(rate * 4)));
}

/**
 * Floating HP hearts only — no circle / bay.
 * Rate comes from the widget’s main focus view.
 */
function drawFocusHearts(dc, cx, y, scale, focusRate, c) {
  const filled = heartsFromRate(focusRate);
  const px = Math.max(1.35, scale * 0.13);
  const heartW = 7 * px;
  const heartH = 6 * px;
  const gap = Math.max(1.4, px * 0.65);
  const totalW = heartW * 4 + gap * 3;
  let hx = cx - totalW / 2;
  for (let i = 0; i < 4; i++) {
    const on = i < filled;
    drawPixelHeart(dc, hx, y, px, on ? c.neonPink : c.dimStroke, on);
    hx += heartW + gap;
  }
  return heartH;
}

/** Pet body only (no HP bay). */
function drawPetBody(dc, cx, cy, scale, mood, c) {
  const s = scale;
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
  // Soft mood tint only — no hard halo circle behind the pet
  softBlob(dc, cx, cy + s * 0.05, s * 0.95, aura, 0.16);
  softBlob(dc, cx, cy + s * 0.1, s * 0.75, c.petBody, 0.22);

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

/**
 * Auto-fit pet + floating HP hearts inside a rect.
 * Hearts + mood both use the main focus view’s success rate.
 */
function drawPetBundle(dc, rect, mood, c, focusRate) {
  const { x, y, w, h } = rect;
  if (w < 20 || h < 28) return;

  // Hearts row (~0.9*s) + gap + pet (ears→chin ≈ 2.05*s)
  const heartGap = 4;
  let s = Math.min(w / 2.05, h / 2.85);
  s = Math.max(12, Math.min(s, 48));
  let heartBand = Math.max(8, s * 0.85);

  let totalH = heartBand + heartGap + s * 2.05;
  if (totalH > h - 1) {
    const k = (h - 1) / totalH;
    s *= k;
    heartBand *= k;
    totalH = heartBand + heartGap + s * 2.05;
  }

  const cx = x + w / 2;
  const top = y + Math.max(0, (h - totalH) / 2);
  drawFocusHearts(dc, cx, top + Math.max(0, (heartBand - s * 0.7) / 2), s, focusRate, c);
  const petCy = top + heartBand + heartGap + s * 1.05;
  drawPetBody(dc, cx, Math.min(petCy, y + h - s * 0.95), s, mood, c);
}

/**
 * Split [top, bottom) into exclusive bands by weight + minimum heights.
 * Bands never overlap; if mins exceed space, mins shrink proportionally.
 */
function snapBands(top, bottom, specs) {
  const H = Math.max(0, bottom - top);
  const n = specs.length;
  if (!n || H <= 0) return specs.map(() => ({ y: top, h: 0 }));

  let mins = specs.map((s) => Math.max(0, s.min || 0));
  let minSum = mins.reduce((a, b) => a + b, 0);
  if (minSum > H) {
    const k = H / minSum;
    mins = mins.map((m) => m * k);
    minSum = H;
  }
  const leftover = H - minSum;
  const weights = specs.map((s) => Math.max(0, s.weight == null ? 1 : s.weight));
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const heights = mins.map((m, i) => m + leftover * (weights[i] / wSum));

  const bands = [];
  let y = top;
  for (let i = 0; i < n; i++) {
    bands.push({ y, h: heights[i] });
    y += heights[i];
  }
  // Absorb float drift into last band
  if (bands.length) {
    const drift = bottom - (bands[bands.length - 1].y + bands[bands.length - 1].h);
    bands[bands.length - 1].h += drift;
  }
  return bands;
}

/** Exclusive chrome bands (header / body / footer) that never overlap. */
function bandLayout(w, h, family) {
  const pad = family === "small" ? 8 : family === "medium" ? 9 : 12;
  const headerH = family === "small" ? 20 : family === "medium" ? 24 : 26;
  const footerH = family === "small" ? 0 : family === "medium" ? 12 : 14;
  const gap = family === "medium" ? 4 : 6;
  const top = pad;
  const bottom = h - pad;
  const headerY = top;
  const footerY = footerH ? bottom - footerH : bottom;
  const bodyTop = headerY + headerH + 2;
  const bodyBottom = footerY - (footerH ? 2 : 0);
  return { pad, gap, headerH, footerH, headerY, bodyTop, bodyBottom, footerY, w, h, family };
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

function paintHeader(dc, L, c, modeLabel, statusRight) {
  const { pad, headerY, w, headerH } = L;
  drawHeart(dc, pad + 6, headerY + 7, 5.2, c.neonPink, 1);
  glowText(dc, CONFIG.name, new Rect(pad + 16, headerY, w * 0.55, 14), {
    font: Font.boldRoundedSystemFont(11),
    colorHex: c.neonPinkSoft,
    align: "left",
    glow: 0.45,
    finalHex: c.neonPink,
  });
  drawText(dc, modeLabel, new Rect(pad, headerY, w - pad * 2, 12), {
    font: Font.semiboldRoundedSystemFont(8),
    color: hex(c.mute, 0.95),
    align: "right",
  });
  if (headerH >= 24) {
    drawText(dc, CONFIG.tagline, new Rect(pad, headerY + 13, w * 0.58, 11), {
      font: Font.mediumRoundedSystemFont(7.5),
      color: hex(c.mute, 0.9),
      align: "left",
    });
    drawText(dc, statusRight || "sys ♥ online", new Rect(pad, headerY + 13, w - pad * 2, 11), {
      font: Font.mediumRoundedSystemFont(7.5),
      color: hex(c.neonPinkSoft, 0.9),
      align: "right",
    });
  }
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
  if (h < 22 || w < 28) return;

  const compact = h < 48;
  const tight = h < 38;
  paintChromePanel(dc, rect, c, {
    radius: Math.min(compact ? 10 : 12, h * 0.22),
    glow: featured && h > 60,
  });

  const inset = compact ? 6 : 8;
  const barH = featured && h >= 60 ? 8 : h >= 50 ? 5 : 3.5;
  const barY = y + h - inset - barH;
  const innerBottom = barY - 2;
  const chromeTop = tight ? 4 : compact ? 6 : 12; // room under traffic dots
  const innerTop = y + chromeTop;

  if (tight) {
    // One row: LABEL · done … pct   + bar
    drawText(dc, label.toUpperCase(), new Rect(x + inset, innerTop, w * 0.42, 11), {
      font: Font.semiboldRoundedSystemFont(6.5),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    drawText(dc, `${stat.done}/${stat.total}`, new Rect(x + inset, innerTop + 10, w * 0.42, 10), {
      font: Font.mediumRoundedSystemFont(6.5),
      color: hex(c.inkSoft, 0.95),
      align: "left",
    });
    const pctH = Math.max(12, innerBottom - innerTop);
    paintNeonPct(dc, x + w * 0.35, innerTop, w * 0.62, pctH, pctLabel(stat.rate), c, Math.min(14, pctH * 0.85));
    paintSuccessBar(dc, x + inset, barY, w - inset * 2, barH, stat.rate === null ? 0 : stat.rate, c);
    return;
  }

  if (compact) {
    // Label + done on top strip, pct fills middle, bar pinned bottom — never overflows
    const topBand = 12;
    drawText(dc, label.toUpperCase(), new Rect(x + inset, innerTop, w * 0.55, 10), {
      font: Font.semiboldRoundedSystemFont(7),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    drawText(dc, `${stat.done}/${stat.total} done`, new Rect(x + inset, innerTop, w - inset * 2, 10), {
      font: Font.mediumRoundedSystemFont(6.5),
      color: hex(c.inkSoft, 0.9),
      align: "right",
    });
    const pctTop = innerTop + topBand;
    const pctH = Math.max(12, innerBottom - pctTop);
    if (pctH >= 12) {
      paintNeonPct(dc, x, pctTop, w, pctH, pctLabel(stat.rate), c, Math.min(featured ? 20 : 15, pctH * 0.8));
    }
    paintSuccessBar(dc, x + inset, barY, w - inset * 2, barH, stat.rate === null ? 0 : stat.rate, c);
    return;
  }

  // Comfortable card — exclusive vertical stack inside panel
  const labelH = 11;
  const doneH = 11;
  const labelY = innerTop;
  const doneY = innerBottom - doneH;
  const pctTop = labelY + labelH + 1;
  const pctBottom = doneY - 1;
  const pctH = Math.max(0, pctBottom - pctTop);
  const pctSize = Math.min(featured ? 28 : 16, Math.max(11, pctH * 0.7));

  drawText(dc, label.toUpperCase(), new Rect(x + inset, labelY, w - inset * 2, labelH), {
    font: Font.semiboldRoundedSystemFont(8),
    color: hex(c.mute, 0.95),
    align: "left",
  });

  if (pctH >= 14) {
    paintNeonPct(dc, x, pctTop, w, pctH, pctLabel(stat.rate), c, pctSize);
  }

  drawText(dc, `${stat.done}/${stat.total} done`, new Rect(x + inset, doneY, w - inset * 2, doneH), {
    font: Font.mediumRoundedSystemFont(7.5),
    color: hex(c.inkSoft, 0.95),
    align: "left",
  });

  paintSuccessBar(dc, x + inset, barY, w - inset * 2, barH, stat.rate === null ? 0 : stat.rate, c);
}

function paintFooter(dc, L, text, c) {
  if (!L.footerH) return;
  const { pad, footerY, w } = L;
  fillRoundRect(dc, new Rect(pad, footerY, w - pad * 2, L.footerH), 7, hex(c.dim, 0.75));
  drawText(dc, `> ${text}`, new Rect(pad + 7, footerY + 1, w - pad * 2 - 20, L.footerH - 2), {
    font: Font.mediumRoundedSystemFont(7),
    color: hex(c.inkSoft, 0.9),
    align: "left",
  });
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

// ─── Layouts (exclusive bands — auto-snap, no overlap) ───────

function paintHeroToday(dc, rect, stats, c, { showMissions = false } = {}) {
  const { x, y, w, h } = rect;
  if (h < 32) return;
  const compact = h < 56;
  paintChromePanel(dc, rect, c, { radius: compact ? 10 : 12, glow: !compact });
  drawText(dc, compact ? "TODAY // detail" : "TODAY // full detail", new Rect(x + 34, y + (compact ? 5 : 7), w - 42, 11), {
    font: Font.semiboldRoundedSystemFont(compact ? 7 : 8),
    color: hex(c.mute, 0.95),
    align: "left",
  });

  const inset = compact ? 8 : 10;
  const barH = compact ? 5 : 7;
  const barY = y + h - inset - barH;
  const doneH = 11;
  const doneY = barY - doneH - 1;
  const pctTop = y + (compact ? 16 : 20);
  const pctH = Math.max(14, doneY - pctTop - 1);

  if (showMissions && w > 180 && h >= 70) {
    const leftW = w * 0.48;
    paintNeonPct(dc, x, pctTop, leftW, Math.min(44, pctH), pctLabel(stats.day.rate), c, Math.min(34, pctH * 0.85));
    drawText(dc, `${stats.day.done}/${stats.day.total} cleared`, new Rect(x + inset, doneY, leftW - inset * 2, doneH), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.inkSoft, 0.95),
      align: "center",
    });
    paintSuccessBar(dc, x + inset, barY, leftW - inset * 2, barH, stats.day.rate === null ? 0 : stats.day.rate, c);
    paintMissionList(dc, { x: x + leftW, y: y + 18, w: w - leftW - 8, h: h - 26 }, stats.day.titles, c);
  } else {
    paintNeonPct(dc, x, pctTop, w, Math.min(compact ? 28 : 36, pctH), pctLabel(stats.day.rate), c, Math.min(compact ? 22 : 28, pctH * 0.8));
    drawText(dc, `${stats.day.done}/${stats.day.total} missions cleared`, new Rect(x + inset, doneY, w - inset * 2, doneH), {
      font: Font.mediumRoundedSystemFont(compact ? 7 : 8),
      color: hex(c.inkSoft, 0.95),
      align: "center",
    });
    paintSuccessBar(dc, x + inset, barY, w - inset * 2, barH, stats.day.rate === null ? 0 : stats.day.rate, c);
  }
}

function paintDayFocus(dc, w, h, family, stats, c) {
  const L = bandLayout(w, h, family);
  const mood = moodFrom(stats.day.rate);
  paintHeader(dc, L, c, modeChip("day"), `${stats.day.done}/${stats.day.total} today`);

  const gap = L.gap;
  // Auto-snap top (pet+hero) vs bottom (week/month/year) so nothing collides
  const [topBand] = snapBands(L.bodyTop, L.bodyBottom, [
    { min: family === "medium" ? 52 : family === "small" ? 48 : 90, weight: family === "medium" ? 1.35 : 1.55 },
    { min: family === "medium" ? 36 : family === "small" ? 32 : 48, weight: 1 },
  ]);
  // Gap reserved between top (pet+hero) and bottom cards — exclusive bands, no overlap
  const topH = Math.max(0, topBand.h - gap * 0.5);
  const cardY = topBand.y + topH + gap;
  const cardH = Math.max(0, L.bodyBottom - cardY);

  const focusRate = stats.day.rate;

  if (family === "small") {
    const petW = 58;
    drawPetBundle(dc, { x: L.pad, y: topBand.y, w: petW, h: topH }, mood, c, focusRate);
    paintHeroToday(
      dc,
      { x: L.pad + petW + 4, y: topBand.y, w: w - L.pad * 2 - petW - 4, h: topH },
      stats,
      c
    );
    const cw = (w - L.pad * 2 - gap * 2) / 3;
    ["week", "month", "year"].forEach((k, i) => {
      paintStatCard(dc, { x: L.pad + i * (cw + gap), y: cardY, w: cw, h: cardH }, k, stats[k], c);
    });
    return;
  }

  const petW = family === "extraLarge" ? w * 0.26 : family === "large" ? w * 0.3 : 78;

  if (family === "large" || family === "extraLarge") {
    const leftPanel = { x: L.pad, y: topBand.y, w: petW, h: topH };
    paintChromePanel(dc, leftPanel, c, { radius: 14, glow: true });
    drawText(dc, "buddy // day hp", new Rect(leftPanel.x + 34, leftPanel.y + 7, leftPanel.w - 40, 11), {
      font: Font.semiboldRoundedSystemFont(8),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    drawPetBundle(
      dc,
      { x: leftPanel.x + 4, y: leftPanel.y + 18, w: leftPanel.w - 8, h: leftPanel.h - 22 },
      mood,
      c,
      focusRate
    );
  } else {
    drawPetBundle(dc, { x: L.pad, y: topBand.y, w: petW, h: topH }, mood, c, focusRate);
  }

  paintHeroToday(
    dc,
    {
      x: L.pad + petW + gap,
      y: topBand.y,
      w: w - L.pad * 2 - petW - gap,
      h: topH,
    },
    stats,
    c,
    { showMissions: family === "large" || family === "extraLarge" }
  );

  const cw = (w - L.pad * 2 - gap * 2) / 3;
  [
    ["week", stats.week],
    ["month", stats.month],
    ["year", stats.year],
  ].forEach(([label, st], i) => {
    paintStatCard(dc, { x: L.pad + i * (cw + gap), y: cardY, w: cw, h: cardH }, label, st, c);
  });

  paintFooter(dc, L, moodCopy(mood, "today"), c);
}

function paintWeekFocus(dc, w, h, family, stats, c) {
  const L = bandLayout(w, h, family);
  const mood = moodFrom(stats.week.rate);
  paintHeader(dc, L, c, modeChip("week"), `${stats.week.done}/${stats.week.total} week`);

  const gap = L.gap;
  const [topBand, botBand] = snapBands(L.bodyTop, L.bodyBottom, [
    { min: family === "medium" ? 54 : 48, weight: 1.5 },
    { min: family === "medium" ? 34 : 36, weight: 1 },
  ]);
  const topH = Math.max(0, topBand.h - gap * 0.5);
  const botY = topBand.y + topH + gap;
  const botH = Math.max(0, L.bodyBottom - botY);

  if (family === "small") {
    paintStatCard(
      dc,
      { x: L.pad, y: topBand.y, w: w - L.pad * 2, h: topH },
      "this week",
      stats.week,
      c,
      { featured: true }
    );
    paintStatCard(dc, { x: L.pad, y: botY, w: w - L.pad * 2, h: botH }, "today", stats.day, c);
    return;
  }

  const petW = family === "large" || family === "extraLarge" ? 100 : 72;
  drawPetBundle(dc, { x: L.pad, y: topBand.y, w: petW, h: topH }, mood, c, stats.week.rate);
  paintStatCard(
    dc,
    { x: L.pad + petW + gap, y: topBand.y, w: w - L.pad * 2 - petW - gap, h: topH },
    "this week",
    stats.week,
    c,
    { featured: true }
  );
  const half = (w - L.pad * 2 - gap) / 2;
  paintStatCard(dc, { x: L.pad, y: botY, w: half, h: botH }, "today", stats.day, c);
  paintStatCard(dc, { x: L.pad + half + gap, y: botY, w: half, h: botH }, "month", stats.month, c);
  paintFooter(dc, L, moodCopy(mood, "this week"), c);
}

function paintSingleFocus(dc, w, h, family, stats, c, mode) {
  const L = bandLayout(w, h, family);
  const f = focusOf(stats, mode);
  const mood = moodFrom(f.stat.rate);
  paintHeader(dc, L, c, modeChip(mode), `${f.stat.done}/${f.stat.total} ${f.key}`);

  const bodyH = L.bodyBottom - L.bodyTop;
  if (family === "small") {
    paintStatCard(
      dc,
      { x: L.pad, y: L.bodyTop, w: w - L.pad * 2, h: bodyH },
      f.title,
      f.stat,
      c,
      { featured: true }
    );
    return;
  }

  const petW = family === "large" || family === "extraLarge" ? w * 0.28 : 80;
  drawPetBundle(dc, { x: L.pad, y: L.bodyTop, w: petW, h: bodyH }, mood, c, f.stat.rate);
  paintStatCard(
    dc,
    {
      x: L.pad + petW + L.gap,
      y: L.bodyTop,
      w: w - L.pad * 2 - petW - L.gap,
      h: bodyH,
    },
    f.title,
    f.stat,
    c,
    { featured: true }
  );
  paintFooter(dc, L, moodCopy(mood, f.key), c);
}

function paintPanel(dc, w, h, family, stats, c) {
  const L = bandLayout(w, h, family);
  const mood = moodFrom(stats.day.rate);
  paintHeader(dc, L, c, modeChip("panel"), "today · week · month");

  const gap = L.gap;
  const [topBand] = snapBands(L.bodyTop, L.bodyBottom, [
    { min: family === "medium" ? 54 : 48, weight: 1.5 },
    { min: family === "medium" ? 34 : 36, weight: 1 },
  ]);
  const topH = Math.max(0, topBand.h - gap * 0.5);
  const botY = topBand.y + topH + gap;
  const botH = Math.max(0, L.bodyBottom - botY);

  if (family === "small") {
    paintStatCard(
      dc,
      { x: L.pad, y: topBand.y, w: w - L.pad * 2, h: topH },
      "today",
      stats.day,
      c,
      { featured: true }
    );
    const half = (w - L.pad * 2 - gap) / 2;
    paintStatCard(dc, { x: L.pad, y: botY, w: half, h: botH }, "week", stats.week, c);
    paintStatCard(dc, { x: L.pad + half + gap, y: botY, w: half, h: botH }, "month", stats.month, c);
    return;
  }

  const petW = family === "large" || family === "extraLarge" ? 90 : 70;
  drawPetBundle(dc, { x: L.pad, y: topBand.y, w: petW, h: topH }, mood, c, stats.day.rate);
  paintStatCard(
    dc,
    { x: L.pad + petW + gap, y: topBand.y, w: w - L.pad * 2 - petW - gap, h: topH },
    "today",
    stats.day,
    c,
    { featured: true }
  );
  const half = (w - L.pad * 2 - gap) / 2;
  paintStatCard(dc, { x: L.pad, y: botY, w: half, h: botH }, "this week", stats.week, c);
  paintStatCard(dc, { x: L.pad + half + gap, y: botY, w: half, h: botH }, "this month", stats.month, c);
  paintFooter(dc, L, moodCopy(mood, "today"), c);
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
