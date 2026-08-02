// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♡ STELLARA — Magical Girl Year Console (LIGHT / KAWAII)
// Soft candy pastel control panel — extra glowy.
// Year % + week candy grid. Layouts are size-safe (no overlap).
// Supports: small, medium, large (iPad big square), extraLarge (iPad XL).
//
// Install: paste into Scriptable → Add Widget → pick this script
// Dark twin: MagicalYearConsoleDark.js

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
  for (let i = 7; i >= 1; i--) {
    const t = i / 7;
    const rr = r * (0.55 + t * 0.85);
    dc.setFillColor(hex(colorHex, alpha * (1 - t) * (1 - t) * 1.15));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
}

function glowEllipse(dc, cx, cy, r, colorHex, layers = 6, peakAlpha = 0.55) {
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const rr = r * (0.5 + t * 1.45);
    const a = peakAlpha * (1 - t) * (1 - t);
    dc.setFillColor(hex(colorHex, a));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
  dc.setFillColor(hex(colorHex, Math.min(1, peakAlpha + 0.35)));
  dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
}

function glowRing(dc, cx, cy, r, colorHex, alpha = 0.55) {
  for (let i = 4; i >= 1; i--) {
    const grow = i * 1.8;
    dc.setStrokeColor(hex(colorHex, alpha * (1 - i / 5)));
    dc.setLineWidth(1.2 + i * 0.35);
    dc.strokeEllipse(new Rect(cx - r - grow, cy - r - grow, (r + grow) * 2, (r + grow) * 2));
  }
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.85) {
  softBlob(dc, x, y, size * 1.8, colorHex, alpha * 0.35);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7));
  dc.setFillColor(hex(colorHex, alpha * 0.55));
  dc.fillRect(new Rect(x - size * 0.1, y - size, size * 0.2, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.1, size * 2, size * 0.2));
}

function drawHeart(dc, x, y, size, colorHex, alpha = 0.85) {
  const s = size;
  softBlob(dc, x, y + s * 0.1, s * 1.1, colorHex, alpha * 0.35);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - s * 0.55, y - s * 0.35, s * 0.55, s * 0.55));
  dc.fillEllipse(new Rect(x - s * 0.05, y - s * 0.35, s * 0.55, s * 0.55));
  const path = new Path();
  path.move(new Point(x - s * 0.52, y + s * 0.05));
  path.addLine(new Point(x, y + s * 0.7));
  path.addLine(new Point(x + s * 0.52, y + s * 0.05));
  path.closeSubpath();
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

function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.55, finalHex } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.55],
    [0, -1, glow * 0.55],
    [1, 0, glow * 0.45],
    [-1, 0, glow * 0.45],
    [0, 2, glow * 0.32],
    [0, -2, glow * 0.28],
    [2, 0, glow * 0.28],
    [-2, 0, glow * 0.28],
    [1, 1, glow * 0.22],
    [-1, 1, glow * 0.22],
    [1, -1, glow * 0.18],
    [-1, -1, glow * 0.18],
    [0, 3, glow * 0.14],
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
  // Logical canvases — Scriptable scales the image to the real widget.
  if (family === "small") return new Size(170, 170);
  if (family === "large") return new Size(360, 380); // iPad big square + iPhone large
  if (family === "extraLarge") return new Size(720, 360); // iPad XL / double-wide
  return new Size(360, 170); // medium
}

function stackLayout(family, w, h, opts) {
  const pad = opts.pad;
  const top = pad;
  const headerH = opts.headerH;
  const percentH = opts.percentH;
  const captionH = opts.captionH;
  const barH = opts.barH;
  const footerH = opts.footerH;
  const gap1 = opts.gap1;
  const gap2 = opts.gap2;
  const gap3 = opts.gap3;
  const bottom = h - pad;
  const footerY = bottom - footerH;
  const percentY = top + headerH + gap1;
  const barY = percentY + percentH + captionH + gap2;
  const gridTop = barY + barH + gap3;
  const gridBottom = footerY - opts.gridFooterGap;
  return {
    family,
    mode: "stack",
    pad,
    header: { x: pad, y: top, w: w - pad * 2, h: headerH },
    percent: {
      x: pad,
      y: percentY,
      w: w - pad * 2,
      h: percentH + captionH, // number + caption live inside this band
      numberH: percentH,
      captionH,
      font: opts.font,
    },
    bar: { x: pad + (opts.barInset || 0), y: barY, w: w - pad * 2 - (opts.barInset || 0) * 2, h: barH },
    grid: {
      x: pad,
      y: gridTop,
      w: w - pad * 2,
      h: Math.max(24, gridBottom - gridTop),
      showLabel: opts.showGridLabel,
    },
    footer: { x: pad, y: footerY, w: w - pad * 2, h: footerH, showTagline: opts.showTagline },
    cols: opts.cols,
    showSubtitle: opts.showSubtitle,
  };
}

function splitLayout(family, w, h, opts) {
  const pad = opts.pad;
  const gap = opts.gap;
  const leftW = Math.floor(w * opts.leftRatio);
  const rightX = pad + leftW + gap;
  const rightW = w - rightX - pad;
  const top = pad;
  const bottom = h - pad;
  const headerH = opts.headerH;
  const footerH = opts.footerH;
  const barH = opts.barH;
  const captionH = opts.captionH;
  const percentY = top + headerH + opts.afterHeader;
  const footerY = bottom - footerH;
  const barY = footerY - opts.beforeFooter - barH;
  // Reserve caption inside the percent band so it never clips into the bar
  const percentBandH = Math.max(opts.minPercentBand, barY - percentY - opts.beforeBar);
  const numberH = Math.max(28, percentBandH - captionH);
  return {
    family,
    mode: "split",
    pad,
    header: { x: pad, y: top, w: leftW, h: headerH },
    percent: {
      x: pad,
      y: percentY,
      w: leftW,
      h: numberH + captionH,
      numberH,
      captionH,
      font: opts.font,
    },
    bar: { x: pad, y: barY, w: leftW, h: barH },
    grid: { x: rightX, y: top + 2, w: rightW, h: bottom - top - 2, showLabel: true },
    footer: { x: pad, y: footerY, w: leftW, h: footerH, showTagline: false },
    cols: opts.cols,
    showSubtitle: opts.showSubtitle,
  };
}

function layoutFor(family, w, h) {
  if (family === "small") {
    return stackLayout(family, w, h, {
      pad: 11,
      headerH: 16,
      percentH: 36,
      captionH: 11,
      barH: 7,
      footerH: 12,
      gap1: 4,
      gap2: 5,
      gap3: 6,
      gridFooterGap: 4,
      font: 30,
      cols: 13,
      showSubtitle: false,
      showGridLabel: false,
      showTagline: false,
    });
  }

  if (family === "medium") {
    return splitLayout(family, w, h, {
      pad: 12,
      gap: 12,
      leftRatio: 0.42,
      headerH: 28,
      footerH: 14,
      barH: 8,
      captionH: 13,
      afterHeader: 4,
      beforeBar: 6,
      beforeFooter: 8,
      minPercentBand: 48,
      font: 32,
      cols: 9,
      showSubtitle: true,
    });
  }

  if (family === "extraLarge") {
    // iPad XL — wide extended rectangle: glam left console + roomy candy grid
    return splitLayout(family, w, h, {
      pad: 20,
      gap: 18,
      leftRatio: 0.34,
      headerH: 36,
      footerH: 18,
      barH: 12,
      captionH: 16,
      afterHeader: 8,
      beforeBar: 10,
      beforeFooter: 12,
      minPercentBand: 90,
      font: 56,
      cols: 14,
      showSubtitle: true,
    });
  }

  // large — iPhone large + iPad big square
  return stackLayout(family, w, h, {
    pad: 18,
    headerH: 36,
    percentH: 58,
    captionH: 16,
    barH: 11,
    footerH: 30,
    gap1: 10,
    gap2: 12,
    gap3: 14,
    gridFooterGap: 10,
    barInset: 10,
    font: 48,
    cols: 13,
    showSubtitle: true,
    showGridLabel: true,
    showTagline: true,
  });
}

// ─── Painters ────────────────────────────────────────────────

function paintBackground(dc, w, h, c) {
  dc.setFillColor(hex(c.bg0));
  dc.fillRect(new Rect(0, 0, w, h));

  softBlob(dc, w * 0.12, h * 0.08, Math.max(w, h) * 0.55, c.sakuraSoft, 0.32);
  softBlob(dc, w * 0.92, h * 0.18, Math.max(w, h) * 0.5, c.lav, 0.26);
  softBlob(dc, w * 0.78, h * 0.95, Math.max(w, h) * 0.52, c.mintSoft, 0.28);
  softBlob(dc, w * 0.05, h * 0.88, Math.max(w, h) * 0.38, c.peach, 0.24);
  softBlob(dc, w * 0.5, h * 0.45, Math.max(w, h) * 0.35, c.sakura, 0.1);

  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.panel, 0.5));
  // Glowing double frame
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.frame, 0.35), 3.2);
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.frame, 0.75), 1.4);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    17,
    hex(c.frame2, 0.55),
    1.0
  );

  const deco = [
    [0.1, 0.12, "heart", 3.4],
    [0.9, 0.1, "spark", 1.6],
    [0.92, 0.88, "heart", 3.0],
    [0.08, 0.9, "spark", 1.4],
    [0.5, 0.055, "spark", 1.2],
    [0.96, 0.45, "spark", 1.1],
  ];
  for (const [px, py, kind, s] of deco) {
    if (kind === "heart") drawHeart(dc, w * px, h * py, s, c.sakuraSoft, 0.7);
    else drawSpark(dc, w * px, h * py, s, c.star, 0.8);
  }
}

function paintHeader(dc, L, c, stats) {
  const { x, y, w, h } = L.header;
  const small = L.family === "small";
  const titleSize = L.family === "extraLarge" ? 16 : small ? 11 : 13;
  glowText(dc, `♡ ${CONFIG.title}`, new Rect(x, y, w * 0.75, small ? h : 16), {
    font: Font.boldRoundedSystemFont(titleSize),
    colorHex: c.sakura,
    align: "left",
    glow: 0.55,
    finalHex: c.ink,
  });
  if (L.showSubtitle) {
    drawText(dc, CONFIG.subtitle, new Rect(x, y + (L.family === "extraLarge" ? 18 : 16), w * 0.8, 13), {
      font: Font.mediumRoundedSystemFont(L.family === "extraLarge" ? 10 : 8),
      color: hex(c.mute, 0.95),
      align: "left",
    });
  }
  glowText(dc, `${stats.year}`, new Rect(x, y, w, small ? h : 15), {
    font: Font.semiboldRoundedSystemFont(L.family === "extraLarge" ? 13 : 10),
    colorHex: c.sakuraSoft,
    align: "right",
    glow: 0.4,
    finalHex: c.sakura,
  });
}

function paintPercent(dc, L, c, stats) {
  const { x, y, w, numberH, captionH, font } = L.percent;
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const cx = x + w / 2;
  const cy = y + numberH * 0.5;

  // Big luminous bloom behind the %
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.85, c.sakuraSoft, 0.4);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.55, c.lav, 0.28);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.35, c.mintSoft, 0.18);
  glowEllipse(dc, cx, cy, Math.min(w, numberH) * 0.22, c.sakura, 5, 0.35);

  glowText(dc, pctStr, new Rect(x, y, w, numberH), {
    font: Font.boldRoundedSystemFont(font),
    colorHex: c.sakura,
    align: "center",
    glow: 0.65,
    finalHex: c.ink,
  });

  // Caption stays INSIDE the percent band — never clipped by the bar
  const capFont = L.family === "small" ? 7 : L.family === "extraLarge" ? 11 : 8;
  glowText(dc, CONFIG.percentCaption, new Rect(x, y + numberH, w, captionH), {
    font: Font.mediumRoundedSystemFont(capFont),
    colorHex: c.sakuraSoft,
    align: "center",
    glow: 0.35,
    finalHex: c.mute,
  });
}

function paintProgressBar(dc, L, c, stats) {
  const { x, y, w, h } = L.bar;

  // Outer glow halo
  for (let i = 4; i >= 1; i--) {
    const grow = i * 2.4;
    fillRoundRect(
      dc,
      new Rect(x - grow * 0.3, y - grow * 0.45, w + grow * 0.6, h + grow * 0.9),
      (h + grow) / 2,
      hex(c.sakuraSoft, 0.08 * (5 - i))
    );
  }

  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.85), 0.8);

  const fillW = Math.max(h, w * stats.pct);
  const segs = 24;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const col =
      t < 0.5 ? mixHex(c.sakura, c.peach, t * 2) : mixHex(c.peach, c.mint, (t - 0.5) * 2);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.5, h), h / 2, hex(col, 0.98));
  }

  // Bright leading glow + heart
  const tipX = Math.min(x + fillW, x + w - 1);
  glowEllipse(dc, tipX, y + h / 2, Math.max(6, h * 1.1), c.sakura, 5, 0.55);
  glowEllipse(dc, tipX, y + h / 2, Math.max(4, h * 0.7), c.star, 3, 0.45);
  drawHeart(dc, tipX, y + h / 2 - 0.5, Math.min(4.5, h * 0.9), c.sakura, 0.98);
}

function paintWeekGrid(dc, L, c, stats) {
  const g = L.grid;
  let y = g.y;
  let gridH = g.h;

  if (g.showLabel) {
    const isWide = L.family === "medium" || L.family === "extraLarge";
    const label = isWide
      ? `${CONFIG.weekLabel}`
      : `${CONFIG.weekLabel}  ·  ${stats.weeksGone} yum  ·  W${stats.currentWeek}`;
    drawText(dc, label, new Rect(g.x, y, g.w, 13), {
      font: Font.mediumRoundedSystemFont(L.family === "extraLarge" ? 10 : 7.5),
      color: hex(c.mute, 0.95),
      align: "left",
    });
    if (isWide) {
      drawText(
        dc,
        `${stats.weeksGone}/${stats.weeksInYear} · W${stats.currentWeek}`,
        new Rect(g.x, y, g.w, 13),
        {
          font: Font.mediumRoundedSystemFont(L.family === "extraLarge" ? 10 : 7.5),
          color: hex(c.sakura, 0.95),
          align: "right",
        }
      );
    }
    y += L.family === "extraLarge" ? 18 : 14;
    gridH -= L.family === "extraLarge" ? 18 : 14;
  }

  const cols = L.cols;
  const rows = Math.ceil(stats.weeksInYear / cols);
  const gap = L.family === "large" || L.family === "extraLarge" ? 4.5 : 2.8;
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
    const r = cell * 0.33;
    const weekNum = i + 1;

    if (weekNum <= stats.weeksGone) {
      const t = i / Math.max(1, stats.weeksGone - 1);
      const colHex = mixHex(c.sakura, c.peach, t * 0.7);
      glowEllipse(dc, cx, cy, r * 0.85, colHex, 4, 0.4);
      dc.setFillColor(hex(colHex, 0.98));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setFillColor(hex("#ffffff", 0.65));
      dc.fillEllipse(new Rect(cx - r * 0.45, cy - r * 0.55, r * 0.55, r * 0.4));
    } else if (weekNum === stats.currentWeek) {
      glowEllipse(dc, cx, cy, r * 1.05, c.mint, 5, 0.5);
      glowRing(dc, cx, cy, r * 1.15, c.sakura, 0.45);
      dc.setFillColor(hex(c.mint, 0.98));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setStrokeColor(hex(c.sakura, 0.95));
      dc.setLineWidth(1.1);
      const ring = r * 1.22;
      dc.strokeEllipse(new Rect(cx - ring, cy - ring, ring * 2, ring * 2));
      if (cell >= 7) drawHeart(dc, cx, cy - r * 0.12, r * 0.5, "#ffffff", 0.9);
    } else {
      dc.setFillColor(hex(c.dim, 0.95));
      dc.fillEllipse(new Rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7));
      dc.setStrokeColor(hex(c.dimStroke, 0.8));
      dc.setLineWidth(0.7);
      dc.strokeEllipse(new Rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8));
    }
  }
}

function paintFooter(dc, L, c, stats) {
  const { x, y, w, showTagline } = L.footer;
  const left = `day ${stats.dayOfYear}/${stats.daysInYear}`;
  const right =
    L.family === "small" ? `${stats.daysLeft}d left` : `${stats.daysLeft}d remaining`;
  const fs = L.family === "extraLarge" ? 9 : 7;
  drawText(dc, left, new Rect(x, y, w * 0.5, 12), {
    font: Font.mediumRoundedSystemFont(fs),
    color: hex(c.mute, 0.95),
    align: "left",
  });
  drawText(dc, right, new Rect(x + w * 0.5, y, w * 0.5, 12), {
    font: Font.mediumRoundedSystemFont(fs),
    color: hex(c.sakura, 0.95),
    align: "right",
  });
  if (showTagline) {
    glowText(dc, CONFIG.tagline, new Rect(x, y + 13, w, 13), {
      font: Font.mediumRoundedSystemFont(7.5),
      colorHex: c.sakuraSoft,
      align: "center",
      glow: 0.3,
      finalHex: c.mute,
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

async function presentFamily(family, widget) {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else if (family === "extraLarge") await widget.presentExtraLarge();
  else await widget.presentMedium();
}

// ─── Run ─────────────────────────────────────────────────────

const family = config.widgetFamily || "medium";

if (config.runsInWidget) {
  Script.setWidget(render(family));
} else {
  const table = new UITable();
  table.showSeparators = false;
  const header = new UITableRow();
  header.addText(`♡ Stellara Light`, "Tap a size to preview (incl. iPad XL)");
  table.addRow(header);
  for (const f of ["small", "medium", "large", "extraLarge"]) {
    const row = new UITableRow();
    const hint =
      f === "large"
        ? "iPhone large / iPad big square"
        : f === "extraLarge"
          ? "iPad double-wide XL"
          : "Open preview";
    row.addText(f === "extraLarge" ? "EXTRA LARGE" : f.toUpperCase(), hint);
    row.dismissOnSelect = false;
    row.onSelect = async () => {
      await presentFamily(f, render(f));
    };
    table.addRow(row);
  }
  await table.present();
}

Script.complete();
