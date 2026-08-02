// Variables used by Scriptable.
// These must be at the very top of the file.
// icon-color: pink; icon-glyph: heart;
//
// ♡ STELLARA — Magical Girl Year Console (LIGHT / COQUETTE)
// Soft pastel coquette console + neon-cyber year bar
// (yellow → pink → purple → light blue), soft blooms only.
//
// After updating: Select All → Paste in Scriptable, then
// remove & re-add the Home Screen widget.
//
// Dark twin: MagicalYearConsoleDark.js

const CONFIG = {
  title: "STELLARA",
  subtitle: "KAWAII CONSOLE",
  weekLabel: "WEEK CANDIES",
  percentCaption: "♡ year sparkle",
  tagline: "stay soft · stay sparkling · you got this",
  // Soft girl palette + cyber bar stops
  colors: {
    bg0: "#fff7fb",
    bg1: "#ffeef6",
    panel: "#ffffff",
    sakura: "#ff7eb6",
    sakuraSoft: "#ffb0d2",
    rose: "#e891b0",
    mint: "#9adfd0",
    star: "#ffe08a",
    lav: "#d2b8ff",
    peach: "#ffd0bc",
    ink: "#8a3a5c",
    inkSoft: "#a85878",
    mute: "#c49aaf",
    dim: "#ffe8f1",
    dimStroke: "#f3c6d8",
    frame: "#ffc1d9",
    frame2: "#d8c4ff",
    // Neon bar gradient (magical-girl cyber)
    gYellow: "#ffe566",
    gPink: "#ff6fb5",
    gPurple: "#c084fc",
    gBlue: "#8ecbff",
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

/** Yellow → pink → purple → light blue along 0..1 */
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

/** Soft feathered bloom — no hard ring edges. */
function softBlob(dc, cx, cy, r, colorHex, alpha) {
  for (let i = 10; i >= 1; i--) {
    const t = i / 10;
    const rr = r * (0.35 + t * 1.05);
    const a = alpha * Math.pow(1 - t, 1.65);
    dc.setFillColor(hex(colorHex, a));
    dc.fillEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
  }
}

/** Soft pill bloom under/around a bar — rounded, feathered, no strokes. */
function softBarGlow(dc, x, y, w, h, colorHex, strength = 1) {
  for (let i = 7; i >= 1; i--) {
    const t = i / 7;
    // Expand mostly down + sideways so we never cover content above
    const gx = i * 2.2 * strength;
    const gyUp = i * 0.35 * strength; // tiny upward bleed only
    const gyDown = i * 2.8 * strength;
    fillRoundRect(
      dc,
      new Rect(x - gx, y - gyUp, w + gx * 2, h + gyUp + gyDown),
      (h + gyUp + gyDown) / 2,
      hex(colorHex, 0.16 * strength * (1 - t) * (1 - t))
    );
  }
}

function drawSpark(dc, x, y, size, colorHex, alpha = 0.75) {
  softBlob(dc, x, y, size * 2.4, colorHex, alpha * 0.4);
  dc.setFillColor(hex(colorHex, alpha));
  dc.fillEllipse(new Rect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6));
  dc.setFillColor(hex(colorHex, alpha * 0.45));
  dc.fillRect(new Rect(x - size * 0.08, y - size, size * 0.16, size * 2));
  dc.fillRect(new Rect(x - size, y - size * 0.08, size * 2, size * 0.16));
}

function drawHeart(dc, x, y, size, colorHex, alpha = 0.8) {
  const s = size;
  softBlob(dc, x, y + s * 0.1, s * 1.2, colorHex, alpha * 0.35);
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

function glowText(dc, text, rect, { font, colorHex, align = "center", glow = 0.4, finalHex } = {}) {
  // Soft text halo — gentle, coquette, not neon-outline
  const offsets = [
    [0, 0, glow],
    [0, 1, glow * 0.45],
    [0, -1, glow * 0.4],
    [1, 0, glow * 0.35],
    [-1, 0, glow * 0.35],
    [0, 2, glow * 0.22],
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

// ─── Layouts ─────────────────────────────────────────────────

function widgetSizeFor(family) {
  if (family === "small") return new Size(170, 170);
  if (family === "large") return new Size(360, 380);
  if (family === "extraLarge") return new Size(720, 360);
  return new Size(360, 170);
}

/** Split: header → % → bar → caption → footer (caption never under bar) */
function splitLayout(family, w, h, opts) {
  const pad = opts.pad;
  const colGap = opts.gap;
  const leftW = Math.floor(w * opts.leftRatio);
  const rightX = pad + leftW + colGap;
  const rightW = w - rightX - pad;
  const top = pad;
  const bottom = h - pad;

  const headerY = top;
  const footerY = bottom - opts.footerH;
  const captionY = footerY - opts.gapBeforeFooter - opts.captionH;
  const barY = captionY - opts.gapAfterBar - opts.barH;
  const percentY = headerY + opts.headerH + opts.gapAfterHeader;
  const numberH = Math.max(24, barY - opts.gapBeforeBar - percentY);

  return {
    family,
    mode: "split",
    pad,
    header: { x: pad, y: headerY, w: leftW, h: opts.headerH },
    percent: {
      x: pad,
      y: percentY,
      w: leftW,
      h: numberH,
      numberH,
      captionH: 0,
      font: opts.font,
      showCaptionHere: false,
    },
    bar: { x: pad, y: barY, w: leftW, h: opts.barH },
    caption: { x: pad, y: captionY, w: leftW, h: opts.captionH },
    grid: { x: rightX, y: top + 2, w: rightW, h: bottom - top - 2, showLabel: true },
    footer: { x: pad, y: footerY, w: leftW, h: opts.footerH, showTagline: false },
    cols: opts.cols,
    showSubtitle: opts.showSubtitle,
  };
}

function stackLayout(family, w, h, opts) {
  const pad = opts.pad;
  const top = pad;
  const bottom = h - pad;
  const headerY = top;
  const percentY = headerY + opts.headerH + opts.gap1;
  const barY = percentY + opts.percentH + opts.captionH + opts.gap2;
  const footerY = bottom - opts.footerH;
  const gridTop = barY + opts.barH + opts.gap3;
  const gridBottom = footerY - opts.gridFooterGap;

  return {
    family,
    mode: "stack",
    pad,
    header: { x: pad, y: headerY, w: w - pad * 2, h: opts.headerH },
    percent: {
      x: pad,
      y: percentY,
      w: w - pad * 2,
      h: opts.percentH + opts.captionH,
      numberH: opts.percentH,
      captionH: opts.captionH,
      font: opts.font,
      showCaptionHere: true,
    },
    bar: {
      x: pad + (opts.barInset || 0),
      y: barY,
      w: w - pad * 2 - (opts.barInset || 0) * 2,
      h: opts.barH,
    },
    caption: null,
    grid: {
      x: pad,
      y: gridTop,
      w: w - pad * 2,
      h: Math.max(24, gridBottom - gridTop),
      showLabel: opts.showGridLabel,
    },
    footer: { x: pad, y: footerY, w: w - pad * 2, h: opts.footerH, showTagline: opts.showTagline },
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
      barH: 10,
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
      barH: 14,
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
    barH: 13,
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

  // Soft coquette wash — gentle, pastel, no neon blast
  softBlob(dc, w * 0.15, h * 0.05, Math.max(w, h) * 0.5, c.sakuraSoft, 0.22);
  softBlob(dc, w * 0.9, h * 0.2, Math.max(w, h) * 0.42, c.lav, 0.16);
  softBlob(dc, w * 0.75, h * 0.95, Math.max(w, h) * 0.45, c.gBlue, 0.12);
  softBlob(dc, w * 0.05, h * 0.85, Math.max(w, h) * 0.32, c.peach, 0.14);

  const inset = 4;
  fillRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.panel, 0.55));
  strokeRoundRect(dc, new Rect(inset, inset, w - inset * 2, h - inset * 2), 20, hex(c.frame, 0.55), 1.2);
  strokeRoundRect(
    dc,
    new Rect(inset + 3, inset + 3, w - (inset + 3) * 2, h - (inset + 3) * 2),
    17,
    hex(c.frame2, 0.35),
    0.8
  );

  // Tiny soft deco
  drawHeart(dc, w * 0.1, h * 0.12, 3.0, c.sakuraSoft, 0.55);
  drawSpark(dc, w * 0.9, h * 0.1, 1.3, c.star, 0.6);
  drawHeart(dc, w * 0.92, h * 0.88, 2.6, c.lav, 0.45);
  drawSpark(dc, w * 0.08, h * 0.9, 1.1, c.gBlue, 0.5);
}

function paintHeader(dc, L, c, stats) {
  const { x, y, w, h } = L.header;
  const small = L.family === "small";
  const titleSize = L.family === "extraLarge" ? 16 : small ? 11 : 12;
  glowText(dc, `♡ ${CONFIG.title}`, new Rect(x, y, w * 0.72, small ? h : 15), {
    font: Font.boldRoundedSystemFont(titleSize),
    colorHex: c.sakura,
    align: "left",
    glow: 0.35,
    finalHex: c.ink,
  });
  if (L.showSubtitle) {
    drawText(dc, CONFIG.subtitle, new Rect(x, y + (L.family === "extraLarge" ? 18 : 14), w * 0.8, 12), {
      font: Font.mediumRoundedSystemFont(L.family === "extraLarge" ? 10 : 7.5),
      color: hex(c.mute, 0.95),
      align: "left",
    });
  }
  drawText(dc, `${stats.year}`, new Rect(x, y, w, small ? h : 14), {
    font: Font.semiboldRoundedSystemFont(L.family === "extraLarge" ? 13 : 10),
    color: hex(c.rose, 0.95),
    align: "right",
  });
}

function paintPercent(dc, L, c, stats) {
  const { x, y, w, numberH, captionH, font, showCaptionHere } = L.percent;
  const pctStr = `${(stats.pct * 100).toFixed(1)}%`;
  const cx = x + w / 2;
  const cy = y + numberH * 0.52;

  // Soft pastel bloom only (no hard rings)
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.62, c.sakuraSoft, 0.28);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.4, c.lav, 0.18);
  softBlob(dc, cx, cy, Math.min(w, numberH) * 0.22, c.gBlue, 0.1);

  glowText(dc, pctStr, new Rect(x, y, w, numberH), {
    font: Font.boldRoundedSystemFont(font),
    colorHex: c.sakuraSoft,
    align: "center",
    glow: 0.4,
    finalHex: c.ink,
  });

  if (showCaptionHere && captionH > 0) {
    const capFont = L.family === "small" ? 7.5 : 9;
    drawText(dc, CONFIG.percentCaption, new Rect(x, y + numberH, w, captionH), {
      font: Font.mediumRoundedSystemFont(capFont),
      color: hex(c.mute, 0.95),
      align: "center",
    });
  }
}

function paintCaptionBand(dc, L, c) {
  if (!L.caption) return;
  const { x, y, w, h } = L.caption;
  softBlob(dc, x + w / 2, y + h / 2, Math.max(w * 0.4, 18), c.sakuraSoft, 0.18);
  const capFont = L.family === "extraLarge" ? 12 : 9;
  drawText(dc, CONFIG.percentCaption, new Rect(x, y, w, h), {
    font: Font.mediumRoundedSystemFont(capFont),
    color: hex(c.inkSoft, 0.95),
    align: "center",
  });
}

function paintProgressBar(dc, L, c, stats) {
  const { x, y, w, h } = L.bar;
  const fillW = Math.max(h, w * stats.pct);

  // Layered soft neon underglow in gradient hues (cyber magical girl)
  softBarGlow(dc, x, y, fillW, h, c.gPink, 1.35);
  softBarGlow(dc, x, y, fillW, h, c.gPurple, 0.9);
  softBarGlow(dc, x + fillW * 0.55, y, Math.max(h, fillW * 0.5), h, c.gBlue, 0.75);
  softBarGlow(dc, x, y, Math.max(h, fillW * 0.35), h, c.gYellow, 0.7);

  // Soft track
  fillRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dim, 0.95));
  strokeRoundRect(dc, new Rect(x, y, w, h), h / 2, hex(c.dimStroke, 0.55), 0.7);

  // Neon fill — yellow → pink → purple → light blue
  const segs = 36;
  const segW = fillW / segs;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const col = cyberGradient(t, c);
    fillRoundRect(dc, new Rect(x + i * segW, y, segW + 0.7, h), h / 2, hex(col, 1));
  }

  // Soft luminous tip (feathered bloom + tiny heart — no hard ring)
  const tipX = Math.min(x + fillW, x + w - 1);
  softBlob(dc, tipX, y + h / 2, Math.max(8, h * 1.6), c.gBlue, 0.55);
  softBlob(dc, tipX, y + h / 2, Math.max(6, h * 1.15), c.gPink, 0.45);
  softBlob(dc, tipX, y + h / 2, Math.max(4, h * 0.7), c.gYellow, 0.4);
  drawHeart(dc, tipX, y + h / 2 - 0.3, Math.min(4.0, h * 0.75), "#ffffff", 0.95);
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
          color: hex(c.rose, 0.95),
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
      // Soft pastel candies along the same cyber gradient
      const t = i / Math.max(1, stats.weeksInYear - 1);
      const colHex = cyberGradient(t * 0.85, c);
      softBlob(dc, cx, cy, r * 1.35, colHex, 0.28);
      dc.setFillColor(hex(colHex, 0.92));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      dc.setFillColor(hex("#ffffff", 0.55));
      dc.fillEllipse(new Rect(cx - r * 0.42, cy - r * 0.52, r * 0.5, r * 0.36));
    } else if (weekNum === stats.currentWeek) {
      softBlob(dc, cx, cy, r * 1.8, c.gBlue, 0.4);
      softBlob(dc, cx, cy, r * 1.3, c.gPink, 0.3);
      dc.setFillColor(hex(c.gBlue, 0.95));
      dc.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      if (cell >= 7) drawHeart(dc, cx, cy - r * 0.08, r * 0.45, "#ffffff", 0.9);
    } else {
      dc.setFillColor(hex(c.dim, 0.9));
      dc.fillEllipse(new Rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7));
      dc.setStrokeColor(hex(c.dimStroke, 0.55));
      dc.setLineWidth(0.6);
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
    color: hex(c.rose, 0.95),
    align: "right",
  });
  if (showTagline) {
    drawText(dc, CONFIG.tagline, new Rect(x, y + 13, w, 13), {
      font: Font.mediumRoundedSystemFont(7.5),
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
  paintCaptionBand(dc, L, c);
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

const family = config.widgetFamily || "medium";

if (config.runsInWidget) {
  Script.setWidget(render(family));
} else {
  const table = new UITable();
  table.showSeparators = false;
  const header = new UITableRow();
  header.addText(`♡ Stellara Light`, "Soft coquette + cyber year bar");
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
