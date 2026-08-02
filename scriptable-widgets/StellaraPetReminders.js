// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♥ STELLARA PET — Reminder Success Buddy
// Cute coquette pet that tracks reminder completion
// (set vs done) for day / week / month / year.
//
// Widget Parameter (Edit Widget → Parameter):
//   day      → DAY focus (full detail) + soft week/month/year   [default]
//   week     → WEEK focus + today mentioned
//   month    → MONTH focus + soft others
//   year     → YEAR focus + soft today
//   panel    → today vs week vs month control panel
//   all      → day featured + week/month/year side panel
//
// Needs Reminders access the first time you run it.
// Re-paste + remove/re-add widget after updates.

const CONFIG = {
  name: "STELLARA PET",
  tagline: "reminder success buddy ♥",
  colors: {
    bg0: "#fff7fb",
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
    gYellow: "#ffe566",
    gPink: "#ff6fb5",
    gPurple: "#c084fc",
    gBlue: "#8ecbff",
    petBody: "#ffc9de",
    petCheek: "#ff8eb8",
    petEye: "#5a2a40",
  },
};

// ─── View modes ──────────────────────────────────────────────

function parseMode(raw) {
  const m = String(raw || "day").trim().toLowerCase();
  if (["day", "week", "month", "year", "panel", "all"].includes(m)) return m;
  return "day";
}

// ─── Date helpers ────────────────────────────────────────────

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeek(d) {
  // Sunday-start to match many iOS locales; adjust if needed
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

function dueDateOf(reminder) {
  if (reminder.dueDate) return reminder.dueDate;
  if (reminder.dueDateComponents && reminder.dueDateComponents.date) {
    return reminder.dueDateComponents.date;
  }
  return null;
}

function inRange(date, start, end) {
  if (!date) return false;
  return date >= start && date <= end;
}

function rateOf(done, total) {
  if (!total || total <= 0) return null; // no tasks set
  return Math.min(1, Math.max(0, done / total));
}

function pctLabel(rate) {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

// ─── Reminders stats ─────────────────────────────────────────

async function gatherStats() {
  const now = new Date();
  const dayS = startOfDay(now);
  const dayE = endOfDay(now);
  const weekS = startOfWeek(now);
  const weekE = endOfWeek(now);
  const monthS = startOfMonth(now);
  const monthE = endOfMonth(now);
  const yearS = startOfYear(now);
  const yearE = endOfYear(now);

  // Prefer built-in fetches; fall back gracefully
  let dueToday = [];
  let dueWeek = [];
  let all = [];

  try {
    dueToday = await Reminder.allDueToday();
  } catch (e) {
    dueToday = [];
  }
  try {
    dueWeek = await Reminder.allDueThisWeek();
  } catch (e) {
    dueWeek = [];
  }
  try {
    all = await Reminder.all();
  } catch (e) {
    all = [];
  }

  function tally(list, start, end) {
    let total = 0;
    let done = 0;
    for (const r of list) {
      const due = dueDateOf(r);
      if (!inRange(due, start, end)) continue;
      total += 1;
      if (r.isCompleted) done += 1;
    }
    return { total, done, rate: rateOf(done, total) };
  }

  // Today / week from dedicated lists (more accurate), month/year from all
  const day = (() => {
    let total = dueToday.length;
    let done = dueToday.filter((r) => r.isCompleted).length;
    // If allDueToday failed empty but all has data, fall back
    if (total === 0 && all.length) return tally(all, dayS, dayE);
    return { total, done, rate: rateOf(done, total) };
  })();

  const week = (() => {
    let total = dueWeek.length;
    let done = dueWeek.filter((r) => r.isCompleted).length;
    if (total === 0 && all.length) return tally(all, weekS, weekE);
    return { total, done, rate: rateOf(done, total) };
  })();

  const month = tally(all.length ? all : dueWeek.concat(dueToday), monthS, monthE);
  const year = tally(all.length ? all : dueWeek.concat(dueToday), yearS, yearE);

  return { day, week, month, year, now };
}

// ─── Draw helpers ────────────────────────────────────────────

function hex(h, a = 1) {
  return new Color(h, a);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixHex(a, b, t) {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16);
  const ag = parseInt(pa.slice(2, 4), 16);
  const ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16);
  const bg = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return "#" + [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("");
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
  dc.drawTextInRect(text, rect);
}

function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.45, finalHex } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.45],
    [0, -1, glow * 0.4],
    [1, 0, glow * 0.35],
    [-1, 0, glow * 0.35],
  ];
  for (const [ox, oy, a] of offsets) {
    drawText(dc, text, new Rect(rect.x + ox, rect.y + oy, rect.width, rect.height), {
      font,
      color: hex(colorHex, a),
      align,
    });
  }
  drawText(dc, text, rect, {
    font,
    color: hex(finalHex || colorHex, 1),
    align,
  });
}

// ─── Pet mood + drawing ──────────────────────────────────────

function moodFrom(rate) {
  if (rate === null) return "idle"; // no tasks
  if (rate >= 0.85) return "sparkle";
  if (rate >= 0.6) return "happy";
  if (rate >= 0.35) return "okay";
  if (rate > 0) return "sleepy";
  return "encourage"; // 0% with tasks
}

function moodCopy(mood, focusLabel) {
  switch (mood) {
    case "sparkle":
      return `you’re sparkling!! ${focusLabel} crushed ♥`;
    case "happy":
      return `good girl energy · ${focusLabel} glowing`;
    case "okay":
      return `soft progress on ${focusLabel} · keep going`;
    case "sleepy":
      return `tiny steps count · ${focusLabel} needs love`;
    case "encourage":
      return `you got this · tap a reminder for ${focusLabel}`;
    default:
      return `waiting for cute missions · ${focusLabel}`;
  }
}

function drawPet(dc, cx, cy, scale, mood, c) {
  const s = scale;
  // Soft aura by mood
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
  softBlob(dc, cx, cy, s * 1.35, aura, 0.28);
  softBlob(dc, cx, cy + s * 0.1, s * 1.05, c.petBody, 0.35);

  // Body
  dc.setFillColor(hex(c.petBody, 1));
  dc.fillEllipse(new Rect(cx - s * 0.85, cy - s * 0.75, s * 1.7, s * 1.65));
  // Belly
  dc.setFillColor(hex("#fff5fa", 0.85));
  dc.fillEllipse(new Rect(cx - s * 0.45, cy - s * 0.15, s * 0.9, s * 0.85));

  // Ears / little horns of cuteness
  dc.setFillColor(hex(c.petBody, 1));
  dc.fillEllipse(new Rect(cx - s * 0.85, cy - s * 1.05, s * 0.55, s * 0.55));
  dc.fillEllipse(new Rect(cx + s * 0.3, cy - s * 1.05, s * 0.55, s * 0.55));
  dc.setFillColor(hex(c.petCheek, 0.85));
  dc.fillEllipse(new Rect(cx - s * 0.72, cy - s * 0.95, s * 0.28, s * 0.28));
  dc.fillEllipse(new Rect(cx + s * 0.44, cy - s * 0.95, s * 0.28, s * 0.28));

  // Cheeks
  softBlob(dc, cx - s * 0.42, cy + s * 0.12, s * 0.18, c.petCheek, 0.55);
  softBlob(dc, cx + s * 0.42, cy + s * 0.12, s * 0.18, c.petCheek, 0.55);

  // Eyes
  const eyeY = cy - s * 0.18;
  const eyeDX = s * 0.28;
  if (mood === "sleepy") {
    dc.setFillColor(hex(c.petEye, 0.9));
    dc.fillRect(new Rect(cx - eyeDX - s * 0.12, eyeY, s * 0.24, s * 0.05));
    dc.fillRect(new Rect(cx + eyeDX - s * 0.12, eyeY, s * 0.24, s * 0.05));
  } else if (mood === "encourage") {
    // determined little dots
    dc.setFillColor(hex(c.petEye, 1));
    dc.fillEllipse(new Rect(cx - eyeDX - s * 0.1, eyeY - s * 0.08, s * 0.2, s * 0.22));
    dc.fillEllipse(new Rect(cx + eyeDX - s * 0.1, eyeY - s * 0.08, s * 0.2, s * 0.22));
  } else {
    dc.setFillColor(hex(c.petEye, 1));
    dc.fillEllipse(new Rect(cx - eyeDX - s * 0.13, eyeY - s * 0.12, s * 0.26, s * 0.3));
    dc.fillEllipse(new Rect(cx + eyeDX - s * 0.13, eyeY - s * 0.12, s * 0.26, s * 0.3));
    dc.setFillColor(hex("#ffffff", 0.95));
    dc.fillEllipse(new Rect(cx - eyeDX - s * 0.02, eyeY - s * 0.14, s * 0.1, s * 0.1));
    dc.fillEllipse(new Rect(cx + eyeDX - s * 0.02, eyeY - s * 0.14, s * 0.1, s * 0.1));
  }

  // Mouth
  dc.setFillColor(hex(c.petEye, 0.85));
  if (mood === "sparkle" || mood === "happy") {
    // smile arc via small ellipses trick
    dc.fillEllipse(new Rect(cx - s * 0.16, cy + s * 0.22, s * 0.32, s * 0.18));
    dc.setFillColor(hex(c.petBody, 1));
    dc.fillEllipse(new Rect(cx - s * 0.16, cy + s * 0.14, s * 0.32, s * 0.16));
  } else if (mood === "okay" || mood === "idle") {
    dc.fillEllipse(new Rect(cx - s * 0.06, cy + s * 0.28, s * 0.12, s * 0.1));
  } else {
    // soft frown / o mouth
    dc.fillEllipse(new Rect(cx - s * 0.08, cy + s * 0.26, s * 0.16, s * 0.14));
  }

  // Sparkle accessories
  if (mood === "sparkle") {
    drawSpark(dc, cx + s * 0.85, cy - s * 0.7, s * 0.16, c.star, 0.95);
    drawSpark(dc, cx - s * 0.9, cy - s * 0.4, s * 0.12, c.gYellow, 0.85);
    drawHeart(dc, cx + s * 0.75, cy + s * 0.55, s * 0.22, c.neonPink, 0.95);
  } else if (mood === "happy") {
    drawHeart(dc, cx + s * 0.8, cy - s * 0.55, s * 0.2, c.neonPink, 0.9);
  } else if (mood === "idle") {
    drawSpark(dc, cx + s * 0.75, cy - s * 0.55, s * 0.12, c.lav, 0.7);
  }
}

// ─── Layout sizes ────────────────────────────────────────────

function widgetSizeFor(family) {
  if (family === "small") return new Size(170, 170);
  if (family === "large") return new Size(360, 380);
  if (family === "extraLarge") return new Size(720, 360);
  return new Size(360, 170);
}

// ─── UI pieces ───────────────────────────────────────────────

function paintBackground(dc, w, h, c) {
  dc.setFillColor(hex(c.bg0));
  dc.fillRect(new Rect(0, 0, w, h));
  softBlob(dc, w * 0.15, h * 0.1, Math.max(w, h) * 0.5, c.sakuraSoft, 0.22);
  softBlob(dc, w * 0.9, h * 0.2, Math.max(w, h) * 0.4, c.lav, 0.16);
  softBlob(dc, w * 0.8, h * 0.95, Math.max(w, h) * 0.42, c.gBlue, 0.12);
  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.panel, 0.55));
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.frame, 0.55), 1.2);
}

function paintBrand(dc, x, y, w, c, modeLabel) {
  drawHeart(dc, x + 6, y + 7, 5.5, c.neonPink, 1);
  glowText(dc, CONFIG.name, new Rect(x + 16, y, w * 0.7, 14), {
    font: Font.boldRoundedSystemFont(11),
    colorHex: c.neonPinkSoft,
    align: "left",
    glow: 0.45,
    finalHex: c.neonPink,
  });
  drawText(dc, modeLabel, new Rect(x, y, w, 14), {
    font: Font.semiboldRoundedSystemFont(9),
    color: hex(c.mute, 0.95),
    align: "right",
  });
  drawText(dc, CONFIG.tagline, new Rect(x, y + 14, w, 12), {
    font: Font.mediumRoundedSystemFont(8),
    color: hex(c.mute, 0.9),
    align: "left",
  });
}

function paintSuccessBar(dc, x, y, w, h, rate, c) {
  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.5), 0.7);
  if (rate === null || rate <= 0) return;
  const fillW = Math.max(h, w * rate);
  softBarGlow(dc, x, y, fillW, h, c.gPink, 1.1);
  softBarGlow(dc, x + fillW * 0.5, y, Math.max(h, fillW * 0.5), h, c.gBlue, 0.7);
  const segs = 28;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.6, h), h / 2, hex(cyberGradient(t, c), 1));
  }
  softBlob(dc, x + fillW, y + h / 2, h * 1.1, c.gPink, 0.4);
}

function paintFocusBlock(dc, rect, title, stat, c, big) {
  const { x, y, w, h } = rect;
  softBlob(dc, x + w * 0.5, y + h * 0.45, Math.min(w, h) * 0.55, c.sakuraSoft, 0.2);
  drawText(dc, title, new Rect(x, y, w, 14), {
    font: Font.semiboldRoundedSystemFont(big ? 11 : 9),
    color: hex(c.mute, 0.95),
    align: "center",
  });

  const pct = pctLabel(stat.rate);
  const pctFont = Font.heavyRoundedSystemFont(big ? 36 : 22);
  // white cushion + neon pink
  for (const [ox, oy, a] of [
    [0, 0, 0.65],
    [0, 1, 0.4],
    [1, 0, 0.35],
    [-1, 0, 0.35],
  ]) {
    drawText(dc, pct, new Rect(x + ox, y + 14 + oy, w, big ? 40 : 28), {
      font: pctFont,
      color: hex("#ffffff", a),
      align: "center",
    });
  }
  glowText(dc, pct, new Rect(x, y + 14, w, big ? 40 : 28), {
    font: pctFont,
    colorHex: c.neonPinkSoft,
    align: "center",
    glow: 0.55,
    finalHex: c.neonPink,
  });

  const counts = `${stat.done}/${stat.total} done`;
  drawText(dc, counts, new Rect(x, y + (big ? 54 : 42), w, 14), {
    font: Font.mediumRoundedSystemFont(big ? 10 : 8),
    color: hex(c.inkSoft, 0.95),
    align: "center",
  });

  const barY = y + (big ? 70 : 56);
  const barH = big ? 10 : 7;
  if (barY + barH < y + h - 2) {
    paintSuccessBar(dc, x + 6, barY, w - 12, barH, stat.rate === null ? 0 : stat.rate, c);
    drawText(dc, "success rate", new Rect(x, barY + barH + 2, w, 11), {
      font: Font.mediumRoundedSystemFont(7),
      color: hex(c.mute, 0.85),
      align: "center",
    });
  }
}

function paintMiniStat(dc, rect, label, stat, c) {
  const { x, y, w, h } = rect;
  fillRoundRect(dc, new Rect(x, y, w, h), 10, hex(c.dim, 0.65));
  drawText(dc, label, new Rect(x + 6, y + 4, w - 12, 11), {
    font: Font.semiboldRoundedSystemFont(7.5),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  glowText(dc, pctLabel(stat.rate), new Rect(x + 6, y + 14, w - 12, 16), {
    font: Font.heavyRoundedSystemFont(13),
    colorHex: c.neonPinkSoft,
    align: "left",
    glow: 0.35,
    finalHex: c.neonPink,
  });
  drawText(dc, `${stat.done}/${stat.total}`, new Rect(x + 6, y + h - 14, w - 12, 11), {
    font: Font.mediumRoundedSystemFont(7.5),
    color: hex(c.inkSoft, 0.9),
    align: "left",
  });
  // tiny bar
  paintSuccessBar(dc, x + w * 0.42, y + 18, w * 0.5 - 6, 5, stat.rate === null ? 0 : stat.rate, c);
}

// ─── View composers ──────────────────────────────────────────

function focusStat(stats, mode) {
  if (mode === "week") return { key: "week", title: "THIS WEEK", stat: stats.week };
  if (mode === "month") return { key: "month", title: "THIS MONTH", stat: stats.month };
  if (mode === "year") return { key: "year", title: "THIS YEAR", stat: stats.year };
  return { key: "day", title: "TODAY", stat: stats.day };
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

function paintDayFocus(dc, w, h, family, stats, c) {
  // Day full detail + soft week/month/year
  const pad = family === "small" ? 10 : 14;
  paintBrand(dc, pad, pad, w - pad * 2, c, modeChip("day"));

  const mood = moodFrom(stats.day.rate);
  if (family === "small") {
    drawPet(dc, pad + 36, h * 0.55, 22, mood, c);
    paintFocusBlock(
      dc,
      { x: pad + 70, y: pad + 28, w: w - pad * 2 - 70, h: h - pad * 2 - 36 },
      "TODAY",
      stats.day,
      c,
      false
    );
    return;
  }

  // Medium / large / xl
  const leftW = family === "extraLarge" ? w * 0.28 : w * 0.34;
  drawPet(dc, pad + leftW * 0.45, h * 0.55, family === "large" ? 48 : family === "extraLarge" ? 52 : 34, mood, c);
  drawText(
    dc,
    moodCopy(mood, "today"),
    new Rect(pad, h - pad - (family === "large" ? 28 : 16), leftW - 4, family === "large" ? 26 : 14),
    {
      font: Font.mediumRoundedSystemFont(family === "large" ? 9 : 7),
      color: hex(c.inkSoft, 0.9),
      align: "center",
    }
  );

  const focusX = pad + leftW;
  const focusW = w - focusX - pad;
  paintFocusBlock(
    dc,
    {
      x: focusX,
      y: pad + 30,
      w: focusW,
      h: family === "large" ? 150 : family === "extraLarge" ? 160 : 78,
    },
    "TODAY · full detail",
    stats.day,
    c,
    family !== "medium"
  );

  // Soft secondary strip
  const stripY =
    family === "large" ? pad + 190 : family === "extraLarge" ? pad + 200 : pad + 112;
  const stripH = family === "medium" ? h - stripY - pad : 56;
  const gap = 6;
  const cellW = (focusW - gap * 2) / 3;
  const minis = [
    ["week", stats.week],
    ["month", stats.month],
    ["year", stats.year],
  ];
  drawText(dc, "also glowing softly", new Rect(focusX, stripY - 12, focusW, 11), {
    font: Font.mediumRoundedSystemFont(7),
    color: hex(c.mute, 0.85),
    align: "left",
  });
  minis.forEach(([label, stat], i) => {
    paintMiniStat(
      dc,
      {
        x: focusX + i * (cellW + gap),
        y: stripY,
        w: cellW,
        h: Math.min(52, stripH),
      },
      label,
      stat,
      c
    );
  });
}

function paintWeekFocus(dc, w, h, family, stats, c) {
  const pad = family === "small" ? 10 : 14;
  paintBrand(dc, pad, pad, w - pad * 2, c, modeChip("week"));
  const mood = moodFrom(stats.week.rate);

  if (family === "small") {
    drawPet(dc, pad + 34, h * 0.52, 20, mood, c);
    paintFocusBlock(dc, { x: pad + 66, y: pad + 28, w: w - pad * 2 - 66, h: 90 }, "WEEK", stats.week, c, false);
    paintMiniStat(dc, { x: pad + 66, y: h - pad - 36, w: w - pad * 2 - 66, h: 32 }, "today", stats.day, c);
    return;
  }

  const petS = family === "large" ? 44 : 32;
  drawPet(dc, pad + 40, h * 0.55, petS, mood, c);
  paintFocusBlock(
    dc,
    { x: pad + 90, y: pad + 28, w: w - pad * 2 - 90, h: family === "medium" ? 72 : 130 },
    "THIS WEEK · focus",
    stats.week,
    c,
    family !== "medium"
  );
  // today mention
  paintMiniStat(
    dc,
    {
      x: pad + 90,
      y: family === "medium" ? pad + 108 : pad + 170,
      w: (w - pad * 2 - 90) * 0.48,
      h: 42,
    },
    "today too",
    stats.day,
    c
  );
  paintMiniStat(
    dc,
    {
      x: pad + 90 + (w - pad * 2 - 90) * 0.52,
      y: family === "medium" ? pad + 108 : pad + 170,
      w: (w - pad * 2 - 90) * 0.48,
      h: 42,
    },
    "month",
    stats.month,
    c
  );
}

function paintSingleFocus(dc, w, h, family, stats, c, mode) {
  const pad = family === "small" ? 10 : 14;
  paintBrand(dc, pad, pad, w - pad * 2, c, modeChip(mode));
  const f = focusStat(stats, mode);
  const mood = moodFrom(f.stat.rate);
  const petS = family === "small" ? 20 : family === "large" ? 48 : 34;
  drawPet(dc, pad + (family === "small" ? 34 : 42), h * 0.55, petS, mood, c);
  paintFocusBlock(
    dc,
    {
      x: pad + (family === "small" ? 66 : 95),
      y: pad + 28,
      w: w - pad * 2 - (family === "small" ? 66 : 95),
      h: family === "medium" ? 100 : family === "small" ? 100 : 160,
    },
    `${f.title} · focus`,
    f.stat,
    c,
    family === "large" || family === "extraLarge"
  );
  if (family !== "small") {
    drawText(dc, moodCopy(mood, f.key), new Rect(pad, h - pad - 14, w - pad * 2, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.inkSoft, 0.9),
      align: "center",
    });
  }
}

function paintPanel(dc, w, h, family, stats, c) {
  // today vs week vs month — day still a little featured
  const pad = 14;
  paintBrand(dc, pad, pad, w - pad * 2, c, modeChip("panel"));
  const mood = moodFrom(stats.day.rate);
  const top = pad + 30;

  if (family === "small") {
    paintMiniStat(dc, { x: pad, y: top, w: w - pad * 2, h: 40 }, "today", stats.day, c);
    paintMiniStat(dc, { x: pad, y: top + 44, w: (w - pad * 2 - 6) / 2, h: 40 }, "week", stats.week, c);
    paintMiniStat(
      dc,
      { x: pad + (w - pad * 2 - 6) / 2 + 6, y: top + 44, w: (w - pad * 2 - 6) / 2, h: 40 },
      "month",
      stats.month,
      c
    );
    return;
  }

  drawPet(dc, pad + 36, h * 0.62, family === "large" ? 40 : 28, mood, c);

  const colX = pad + 80;
  const colW = w - colX - pad;
  // Day featured larger
  paintFocusBlock(
    dc,
    { x: colX, y: top, w: colW, h: family === "medium" ? 58 : 110 },
    "TODAY",
    stats.day,
    c,
    family !== "medium"
  );
  const rowY = family === "medium" ? top + 64 : top + 120;
  const gap = 8;
  const half = (colW - gap) / 2;
  paintMiniStat(dc, { x: colX, y: rowY, w: half, h: 48 }, "this week", stats.week, c);
  paintMiniStat(dc, { x: colX + half + gap, y: rowY, w: half, h: 48 }, "this month", stats.month, c);
}

function paintAll(dc, w, h, family, stats, c) {
  // Day featured + week/month/year less detail
  paintDayFocus(dc, w, h, family, stats, c);
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
  else if (mode === "all") paintAll(dc, w, h, family, stats, c);
  else paintDayFocus(dc, w, h, family, stats, c); // day default

  const widget = new ListWidget();
  widget.backgroundImage = dc.getImage();
  widget.setPadding(0, 0, 0, 0);
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return widget;
}

async function presentFamily(family, widget) {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else if (family === "extraLarge") await widget.presentExtraLarge();
  else await widget.presentMedium();
}

// ─── Run ─────────────────────────────────────────────────────

const mode = parseMode(args.widgetParameter);
const family = config.widgetFamily || "medium";

if (config.runsInWidget) {
  Script.setWidget(await render(family, mode));
} else {
  const table = new UITable();
  table.showSeparators = false;
  const header = new UITableRow();
  header.addText("♥ Stellara Pet", "Pick a view · set same word as Widget Parameter");
  table.addRow(header);

  const modes = [
    ["day", "DAY focus + soft week/month/year"],
    ["week", "WEEK focus + today mentioned"],
    ["month", "MONTH focus"],
    ["year", "YEAR focus"],
    ["panel", "today vs week vs month"],
    ["all", "control panel (day featured)"],
  ];

  for (const [m, hint] of modes) {
    const row = new UITableRow();
    row.addText(m.toUpperCase(), hint);
    row.dismissOnSelect = false;
    row.onSelect = async () => {
      const pick = new UITable();
      pick.showSeparators = false;
      for (const f of ["small", "medium", "large", "extraLarge"]) {
        const r = new UITableRow();
        r.addText(f.toUpperCase(), "Preview");
        r.onSelect = async () => {
          await presentFamily(f, await render(f, m));
        };
        pick.addRow(r);
      }
      await pick.present();
    };
    table.addRow(row);
  }

  // Quick stats dump
  try {
    const s = await gatherStats();
    const info = new UITableRow();
    info.addText(
      "Live totals",
      `today ${s.day.done}/${s.day.total} · week ${s.week.done}/${s.week.total} · month ${s.month.done}/${s.month.total} · year ${s.year.done}/${s.year.total}`
    );
    table.addRow(info);
  } catch (e) {
    const info = new UITableRow();
    info.addText("Reminders", "Allow access when prompted, then run again");
    table.addRow(info);
  }

  await table.present();
}

Script.complete();
