// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♡ STELLARA — Magical Girl Year Console (LIGHT / KAWAII)
// Soft candy pastel twin of the dark console.
// Year % + week candy grid. Layouts are size-safe (no overlap).
//
// Install: paste into Scriptable → Add Widget → pick this script
// Best: Medium or Large. Small works in compact mode.

const CONFIG = {
  title: "STELLARA",
  subtitle: "KAWAII CONSOLE",
  weekLabel: "WEEK CANDIES",
  percentCaption: "♡ year sparkle",
  tagline: "stay soft · stay sparkling · you got this",
  colors: {
    bg0: "#fff7fb",
    bg1: "#ffe8f4",
    panel: "#ffffff",
    sakura: "#ff6fa8",
    sakuraSoft: "#ff8ec0",
    roseGold: "#ff9eb5",
    mint: "#6edcc8",
    mintSoft: "#8fe8d8",
    star: "#ffc978",
    lav: "#c9b6ff",
    peach: "#ffc4a8",
    ink: "#6b2a4a",
    inkSoft: "#8a3a5c",
    mute: "#b07a96",
    dim: "#ffe0ec",
    dimStroke: "#f5b8d0",
    frame: "#ff9ec8",
    frame2: "#9ae6d8",
    cloud: "#ffffff",
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

function softBlob(dc, cx, cy, r, colorHex, alpha) {
  for (let i = 4; i >= 1; i--) {
    const t = i / 4;
    const rr = r * (0.7 + t * 0.55);
    dc.setFillColor(hex(colorHex, alpha * (1 - t) * 0.85));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
}

function glowEllipse(dc, cx, cy, r, colorHex, layers = 4, peakAlpha = 0.4) {
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const rr = r * (0.55 + t * 1.05);
    const a = peakAlpha * (1 - t) * (1 - t);
    dc.setFillColor(hex(colorHex, a));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
  dc.setFillColor(hex(colorHex, Math.min(1, peakAlpha + 0.35)));
  dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.85) {
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7));
  dc.setFillColor(hex(colorHex, alpha * 0.5));
  dc.fillRect(new Rect(x - size * 0.1, y - size, size * 0.2, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.1, size * 2, size * 0.2));
}

function drawHeart(dc, x, y, size, colorHex, alpha = 0.85) {
  // Simple heart from two circles + triangle-ish bottom via overlapping ellipses
  const s = size;
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - s * 0.55, y - s * 0.35, s * 0.55, s * 0.55));
  dc.fillEllipse(new Rect(x - s * 0.05, y - s * 0.35, s * 0.55, s * 0.55));
  const path = new Path();
  path.move(new Point(x - s * 0.52, y + s * 0.05));
  path.addLine(new Point(x, y + s * 0.7));
  path.addLine(new Point(x + s * 0.52, y + s * 0.05));
  path.closeSubpath();
  dc.setFillColor(hex(colorHex, alpha));
  dc.addPath(path);
  dc.fillPath();
}

function drawText(dc, text, rect, { font, color, align = "left" } = {}) {
  dc.setFont(font);
  dc.setTextColor(color);
  if (align === "center") dc.setTextAlignedCenter();
  else if (align === "right") dc.setTextAlignedRight();
  else dc.setTextAlignedLeft();
  dc.drawTextInRect(text, rect);
}

function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.35, finalHex } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.45],
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
    color: hex(finalHex || CONFIG.colors.ink, 1),
    align,
  });
}

// ─── Size + layout bands (guaranteed non-overlapping) ────────

function widgetSizeFor(family) {
  if (family === "small") return new Size(155, 155);
  if (family === "large") return new Size(329, 345);
  return new Size(329, 155);
}

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
      header: { x: pad, y: top, w: leftW, h: headerH },
      percent: { x: pad, y: percentY, w: leftW, h: Math.max(36, percentH), captionH: 12, font: 34 },
      bar: { x: pad, y: barY, w: leftW, h: barH },
      grid: { x: rightX, y: top + 2, w: rightW, h: bottom - top - 2, showLabel: true },
      footer: { x: pad, y: footerY, w: leftW, h: footerH, showTagline: false },
      cols: 9,
      showSubtitle: true,
    };
  }

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
  // Soft candy wash
  dc.setFillColor(hex(c.bg0));
  dc.fillRect(new Rect(0, 0, w, h));

  softBlob(dc, w * 0.15, h * 0.1, Math.max(w, h) * 0.45, c.sakuraSoft, 0.18);
  softBlob(dc, w * 0.9, h * 0.2, Math.max(w, h) * 0.4, c.lav, 0.14);
  softBlob(dc, w * 0.75, h * 0.95, Math.max(w, h) * 0.42, c.mintSoft, 0.16);
  softBlob(dc, w * 0.05, h * 0.85, Math.max(w, h) * 0.3, c.peach, 0.14);

  // Pearly panel
  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.panel, 0.55));
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 18, hex(c.frame, 0.55), 1.3);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    15,
    hex(c.frame2, 0.4),
    0.9
  );

  // Tiny hearts + stars (kept near edges, away from content bands)
  const deco = [
    [0.1, 0.12, "heart", 3.2],
    [0.9, 0.1, "spark", 1.4],
    [0.92, 0.88, "heart", 2.8],
    [0.08, 0.9, "spark", 1.2],
    [0.5, 0.06, "spark", 1.0],
  ];
  for (const [px, py, kind, s] of deco) {
    if (kind === "heart") drawHeart(dc, w * px, h * py, s, c.sakuraSoft, 0.55);
    else drawSpark(dc, w * px, h * py, s, c.star, 0.65);
  }
}

function paintHeader(dc, L, c, stats) {
  const { x, y, w, h } = L.header;
  const small = L.family === "small";
  glowText(dc, `♡ ${CONFIG.title}`, new Rect(x, y, w * 0.72, small ? h : 15), {
    font: Font.boldRoundedSystemFont(small ? 11 : 12),
    colorHex: c.sakura,
    align: "left",
    glow: 0.3,
    finalHex: c.ink,
  });
  if (L.showSubtitle) {
    drawText(dc, CONFIG.subtitle, new Rect(x, y + 15, w * 0.75, 12), {
      font: Font.mediumRoundedSystemFont(8),
      color: hex(c.mute, 0.95),
      align: "left",
    });
  }
  drawText(dc, `${stats.year}`, new Rect(x, y, w, small ? h : 14), {
    font: Font.semiboldRoundedSystemFont(10),
    color: hex(c.sakura, 0.95),
    align: "right",
  });
}

function paintPercent(dc, L, c, stats) {
  const { x, y, w, h, captionH, font } = L.percent;
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const cx = x + w / 2;
  const cy = y + h * 0.48;
  softBlob(dc, cx, cy, Math.min(w, h) * 0.55, c.sakuraSoft, 0.22);
  softBlob(dc, cx, cy, Math.min(w, h) * 0.35, c.lav, 0.12);

  glowText(dc, pctStr, new Rect(x, y, w, h), {
    font: Font.boldRoundedSystemFont(font),
    colorHex: c.sakura,
    align: "center",
    glow: 0.28,
    finalHex: c.ink,
  });

  drawText(dc, CONFIG.percentCaption, new Rect(x, y + h, w, captionH), {
    font: Font.mediumRoundedSystemFont(L.family === "small" ? 7 : 8),
    color: hex(c.mute, 0.95),
    align: "center",
  });
}

function paintProgressBar(dc, L, c, stats) {
  const { x, y, w, h } = L.bar;
  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.8), 0.8);

  const fillW = Math.max(h, w * stats.pct);
  const segs = 20;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    // candy gradient: sakura → peach → mint
    const col =
      t < 0.5
        ? mixHex(c.sakura, c.peach, t * 2)
        : mixHex(c.peach, c.mint, (t - 0.5) * 2);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.5, h), h / 2, hex(col, 0.95));
  }
  const tipX = Math.min(x + fillW, x + w - 1);
  drawHeart(dc, tipX, y + h / 2 - 0.5, Math.min(4.2, h * 0.85), c.sakura, 0.95);
}

function paintWeekGrid(dc, L, c, stats) {
  const g = L.grid;
  let y = g.y;
  let gridH = g.h;

  if (g.showLabel) {
    const label =
      L.family === "medium"
        ? `${CONFIG.weekLabel}`
        : `${CONFIG.weekLabel}  ·  ${stats.weeksGone} yum  ·  W${stats.currentWeek}`;
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
          color: hex(c.sakura, 0.9),
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
  if (cell < 3.5) return;

  const gridW = cols * cell + (cols - 1) * gap;
  const usedH = rows * cell + (rows - 1) * gap;
  const ox = g.x + (g.w - gridW) / 2;
  const oy = y + Math.max(0, (gridH - usedH) / 2);

  for (let i = 0; i < stats.weeksInYear; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ox + col * (cell + gap) + cell / 2;
    const cy = oy + row * (cell + gap) + cell / 2;
    const r = cell * 0.34;
    const weekNum = i + 1;

    if (weekNum <= stats.weeksGone) {
      const t = i / Math.max(1, stats.weeksGone - 1);
      const colHex = mixHex(c.sakura, c.peach, t * 0.7);
      glowEllipse(dc, cx, cy, r * 0.7, colHex, 2, 0.22);
      dc.setFillColor(hex(colHex, 0.95));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      // candy highlight
      dc.setFillColor(hex("#ffffff", 0.55));
      dc.fillEllipse(new Rect(cx - r * 0.45, cy - r * 0.55, r * 0.55, r * 0.4));
    } else if (weekNum === stats.currentWeek) {
      glowEllipse(dc, cx, cy, r * 0.9, c.mint, 3, 0.35);
      dc.setFillColor(hex(c.mint, 0.98));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setStrokeColor(hex(c.sakura, 0.9));
      dc.setLineWidth(1);
      const ring = r * 1.25;
      dc.strokeEllipse(new Rect(cx - ring, cy - ring, ring * 2, ring * 2));
      // tiny heart above — clipped inside cell
      if (cell >= 7) drawHeart(dc, cx, cy - r * 0.15, r * 0.55, "#ffffff", 0.85);
    } else {
      dc.setFillColor(hex(c.dim, 0.95));
      dc.fillEllipse(new Rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7));
      dc.setStrokeColor(hex(c.dimStroke, 0.75));
      dc.setLineWidth(0.7);
      dc.strokeEllipse(new Rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8));
    }
  }
}

function paintFooter(dc, L, c, stats) {
  const { x, y, w, showTagline } = L.footer;
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
    color: hex(c.sakura, 0.9),
    align: "right",
  });
  if (showTagline) {
    drawText(dc, CONFIG.tagline, new Rect(x, y + 13, w, 12), {
      font: Font.mediumRoundedSystemFont(7),
      color: hex(c.mute, 0.75),
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
  header.addText(`♡ Stellara (LIGHT / KAWAII)`, "Tap a size — layouts are non-overlapping");
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
