// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: magic;
//
// ✦ STELLARA — Magical Girl Year Console
// A glowing year-progress widget for Scriptable.
// Shows % of the year elapsed + a crystal grid of weeks.
//
// Install: copy into Scriptable → Add Widget → select this script
// Best on Medium or Large. Works on Small too (compact mode).

const CONFIG = {
  title: "STELLARA",
  subtitle: "YEAR CONSOLE",
  // Magical girl tech palette — sakura / rose-gold / mint crystal
  colors: {
    voidDeep: "#07040f",
    voidMid: "#14091f",
    panel: "#1a0d2a",
    sakura: "#ff4d8d",
    sakuraSoft: "#ff8fb8",
    roseGold: "#ffc2a8",
    mint: "#5ef0d0",
    mintSoft: "#a8fff0",
    star: "#ffe6a8",
    ink: "#fff5fb",
    mute: "#c9a8c0",
    dim: "#3a2248",
    dimStroke: "#6b3d6a",
  },
};

// ─── Time math ───────────────────────────────────────────────

function yearStats(now = new Date()) {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const msDay = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor((now - start) / msDay) + 1;
  const daysInYear = Math.round((end - start) / msDay);
  const pct = (now - start) / (end - start);
  const weeksInYear = Math.ceil(daysInYear / 7);
  // Weeks completed = fully elapsed 7-day blocks; current week is the next cell
  const weeksGone = Math.min(weeksInYear, Math.floor((dayOfYear - 1) / 7));
  const currentWeek = Math.min(weeksInYear, weeksGone + 1);
  const daysLeft = Math.max(0, daysInYear - dayOfYear);
  return {
    year,
    dayOfYear,
    daysInYear,
    daysLeft,
    pct: Math.min(1, Math.max(0, pct)),
    weeksInYear,
    weeksGone,
    currentWeek,
  };
}

// ─── Color helpers ───────────────────────────────────────────

function hex(h, a = 1) {
  const n = h.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
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
  return (
    "#" +
    [r, g, bl]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ─── Drawing primitives ──────────────────────────────────────

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

function glowEllipse(dc, cx, cy, r, colorHex, layers = 5, peakAlpha = 0.55) {
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const rr = r * (0.55 + t * 1.35);
    const a = peakAlpha * (1 - t) * (1 - t);
    dc.setFillColor(hex(colorHex, a));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
  dc.setFillColor(hex(colorHex, Math.min(1, peakAlpha + 0.25)));
  dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.9) {
  // Tiny 4-point star (cross + diamond)
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7));
  dc.setFillColor(hex(colorHex, alpha * 0.55));
  dc.fillRect(new Rect(x - size * 0.1, y - size, size * 0.2, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.1, size * 2, size * 0.2));
}

function drawText(dc, text, rect, { font, color, align = "left" } = {}) {
  dc.setFont(font);
  dc.setTextColor(color);
  if (align === "center") dc.setTextAlignedCenter();
  else if (align === "right") dc.setTextAlignedRight();
  else dc.setTextAlignedLeft();
  dc.drawTextInRect(text, rect);
}

// Soft "glow text" by stacking translucent copies
function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.45 } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.55],
    [0, -1, glow * 0.35],
    [1, 0, glow * 0.35],
    [-1, 0, glow * 0.35],
    [0, 2, glow * 0.22],
  ];
  for (const [ox, oy, a] of offsets) {
    const r = new Rect(rect.x + ox, rect.y + oy, rect.width, rect.height);
    drawText(dc, text, r, { font, color: hex(colorHex, a), align });
  }
  drawText(dc, text, rect, { font, color: hex(CONFIG.colors.ink, 1), align });
}

// ─── Widget canvas ───────────────────────────────────────────

function widgetSizeFor(family) {
  // Approximate logical points for modern iPhones
  if (family === "small") return new Size(155, 155);
  if (family === "large") return new Size(329, 345);
  return new Size(329, 155); // medium
}

function paintBackground(dc, w, h, c) {
  // Deep void base
  dc.setFillColor(hex(c.voidDeep));
  dc.fillRect(new Rect(0, 0, w, h));

  // Soft radial wash — sakura top-left, mint bottom-right
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const r = Math.max(w, h) * (0.35 + t * 0.9);
    dc.setFillColor(hex(c.sakura, 0.045 * (1 - t)));
    dc.fillEllipse(new Rect(-r * 0.35, -r * 0.45, r * 1.4, r * 1.4));
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const r = Math.max(w, h) * (0.3 + t * 0.85);
    dc.setFillColor(hex(c.mint, 0.035 * (1 - t)));
    dc.fillEllipse(new Rect(w - r * 0.9, h - r * 0.85, r * 1.3, r * 1.3));
  }

  // Faint constellation dust
  const seeds = [
    [0.12, 0.18, 1.4],
    [0.28, 0.08, 1.0],
    [0.72, 0.14, 1.2],
    [0.88, 0.22, 0.9],
    [0.18, 0.78, 1.1],
    [0.45, 0.9, 0.8],
    [0.82, 0.72, 1.3],
    [0.62, 0.05, 0.7],
    [0.05, 0.42, 0.9],
    [0.94, 0.55, 1.0],
  ];
  for (const [px, py, s] of seeds) {
    drawSpark(dc, w * px, h * py, s, c.star, 0.55);
  }

  // Inner panel frame
  const inset = 5;
  const panel = new Rect(inset, inset, w - inset * 2, h - inset * 2);
  fillRoundRect(dc, panel, 18, hex(c.panel, 0.42));
  strokeRoundRect(dc, panel, 18, hex(c.sakuraSoft, 0.35), 1.2);
  // Secondary mint edge, slightly inset
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    15,
    hex(c.mint, 0.18),
    0.8
  );
}

function paintHeader(dc, w, pad, c, stats, compact) {
  const brandH = compact ? 14 : 16;
  glowText(
    dc,
    `✦ ${CONFIG.title}`,
    new Rect(pad, pad - 1, w - pad * 2, brandH + 4),
    {
      font: Font.boldRoundedSystemFont(compact ? 11 : 12),
      colorHex: c.sakuraSoft,
      align: "left",
      glow: 0.5,
    }
  );
  drawText(
    dc,
    CONFIG.subtitle,
    new Rect(pad, pad + (compact ? 13 : 15), w - pad * 2, 12),
    {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.mintSoft, 0.85),
      align: "left",
    }
  );
  // Year badge, top-right
  const badge = `${stats.year}`;
  drawText(
    dc,
    badge,
    new Rect(pad, pad, w - pad * 2, 14),
    {
      font: Font.semiboldRoundedSystemFont(10),
      color: hex(c.roseGold, 0.9),
      align: "right",
    }
  );
}

function paintPercent(dc, w, y, c, stats, compact) {
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const bigH = compact ? 36 : 42;
  // Soft bloom behind the number
  glowEllipse(dc, w * 0.5, y + bigH * 0.45, compact ? 28 : 36, c.sakura, 6, 0.28);
  glowEllipse(dc, w * 0.5, y + bigH * 0.45, compact ? 18 : 22, c.mint, 4, 0.16);

  glowText(dc, pctStr, new Rect(0, y, w, bigH), {
    font: Font.boldRoundedSystemFont(compact ? 32 : 38),
    colorHex: c.sakuraSoft,
    align: "center",
    glow: 0.55,
  });

  drawText(
    dc,
    "year luminosity",
    new Rect(0, y + bigH - 2, w, 14),
    {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.mute, 0.95),
      align: "center",
    }
  );

  return y + bigH + (compact ? 10 : 14);
}

function paintProgressBar(dc, w, y, pad, c, stats) {
  const barH = 8;
  const barW = w - pad * 2;
  const bar = new Rect(pad, y, barW, barH);
  fillRoundRect(dc, bar, 4, hex(c.dim, 0.95));
  strokeRoundRect(dc, bar, 4, hex(c.dimStroke, 0.7), 0.8);

  const fillW = Math.max(4, barW * stats.pct);
  // Layered glow fill
  for (let i = 3; i >= 1; i--) {
    const grow = i * 2.2;
    fillRoundRect(
      dc,
      new Rect(pad - grow * 0.2, y - grow * 0.35, fillW + grow * 0.4, barH + grow * 0.7),
      4 + i,
      hex(c.sakura, 0.12 * (4 - i))
    );
  }
  // Gradient-ish fill via segments
  const segs = 24;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const col = mixHex(c.sakura, c.mint, t * 0.85);
    const x = pad + i * segW;
    const ww = segW + 0.6;
    fillRoundRect(dc, new Rect(x, y, ww, barH), 3, hex(col, 0.95));
  }
  // Leading spark
  const tipX = pad + fillW;
  glowEllipse(dc, tipX, y + barH / 2, 5.5, c.star, 4, 0.65);
  drawSpark(dc, tipX, y + barH / 2, 2.2, c.ink, 0.95);

  return y + barH + 12;
}

function paintWeekGrid(dc, w, y, pad, bottom, c, stats, compact) {
  const label = compact
    ? `W${stats.currentWeek} · ${stats.weeksGone}/${stats.weeksInYear} weeks`
    : `WEEK CRYSTALS  ·  ${stats.weeksGone} sealed  ·  W${stats.currentWeek} active`;

  drawText(dc, label, new Rect(pad, y, w - pad * 2, 12), {
    font: Font.mediumRoundedSystemFont(compact ? 7.5 : 8),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  y += compact ? 12 : 14;

  const cols = compact ? 13 : 18;
  const rows = Math.ceil(stats.weeksInYear / cols);
  const availH = Math.max(28, bottom - y - (compact ? 14 : 18));
  const availW = w - pad * 2;
  const gap = compact ? 2.4 : 3.2;
  const cell = Math.min(
    (availW - gap * (cols - 1)) / cols,
    (availH - gap * (rows - 1)) / rows,
    compact ? 8.5 : 11
  );
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const ox = (w - gridW) / 2;
  const oy = y + Math.max(0, (availH - gridH) * 0.15);

  for (let i = 0; i < stats.weeksInYear; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ox + col * (cell + gap) + cell / 2;
    const cy = oy + row * (cell + gap) + cell / 2;
    const r = cell * 0.42;
    const weekNum = i + 1;

    if (weekNum <= stats.weeksGone) {
      // Sealed weeks — sakura → rose-gold shimmer by index
      const t = i / Math.max(1, stats.weeksGone - 1);
      const colHex = mixHex(c.sakura, c.roseGold, t * 0.65);
      glowEllipse(dc, cx, cy, r * 0.85, colHex, 3, 0.4);
      dc.setFillColor(hex(colHex, 0.95));
      dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
      // Tiny highlight
      dc.setFillColor(hex(c.ink, 0.45));
      dc.fillEllipse(
        new Rect(cx - r * 0.28, cy - r * 0.35, r * 0.35, r * 0.28)
      );
    } else if (weekNum === stats.currentWeek) {
      // Active week — mint crystal with ring
      glowEllipse(dc, cx, cy, r * 1.15, c.mint, 4, 0.55);
      dc.setFillColor(hex(c.mint, 0.95));
      dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
      dc.setStrokeColor(hex(c.star, 0.95));
      dc.setLineWidth(1.2);
      dc.strokeEllipse(new Rect(cx - r * 0.95, cy - r * 0.95, r * 1.9, r * 1.9));
      drawSpark(dc, cx, cy - r * 1.35, 1.6, c.star, 0.9);
    } else {
      // Future — dormant glass
      dc.setFillColor(hex(c.dim, 0.75));
      dc.fillEllipse(new Rect(cx - r * 0.5, cy - r * 0.5, r, r));
      dc.setStrokeColor(hex(c.dimStroke, 0.55));
      dc.setLineWidth(0.7);
      dc.strokeEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
    }
  }

  return oy + gridH + 6;
}

function paintFooter(dc, w, y, pad, c, stats, compact) {
  const left = `day ${stats.dayOfYear}/${stats.daysInYear}`;
  const right = `${stats.daysLeft}d remaining`;
  drawText(dc, left, new Rect(pad, y, w * 0.5 - pad, 12), {
    font: Font.mediumRoundedSystemFont(7.5),
    color: hex(c.mute, 0.9),
    align: "left",
  });
  drawText(dc, right, new Rect(w * 0.5, y, w * 0.5 - pad, 12), {
    font: Font.mediumRoundedSystemFont(7.5),
    color: hex(c.roseGold, 0.85),
    align: "right",
  });
  if (!compact) {
    drawText(
      dc,
      "protect this timeline · shine on",
      new Rect(pad, y + 11, w - pad * 2, 11),
      {
        font: Font.mediumRoundedSystemFont(7),
        color: hex(c.sakuraSoft, 0.55),
        align: "center",
      }
    );
  }
}

function render(family) {
  const c = CONFIG.colors;
  const stats = yearStats();
  const size = widgetSizeFor(family);
  const w = size.width;
  const h = size.height;
  const compact = family === "small";
  const pad = compact ? 12 : 16;

  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;

  paintBackground(dc, w, h, c);
  paintHeader(dc, w, pad, c, stats, compact);

  let y = compact ? 36 : 40;
  y = paintPercent(dc, w, y, c, stats, compact);
  y = paintProgressBar(dc, w, y, pad, c, stats);

  const footerReserve = compact ? 16 : 28;
  paintWeekGrid(dc, w, y, pad, h - footerReserve, c, stats, compact);
  paintFooter(dc, w, h - footerReserve + 2, pad, c, stats, compact);

  const widget = new ListWidget();
  widget.backgroundImage = dc.getImage();
  widget.setPadding(0, 0, 0, 0);
  // Refresh every few hours so the % drifts
  widget.refreshAfterDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return widget;
}

// ─── Run ─────────────────────────────────────────────────────

const family =
  config.widgetFamily ||
  (config.runsInWidget ? "medium" : "medium");

if (config.runsInWidget) {
  Script.setWidget(render(family));
} else {
  // Preview all sizes when run inside the Scriptable app
  const table = new UITable();
  table.showSeparators = false;

  const header = new UITableRow();
  header.addText("✦ Stellara Year Console", "Tap a size to preview");
  table.addRow(header);

  for (const f of ["small", "medium", "large"]) {
    const row = new UITableRow();
    row.addText(f.toUpperCase(), "Open preview");
    row.dismissOnSelect = false;
    row.onSelect = async () => {
      const w = render(f);
      if (f === "small") await w.presentSmall();
      else if (f === "large") await w.presentLarge();
      else await w.presentMedium();
    };
    table.addRow(row);
  }
  await table.present();
}

Script.complete();
