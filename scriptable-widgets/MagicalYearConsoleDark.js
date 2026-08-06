// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: magic;
//
// ✦ STELLARA — Magical Girl Year Console (DARK)
// Extra-glowy dark twin. Size-safe. iPad XL supported.
//
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
    lav: "#b48cff",
    peach: "#ffc2a8",
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

// ─── Color / draw helpers ────────────────────────────────────

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

/** Soft fill bloom — strong enough to read on white. */
function softBlob(dc, cx, cy, r, colorHex, alpha) {
  for (let i = 8; i >= 1; i--) {
    const t = i / 8;
    const rr = r * (0.45 + t * 0.95);
    dc.setFillColor(hex(colorHex, alpha * (1 - t) * (1 - t)));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
}

/** Saturated neon rings — the “glow” you can actually see on light UI. */
function neonAura(dc, cx, cy, r, colorHex, strength = 1) {
  for (let i = 7; i >= 1; i--) {
    const grow = i * (2.8 * strength);
    const a = 0.55 * strength * (1 - i / 8);
    dc.setStrokeColor(hex(colorHex, a));
    dc.setLineWidth(2.2 + i * 0.55);
    dc.strokeEllipse(new Rect(cx - r - grow, cy - r - grow, (r + grow) * 2, (r + grow) * 2));
  }
  softBlob(dc, cx, cy, r * 1.6, colorHex, 0.35 * strength);
}

function glowEllipse(dc, cx, cy, r, colorHex, layers = 6, peakAlpha = 0.55) {
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const rr = r * (0.5 + t * 1.5);
    dc.setFillColor(hex(colorHex, peakAlpha * (1 - t) * (1 - t)));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
  dc.setFillColor(hex(colorHex, Math.min(1, peakAlpha + 0.3)));
  dc.fillEllipse(new Rect(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1));
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.9) {
  softBlob(dc, x, y, size * 2.2, colorHex, alpha * 0.45);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7));
  dc.setFillColor(hex(colorHex, alpha * 0.6));
  dc.fillRect(new Rect(x - size * 0.12, y - size, size * 0.24, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.12, size * 2, size * 0.24));
}

function drawHeart(dc, x, y, size, colorHex, alpha = 0.9) {
  const s = size;
  softBlob(dc, x, y + s * 0.1, s * 1.3, colorHex, alpha * 0.4);
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

/** Pink halo text — final fill stays bright sakura so it looks lit. */
function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.7, finalHex } = {}) {
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.65],
    [0, -1, glow * 0.65],
    [1, 0, glow * 0.55],
    [-1, 0, glow * 0.55],
    [0, 2, glow * 0.4],
    [0, -2, glow * 0.35],
    [2, 0, glow * 0.35],
    [-2, 0, glow * 0.35],
    [1, 1, glow * 0.3],
    [-1, 1, glow * 0.3],
    [1, -1, glow * 0.25],
    [-1, -1, glow * 0.25],
    [0, 3, glow * 0.18],
    [3, 0, glow * 0.16],
    [-3, 0, glow * 0.16],
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

// ─── Layouts (exclusive bands — nothing shares pixels) ───────

function widgetSizeFor(family) {
  if (family === "small") return new Size(170, 170);
  if (family === "large") return new Size(360, 380);
  if (family === "extraLarge") return new Size(720, 360);
  return new Size(360, 170);
}

/**
 * Medium / XL left column (top → bottom, exclusive):
 *   header → percent → gap → bar → gap → caption → gap → footer
 * Caption is BELOW the bar so it can never be covered.
 */
function splitLayout(family, w, h, opts) {
  const pad = opts.pad;
  const colGap = opts.gap;
  const leftW = Math.floor(w * opts.leftRatio);
  const rightX = pad + leftW + colGap;
  const rightW = w - rightX - pad;
  const top = pad;
  const bottom = h - pad;

  const headerH = opts.headerH;
  const footerH = opts.footerH;
  const barH = opts.barH;
  const captionH = opts.captionH;
  const g1 = opts.gapAfterHeader; // header → %
  const g2 = opts.gapBeforeBar; // % → bar
  const g3 = opts.gapAfterBar; // bar → caption
  const g4 = opts.gapBeforeFooter; // caption → footer

  const headerY = top;
  const footerY = bottom - footerH;
  const captionY = footerY - g4 - captionH;
  const barY = captionY - g3 - barH;
  const percentY = headerY + headerH + g1;
  const numberH = Math.max(24, barY - g2 - percentY);

  return {
    family,
    mode: "split",
    pad,
    header: { x: pad, y: headerY, w: leftW, h: headerH },
    percent: {
      x: pad,
      y: percentY,
      w: leftW,
      h: numberH,
      numberH,
      captionH: 0, // caption is a separate band below the bar
      font: opts.font,
      showCaptionHere: false,
    },
    bar: { x: pad, y: barY, w: leftW, h: barH },
    caption: { x: pad, y: captionY, w: leftW, h: captionH },
    grid: { x: rightX, y: top + 2, w: rightW, h: bottom - top - 2, showLabel: true },
    footer: { x: pad, y: footerY, w: leftW, h: footerH, showTagline: false },
    cols: opts.cols,
    showSubtitle: opts.showSubtitle,
  };
}

/** Small / large stack: header → % + caption → gap → bar → grid → footer */
function stackLayout(family, w, h, opts) {
  const pad = opts.pad;
  const top = pad;
  const bottom = h - pad;
  const headerH = opts.headerH;
  const numberH = opts.percentH;
  const captionH = opts.captionH;
  const barH = opts.barH;
  const footerH = opts.footerH;

  const headerY = top;
  const percentY = headerY + headerH + opts.gap1;
  const barY = percentY + numberH + captionH + opts.gap2;
  const footerY = bottom - footerH;
  const gridTop = barY + barH + opts.gap3;
  const gridBottom = footerY - opts.gridFooterGap;

  return {
    family,
    mode: "stack",
    pad,
    header: { x: pad, y: headerY, w: w - pad * 2, h: headerH },
    percent: {
      x: pad,
      y: percentY,
      w: w - pad * 2,
      h: numberH + captionH,
      numberH,
      captionH,
      font: opts.font,
      showCaptionHere: true,
    },
    bar: {
      x: pad + (opts.barInset || 0),
      y: barY,
      w: w - pad * 2 - (opts.barInset || 0) * 2,
      h: barH,
    },
    caption: null,
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

function layoutFor(family, w, h) {
  if (family === "small") {
    return stackLayout(family, w, h, {
      pad: 11,
      headerH: 16,
      percentH: 34,
      captionH: 12,
      barH: 8,
      footerH: 12,
      gap1: 4,
      gap2: 8,
      gap3: 6,
      gridFooterGap: 4,
      font: 28,
      cols: 13,
      showSubtitle: false,
      showGridLabel: false,
      showTagline: false,
    });
  }

  if (family === "medium") {
    return splitLayout(family, w, h, {
      pad: 14,
      gap: 14,
      leftRatio: 0.4,
      headerH: 26,
      footerH: 12,
      barH: 9,
      captionH: 14,
      gapAfterHeader: 2,
      gapBeforeBar: 6,
      gapAfterBar: 5,
      gapBeforeFooter: 3,
      font: 30,
      cols: 9,
      showSubtitle: true,
    });
  }

  if (family === "extraLarge") {
    return splitLayout(family, w, h, {
      pad: 22,
      gap: 20,
      leftRatio: 0.34,
      headerH: 36,
      footerH: 16,
      barH: 12,
      captionH: 18,
      gapAfterHeader: 8,
      gapBeforeBar: 10,
      gapAfterBar: 8,
      gapBeforeFooter: 6,
      font: 56,
      cols: 14,
      showSubtitle: true,
    });
  }

  return stackLayout(family, w, h, {
    pad: 18,
    headerH: 36,
    percentH: 56,
    captionH: 18,
    barH: 12,
    footerH: 30,
    gap1: 10,
    gap2: 14,
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

  softBlob(dc, w * 0.1, h * 0.0, Math.max(w, h) * 0.65, c.sakura, 0.28);
  softBlob(dc, w * 0.95, h * 0.15, Math.max(w, h) * 0.55, c.mint, 0.22);
  softBlob(dc, w * 0.85, h * 1.0, Math.max(w, h) * 0.6, c.lav, 0.2);
  softBlob(dc, w * 0.0, h * 0.9, Math.max(w, h) * 0.45, c.sakuraSoft, 0.18);
  softBlob(dc, w * 0.5, h * 0.5, Math.max(w, h) * 0.4, c.sakura, 0.12);

  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.panel, 0.45));

  // Loud glowing frame
  strokeRoundRect(dc, new Rect(inset - 1, inset - 1, w - inset * 2 + 2, h - inset * 2 + 2), 21, hex(c.sakura, 0.25), 6);
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.frame, 0.55), 3.5);
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.sakura, 0.9), 1.5);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    17,
    hex(c.frame2, 0.65),
    1.2
  );

  const deco = [
    [0.09, 0.11, "heart", 4.0],
    [0.91, 0.09, "spark", 2.0],
    [0.93, 0.88, "heart", 3.6],
    [0.07, 0.9, "spark", 1.8],
    [0.5, 0.05, "spark", 1.6],
  ];
  for (const [px, py, kind, s] of deco) {
    if (kind === "heart") drawHeart(dc, w * px, h * py, s, c.sakura, 0.85);
    else drawSpark(dc, w * px, h * py, s, c.star, 0.9);
  }
}

function paintHeader(dc, L, c, stats) {
  const { x, y, w, h } = L.header;
  const small = L.family === "small";
  const titleSize = L.family === "extraLarge" ? 16 : small ? 11 : 12;
  glowText(dc, `✦ ${CONFIG.title}`, new Rect(x, y, w * 0.72, small ? h : 15), {
    font: Font.boldRoundedSystemFont(titleSize),
    colorHex: c.sakura,
    align: "left",
    glow: 0.65,
    finalHex: c.ink,
  });
  if (L.showSubtitle) {
    drawText(dc, CONFIG.subtitle, new Rect(x, y + (L.family === "extraLarge" ? 18 : 14), w * 0.8, 12), {
      font: Font.mediumRoundedSystemFont(L.family === "extraLarge" ? 10 : 7.5),
      color: hex(c.mute, 0.95),
      align: "left",
    });
  }
  glowText(dc, `${stats.year}`, new Rect(x, y, w, small ? h : 14), {
    font: Font.semiboldRoundedSystemFont(L.family === "extraLarge" ? 13 : 10),
    colorHex: c.sakuraSoft,
    align: "right",
    glow: 0.5,
    finalHex: c.sakura,
  });
}

function paintPercent(dc, L, c, stats) {
  const { x, y, w, numberH, captionH, font, showCaptionHere } = L.percent;
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const cx = x + w / 2;
  const cy = y + numberH * 0.52;
  const auraR = Math.min(w, numberH) * 0.28;

  // Visible neon plate behind the number
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.7, c.sakura, 0.5);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.45, c.lav, 0.4);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.28, c.mintSoft, 0.3);
  neonAura(dc, cx, cy, auraR, c.sakura, 1.15);
  neonAura(dc, cx, cy, auraR * 0.55, c.lav, 0.7);

  glowText(dc, pctStr, new Rect(x, y, w, numberH), {
    font: Font.boldRoundedSystemFont(font),
    colorHex: c.sakuraSoft,
    align: "center",
    glow: 0.85,
    finalHex: c.inkSoft,
  });

  if (showCaptionHere && captionH > 0) {
    const capFont = L.family === "small" ? 7.5 : L.family === "extraLarge" ? 11 : 9;
    glowText(dc, CONFIG.percentCaption, new Rect(x, y + numberH, w, captionH), {
      font: Font.mediumRoundedSystemFont(capFont),
      colorHex: c.sakura,
      align: "center",
      glow: 0.45,
      finalHex: c.inkSoft,
    });
  }
}

function paintCaptionBand(dc, L, c) {
  if (!L.caption) return;
  const { x, y, w, h } = L.caption;
  // Soft glow plate so the label feels lit
  softBlob(dc, x + w / 2, y + h / 2, Math.max(w * 0.45, 20), c.sakuraSoft, 0.35);
  const capFont = L.family === "extraLarge" ? 12 : 9;
  glowText(dc, CONFIG.percentCaption, new Rect(x, y, w, h), {
    font: Font.mediumRoundedSystemFont(capFont),
    colorHex: c.sakura,
    align: "center",
    glow: 0.55,
    finalHex: c.inkSoft,
  });
}

function paintProgressBar(dc, L, c, stats) {
  const { x, y, w, h } = L.bar;

  // Glow ONLY downward + sideways — never upward over caption/% 
  for (let i = 4; i >= 1; i--) {
    const grow = i * 2.2;
    fillRoundRect(
      dc,
      new Rect(x - grow * 0.35, y, w + grow * 0.7, h + grow * 0.95),
      (h + grow * 0.5) / 2,
      hex(c.sakura, 0.14 * (5 - i))
    );
  }

  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.98));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.sakuraSoft, 0.7), 1);

  const fillW = Math.max(h, w * stats.pct);
  const segs = 28;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const col =
      t < 0.5 ? mixHex(c.sakura, c.peach, t * 2) : mixHex(c.peach, c.mint, (t - 0.5) * 2);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.5, h), h / 2, hex(col, 1));
  }

  // Tip glow — mostly to the right / center, slight vertical but short
  const tipX = Math.min(x + fillW, x + w - 1);
  glowEllipse(dc, tipX, y + h / 2, Math.max(5, h * 0.95), c.sakura, 4, 0.65);
  glowEllipse(dc, tipX, y + h / 2, Math.max(3.5, h * 0.55), c.star, 3, 0.55);
  drawSpark(dc, tipX, y + h / 2, Math.min(2.8, h * 0.5), c.star, 1);
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
  const gap = L.family === "large" || L.family === "extraLarge" ? 4.5 : 3;
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
    const r = cell * 0.32;
    const weekNum = i + 1;

    if (weekNum <= stats.weeksGone) {
      const t = i / Math.max(1, stats.weeksGone - 1);
      const colHex = mixHex(c.sakura, c.peach, t * 0.7);
      // Visible candy halo
      softBlob(dc, cx, cy, r * 1.6, colHex, 0.45);
      dc.setStrokeColor(hex(colHex, 0.55));
      dc.setLineWidth(1.4);
      dc.strokeEllipse(new Rect(cx - r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5));
      dc.setFillColor(hex(colHex, 1));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setFillColor(hex("#ffffff", 0.7));
      dc.fillEllipse(new Rect(cx - r * 0.45, cy - r * 0.55, r * 0.55, r * 0.4));
    } else if (weekNum === stats.currentWeek) {
      neonAura(dc, cx, cy, r * 0.9, c.mint, 0.9);
      softBlob(dc, cx, cy, r * 1.8, c.sakura, 0.35);
      dc.setFillColor(hex(c.mint, 1));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setStrokeColor(hex(c.sakura, 1));
      dc.setLineWidth(1.4);
      const ring = r * 1.28;
      dc.strokeEllipse(new Rect(cx - ring, cy - ring, ring * 2, ring * 2));
      // active crystal core highlight
      dc.setFillColor(hex(c.ink, 0.55));
      dc.fillEllipse(new Rect(cx - r * 0.35, cy - r * 0.4, r * 0.45, r * 0.35));
    } else {
      dc.setFillColor(hex(c.dim, 0.95));
      dc.fillEllipse(new Rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7));
      dc.setStrokeColor(hex(c.dimStroke, 0.85));
      dc.setLineWidth(0.8);
      dc.strokeEllipse(new Rect(cx - r * 0.95, cy - r * 0.95, r * 1.9, r * 1.9));
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
      glow: 0.4,
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
  paintCaptionBand(dc, L, c); // after bar — caption sits in its own band on split layouts
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
  header.addText(`✦ Stellara Dark`, "Tap a size — re-paste script if widget looks stale");
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
