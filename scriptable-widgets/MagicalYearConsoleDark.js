// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: magic;
//
// ✦ STELLARA — Magical Girl Year Console (DARK)
// Dark twin of the light kawaii console.
// Year % + week crystal grid. Layouts are size-safe (no overlap).
//
// Install: paste into Scriptable → Add Widget → pick this script
// Best: Medium or Large. Small works in compact mode.
// Light (default): MagicalYearConsole.js

const CONFIG = {
  title: "STELLARA",
  subtitle: "YEAR CONSOLE",
  weekLabel: "WEEK CRYSTALS",
  percentCaption: "year luminosity",
  tagline: "protect this timeline · shine on",
  colors: {
    bg0: "#07040f",
    bg1: "#14091f",
    panel: "#1a0d2a",
    sakura: "#ff4d8d",
    sakuraSoft: "#ff8fb8",
    roseGold: "#ffc2a8",
    mint: "#5ef0d0",
    mintSoft: "#a8fff0",
    star: "#ffe6a8",
    ink: "#fff5fb",
    inkSoft: "#fff5fb",
    mute: "#c9a8c0",
    dim: "#3a2248",
    dimStroke: "#6b3d6a",
    frame: "#ff8fb8",
    frame2: "#5ef0d0",
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
    const rr = r * (0.55 + t * 1.15);
    const a = peakAlpha * (1 - t) * (1 - t);
    dc.setFillColor(hex(colorHex, a));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
  dc.setFillColor(hex(colorHex, Math.min(1, peakAlpha + 0.25)));
  dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.9) {
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

function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.45, finalHex } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.5],
    [0, -1, glow * 0.3],
    [1, 0, glow * 0.3],
    [-1, 0, glow * 0.3],
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
    color: hex(finalHex || CONFIG.colors.inkSoft, 1),
    align,
  });
}

// ─── Size + layout bands (guaranteed non-overlapping) ────────

function widgetSizeFor(family) {
  if (family === "small") return new Size(155, 155);
  if (family === "large") return new Size(329, 345);
  return new Size(329, 155);
}

/** Exclusive vertical/horizontal bands — nothing shares space. */
function layoutFor(family, w, h) {
  if (family === "small") {
    const pad = 10;
    const top = pad;
    const headerH = 16;
    const percentH = 34;
    const captionH = 10;
    const barH = 7;
    const gap1 = 4;
    const gap2 = 5;
    const gap3 = 6;
    const footerH = 12;
    const bottom = h - pad;
    const footerY = bottom - footerH;
    const barY = top + headerH + gap1 + percentH + captionH + gap2;
    const gridTop = barY + barH + gap3;
    const gridBottom = footerY - 4;
    return {
      family,
      mode: "stack",
      pad,
      header: { x: pad, y: top, w: w - pad * 2, h: headerH },
      percent: {
        x: pad,
        y: top + headerH + gap1,
        w: w - pad * 2,
        h: percentH,
        captionH,
        font: 28,
      },
      bar: { x: pad, y: barY, w: w - pad * 2, h: barH },
      grid: { x: pad, y: gridTop, w: w - pad * 2, h: Math.max(24, gridBottom - gridTop), showLabel: false },
      footer: { x: pad, y: footerY, w: w - pad * 2, h: footerH, showTagline: false },
      cols: 13,
      showSubtitle: false,
    };
  }

  if (family === "medium") {
    // Split: left = brand/%/bar/footer, right = week grid. Avoids vertical crush.
    const pad = 12;
    const gap = 10;
    const leftW = Math.floor(w * 0.4);
    const rightX = pad + leftW + gap;
    const rightW = w - rightX - pad;
    const top = pad;
    const bottom = h - pad;
    const headerH = 28;
    const footerH = 14;
    const barH = 8;
    const percentY = top + headerH + 4;
    const footerY = bottom - footerH;
    const barY = footerY - 8 - barH;
    const percentH = barY - percentY - 6;
    return {
      family,
      mode: "split",
      pad,
      left: { x: pad, y: top, w: leftW, h: bottom - top },
      header: { x: pad, y: top, w: leftW, h: headerH },
      percent: { x: pad, y: percentY, w: leftW, h: Math.max(36, percentH), captionH: 12, font: 34 },
      bar: { x: pad, y: barY, w: leftW, h: barH },
      grid: {
        x: rightX,
        y: top + 2,
        w: rightW,
        h: bottom - top - 2,
        showLabel: true,
      },
      footer: { x: pad, y: footerY, w: leftW, h: footerH, showTagline: false },
      cols: 9,
      showSubtitle: true,
    };
  }

  // large
  const pad = 16;
  const top = pad;
  const headerH = 34;
  const percentH = 52;
  const captionH = 14;
  const barH = 10;
  const footerH = 28;
  const bottom = h - pad;
  const footerY = bottom - footerH;
  const yAfterHeader = top + headerH + 8;
  const barY = yAfterHeader + percentH + captionH + 10;
  const gridTop = barY + barH + 14;
  const gridBottom = footerY - 8;
  return {
    family,
    mode: "stack",
    pad,
    header: { x: pad, y: top, w: w - pad * 2, h: headerH },
    percent: {
      x: pad,
      y: yAfterHeader,
      w: w - pad * 2,
      h: percentH,
      captionH,
      font: 44,
    },
    bar: { x: pad + 8, y: barY, w: w - pad * 2 - 16, h: barH },
    grid: {
      x: pad,
      y: gridTop,
      w: w - pad * 2,
      h: Math.max(80, gridBottom - gridTop),
      showLabel: true,
    },
    footer: { x: pad, y: footerY, w: w - pad * 2, h: footerH, showTagline: true },
    cols: 13,
    showSubtitle: true,
  };
}

// ─── Painters ────────────────────────────────────────────────

function paintBackground(dc, w, h, c) {
  dc.setFillColor(hex(c.bg0));
  dc.fillRect(new Rect(0, 0, w, h));

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

  const seeds = [
    [0.12, 0.18, 1.3],
    [0.28, 0.08, 1.0],
    [0.72, 0.14, 1.2],
    [0.88, 0.22, 0.9],
    [0.18, 0.78, 1.1],
    [0.82, 0.72, 1.2],
    [0.94, 0.55, 1.0],
  ];
  for (const [px, py, s] of seeds) {
    drawSpark(dc, w * px, h * py, s, c.star, 0.5);
  }

  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.panel, 0.4));
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.frame, 0.35), 1.1);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    15,
    hex(c.frame2, 0.16),
    0.8
  );
}

function paintHeader(dc, L, c, stats) {
  const { x, y, w, h } = L.header;
  const small = L.family === "small";
  glowText(dc, `✦ ${CONFIG.title}`, new Rect(x, y, w * 0.72, small ? h : 15), {
    font: Font.boldRoundedSystemFont(small ? 11 : 12),
    colorHex: c.sakuraSoft,
    align: "left",
    glow: 0.45,
    finalHex: c.inkSoft,
  });
  if (L.showSubtitle) {
    drawText(dc, CONFIG.subtitle, new Rect(x, y + 15, w * 0.75, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.mintSoft, 0.9),
      align: "left",
    });
  }
  drawText(dc, `${stats.year}`, new Rect(x, y, w, small ? h : 14), {
    font: Font.semiboldRoundedSystemFont(10),
    color: hex(c.roseGold, 0.95),
    align: "right",
  });
}

function paintPercent(dc, L, c, stats) {
  const { x, y, w, h, captionH, font } = L.percent;
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const cx = x + w / 2;
  const cy = y + h * 0.48;
  glowEllipse(dc, cx, cy, Math.min(w, h) * 0.42, c.sakura, 5, 0.22);
  glowEllipse(dc, cx, cy, Math.min(w, h) * 0.28, c.mint, 3, 0.12);

  glowText(dc, pctStr, new Rect(x, y, w, h), {
    font: Font.boldRoundedSystemFont(font),
    colorHex: c.sakuraSoft,
    align: "center",
    glow: 0.5,
    finalHex: c.inkSoft,
  });

  if (captionH > 0 && L.family !== "small") {
    drawText(dc, CONFIG.percentCaption, new Rect(x, y + h, w, captionH), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.mute, 0.95),
      align: "center",
    });
  } else if (L.family === "small") {
    drawText(dc, CONFIG.percentCaption, new Rect(x, y + h, w, captionH), {
      font: Font.mediumRoundedSystemFont(7),
      color: hex(c.mute, 0.9),
      align: "center",
    });
  }
}

function paintProgressBar(dc, L, c, stats) {
  const { x, y, w, h } = L.bar;
  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.65), 0.7);

  const fillW = Math.max(h, w * stats.pct);
  const segs = 20;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const col = mixHex(c.sakura, c.mint, t * 0.85);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.5, h), h / 2, hex(col, 0.95));
  }
  const tipX = Math.min(x + fillW, x + w - 1);
  glowEllipse(dc, tipX, y + h / 2, Math.min(5, h * 0.9), c.star, 3, 0.55);
}

function paintWeekGrid(dc, L, c, stats) {
  const g = L.grid;
  let y = g.y;
  let gridH = g.h;

  if (g.showLabel) {
    const label =
      L.family === "medium"
        ? `${CONFIG.weekLabel}`
        : `${CONFIG.weekLabel}  ·  ${stats.weeksGone} sealed  ·  W${stats.currentWeek}`;
    drawText(dc, label, new Rect(g.x, y, g.w, 12), {
      font: Font.mediumRoundedSystemFont(7.5),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    if (L.family === "medium") {
      drawText(
        dc,
        `${stats.weeksGone}/${stats.weeksInYear} · W${stats.currentWeek}`,
        new Rect(g.x, y, g.w, 12),
        {
          font: Font.mediumRoundedSystemFont(7.5),
          color: hex(c.roseGold, 0.9),
          align: "right",
        }
      );
    }
    y += 14;
    gridH -= 14;
  }

  const cols = L.cols;
  const rows = Math.ceil(stats.weeksInYear / cols);
  const gap = L.family === "large" ? 4 : 2.6;
  const cell = Math.min(
    (g.w - gap * (cols - 1)) / cols,
    (gridH - gap * (rows - 1)) / rows
  );
  if (cell < 3.5) return; // safety

  const gridW = cols * cell + (cols - 1) * gap;
  const usedH = rows * cell + (rows - 1) * gap;
  const ox = g.x + (g.w - gridW) / 2;
  const oy = y + Math.max(0, (gridH - usedH) / 2);

  for (let i = 0; i < stats.weeksInYear; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ox + col * (cell + gap) + cell / 2;
    const cy = oy + row * (cell + gap) + cell / 2;
    // Keep orb + ring inside the cell so neighbors never collide
    const r = cell * 0.34;
    const weekNum = i + 1;

    if (weekNum <= stats.weeksGone) {
      const t = i / Math.max(1, stats.weeksGone - 1);
      const colHex = mixHex(c.sakura, c.roseGold, t * 0.65);
      glowEllipse(dc, cx, cy, r * 0.75, colHex, 2, 0.28);
      dc.setFillColor(hex(colHex, 0.95));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setFillColor(hex(c.ink, 0.4));
      dc.fillEllipse(new Rect(cx - r * 0.45, cy - r * 0.55, r * 0.55, r * 0.4));
    } else if (weekNum === stats.currentWeek) {
      glowEllipse(dc, cx, cy, r * 0.9, c.mint, 3, 0.4);
      dc.setFillColor(hex(c.mint, 0.98));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setStrokeColor(hex(c.star, 0.95));
      dc.setLineWidth(1);
      const ring = r * 1.25;
      dc.strokeEllipse(new Rect(cx - ring, cy - ring, ring * 2, ring * 2));
    } else {
      dc.setFillColor(hex(c.dim, 0.7));
      dc.fillEllipse(new Rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7));
      dc.setStrokeColor(hex(c.dimStroke, 0.5));
      dc.setLineWidth(0.6);
      dc.strokeEllipse(new Rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8));
    }
  }
}

function paintFooter(dc, L, c, stats) {
  const { x, y, w, h, showTagline } = L.footer;
  const left = `day ${stats.dayOfYear}/${stats.daysInYear}`;
  const right =
    L.family === "small"
      ? `${stats.daysLeft}d left`
      : `${stats.daysLeft}d remaining`;
  drawText(dc, left, new Rect(x, y, w * 0.5, 12), {
    font: Font.mediumRoundedSystemFont(7),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  drawText(dc, right, new Rect(x + w * 0.5, y, w * 0.5, 12), {
    font: Font.mediumRoundedSystemFont(7),
    color: hex(c.roseGold, 0.9),
    align: "right",
  });
  if (showTagline) {
    drawText(dc, CONFIG.tagline, new Rect(x, y + 13, w, 12), {
      font: Font.mediumRoundedSystemFont(7),
      color: hex(c.sakuraSoft, 0.55),
      align: "center",
    });
  }
}

function render(family) {
  const c = CONFIG.colors;
  const stats = yearStats();
  const size = widgetSizeFor(family);
  const w = size.width;
  const h = size.height;
  const L = layoutFor(family, w, h);

  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;

  paintBackground(dc, w, h, c);
  paintHeader(dc, L, c, stats);
  paintPercent(dc, L, c, stats);
  paintProgressBar(dc, L, c, stats);
  paintWeekGrid(dc, L, c, stats);
  paintFooter(dc, L, c, stats);

  const widget = new ListWidget();
  widget.backgroundImage = dc.getImage();
  widget.setPadding(0, 0, 0, 0);
  widget.refreshAfterDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return widget;
}

// ─── Run ─────────────────────────────────────────────────────

const family = config.widgetFamily || "medium";

if (config.runsInWidget) {
  Script.setWidget(render(family));
} else {
  const table = new UITable();
  table.showSeparators = false;
  const header = new UITableRow();
  header.addText(`✦ Stellara (DARK)`, "Tap a size — layouts are non-overlapping");
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
