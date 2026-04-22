/**
 * drawing.js — SVG wiring diagrams (schematic style, theme-aware)
 */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

function getClr() {
  const dk = document.documentElement.classList.contains('dark-theme');
  return {
    bg:     dk ? '#21262d' : '#f6f8fa',
    bg2:    dk ? '#161b22' : '#ffffff',
    border: dk ? '#30363d' : '#d0d7de',
    text:   dk ? '#e6edf3' : '#1f2328',
    text2:  dk ? '#8b949e' : '#57606a',
    accent: dk ? '#58a6ff' : '#0969da',
    ok:     dk ? '#3fb950' : '#1a7f37',
    warn:   dk ? '#f0883e' : '#bc4c00',
    wA:     '#e05a2b',   // Wire A color
    wB:     '#2ba84a',   // Wire B color
    wC:     '#2b6ce0',   // Wire C color
    toroid: dk ? '#5a4020' : '#c8a060',
    toroidFill: dk ? '#3a2a10' : '#f5e8cc',
    dot:    dk ? '#e6edf3' : '#1f2328',
    gnd:    dk ? '#8b949e' : '#57606a',
  };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function svgTxt(svg, x, y, txt, attrs) {
  const el = svgEl('text', Object.assign({
    x, y, 'font-size': '12',
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif'
  }, attrs));
  el.textContent = txt;
  svg.appendChild(el);
  return el;
}

/** Draw junction dot */
function dot(svg, x, y, clr) {
  svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 4, fill: clr.dot }));
}

/** Draw ground symbol */
function gndSymbol(svg, x, y, clr) {
  svg.appendChild(svgEl('line', { x1: x, y1: y, x2: x, y2: y + 14, stroke: clr.gnd, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('line', { x1: x - 12, y1: y + 14, x2: x + 12, y2: y + 14, stroke: clr.gnd, 'stroke-width': 2 }));
  svg.appendChild(svgEl('line', { x1: x - 8,  y1: y + 19, x2: x + 8,  y2: y + 19, stroke: clr.gnd, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('line', { x1: x - 4,  y1: y + 24, x2: x + 4,  y2: y + 24, stroke: clr.gnd, 'stroke-width': 1 }));
}

/**
 * Draw a toroid ring (top view) with N-turn bumps on the outer edge.
 * Returns the SVG element.
 */
function drawToroidRing(svg, cx, cy, OR, IR, turns, clr) {
  // Toroid fill ring
  svg.appendChild(svgEl('circle', { cx, cy, r: OR, fill: clr.toroidFill, stroke: clr.toroid, 'stroke-width': 3 }));
  svg.appendChild(svgEl('circle', { cx, cy, r: IR, fill: clr.bg }));

  // Draw turn bumps on outer edge
  const displayTurns = Math.min(turns * 3, 48); // 3 wires × N turns
  for (let i = 0; i < displayTurns; i++) {
    const angle = (2 * Math.PI * i / displayTurns) - Math.PI / 2;
    const bx = cx + OR * Math.cos(angle);
    const by = cy + OR * Math.sin(angle);
    svg.appendChild(svgEl('circle', {
      cx: bx, cy: by, r: 3.5,
      fill: clr.bg, stroke: clr.toroid, 'stroke-width': 1.5
    }));
  }
}

/**
 * Draw 9:1 UnUn wiring diagram (trifilar, M0UKD style)
 *
 * Connections:
 *   A1 → Wire Antenna (450Ω)
 *   {B1, C1} → 50Ω center conductor
 *   {A2, B2, C2} → Ground / 50Ω shield
 */
function drawTrifilarDiagram(container, cr) {
  container.innerHTML = '';
  const clr = getClr();
  const N = cr.turns;

  const W = 520, H = 320;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg }));

  // Title
  svgTxt(svg, W / 2, 18, `9:1 UnUn — トリファイラ巻き ${N}回 / ${cr.core.label}`,
    { 'text-anchor': 'middle', fill: clr.accent, 'font-weight': 'bold', 'font-size': '13' });

  // === Toroid ===
  const tx = 145, ty = 165, OR = 108, IR = 58;
  drawToroidRing(svg, tx, ty, OR, IR, N, clr);
  svgTxt(svg, tx, ty - 8, `${N}回`,
    { 'text-anchor': 'middle', fill: clr.text, 'font-weight': 'bold', 'font-size': '16' });
  svgTxt(svg, tx, ty + 10, '巻き',
    { 'text-anchor': 'middle', fill: clr.text2, 'font-size': '12' });

  // === Wire leads exiting right side of toroid ===
  // A1, B1, C1 = starts (left exit from toroid right side = upper half)
  // A2, B2, C2 = ends (right exit from toroid = lower half)
  const exitX = tx + OR - 8;  // right edge of toroid
  const leads = [
    { label: 'A1', y: ty - 54, color: clr.wA },
    { label: 'B1', y: ty - 24, color: clr.wB },
    { label: 'C1', y: ty + 6,  color: clr.wC },
    { label: 'A2', y: ty + 46, color: clr.wA },
    { label: 'B2', y: ty + 76, color: clr.wB },
    { label: 'C2', y: ty + 106,color: clr.wC },
  ];

  const termX = 295; // terminal column X

  leads.forEach(l => {
    // Horizontal lead line from toroid to terminal column
    svg.appendChild(svgEl('line', {
      x1: exitX, y1: l.y, x2: termX, y2: l.y,
      stroke: l.color, 'stroke-width': 2.5
    }));
    // Open circle terminal
    svg.appendChild(svgEl('circle', { cx: termX, cy: l.y, r: 5, fill: clr.bg, stroke: l.color, 'stroke-width': 2 }));
    // Label
    svgTxt(svg, termX + 10, l.y + 4, l.label, { fill: l.color, 'font-weight': 'bold', 'font-size': '12' });
  });

  // === Connection lines on right side ===
  const connX1 = 340; // after labels
  const connX2 = 400; // bus bar X

  // --- Antenna side: A1 → antenna ---
  const yA1 = leads[0].y;
  svg.appendChild(svgEl('line', { x1: connX1, y1: yA1, x2: W - 30, y2: yA1, stroke: clr.wA, 'stroke-width': 2 }));
  // Antenna symbol (simple wire end)
  svg.appendChild(svgEl('line', { x1: W - 30, y1: yA1 - 16, x2: W - 30, y2: yA1 + 16, stroke: clr.wA, 'stroke-width': 2 }));
  svg.appendChild(svgEl('line', { x1: W - 30, y1: yA1, x2: W - 10, y2: yA1, stroke: clr.wA, 'stroke-width': 2.5 }));
  svgTxt(svg, W - 28, yA1 - 20, '450Ω', { fill: clr.warn, 'font-weight': 'bold', 'font-size': '11' });
  svgTxt(svg, W - 28, yA1 - 8,  'To Wire', { fill: clr.text2, 'font-size': '10' });
  svgTxt(svg, W - 28, yA1 + 2,  'Antenna', { fill: clr.text2, 'font-size': '10' });

  // --- 50Ω center: B1 + C1 connected together → coax center ---
  const yB1 = leads[1].y;
  const yC1 = leads[2].y;
  const yMid50 = (yB1 + yC1) / 2;

  // B1, C1 lines to bus
  svg.appendChild(svgEl('line', { x1: connX1, y1: yB1, x2: connX2, y2: yB1, stroke: clr.wB, 'stroke-width': 2 }));
  svg.appendChild(svgEl('line', { x1: connX1, y1: yC1, x2: connX2, y2: yC1, stroke: clr.wC, 'stroke-width': 2 }));
  // Bus bar (vertical)
  svg.appendChild(svgEl('line', { x1: connX2, y1: yB1, x2: connX2, y2: yC1, stroke: clr.dot, 'stroke-width': 2 }));
  // Junction dots
  dot(svg, connX2, yB1, clr);
  dot(svg, connX2, yC1, clr);
  // Horizontal to coax symbol
  svg.appendChild(svgEl('line', { x1: connX2, y1: yMid50, x2: W - 30, y2: yMid50, stroke: clr.dot, 'stroke-width': 2 }));
  dot(svg, connX2, yMid50, clr);

  // --- Coax symbol ---
  const coaxY = yMid50;
  svg.appendChild(svgEl('circle', { cx: W - 24, cy: coaxY, r: 11, fill: clr.bg2, stroke: clr.ok, 'stroke-width': 2 }));
  svg.appendChild(svgEl('circle', { cx: W - 24, cy: coaxY, r: 4, fill: clr.ok }));
  svgTxt(svg, W - 12, coaxY - 18, '50Ω', { fill: clr.ok, 'font-weight': 'bold', 'font-size': '11' });
  svgTxt(svg, W - 12, coaxY - 8, 'To Radio', { fill: clr.text2, 'font-size': '10' });
  svgTxt(svg, W - 12, coaxY + 2, 'or Tuner', { fill: clr.text2, 'font-size': '10' });

  // --- Ground: A2 + B2 + C2 connected together → ground + coax shield ---
  const yA2 = leads[3].y;
  const yB2 = leads[4].y;
  const yC2 = leads[5].y;
  const yMidGnd = (yA2 + yC2) / 2;

  // Lines to bus
  [yA2, yB2, yC2].forEach((y, i) => {
    svg.appendChild(svgEl('line', { x1: connX1, y1: y, x2: connX2, y2: y, stroke: leads[3 + i].color, 'stroke-width': 2 }));
  });
  // Vertical bus
  svg.appendChild(svgEl('line', { x1: connX2, y1: yA2, x2: connX2, y2: yC2, stroke: clr.dot, 'stroke-width': 2 }));
  [yA2, yB2, yC2].forEach(y => dot(svg, connX2, y, clr));

  // Line to coax shield (same coax symbol, extend down)
  svg.appendChild(svgEl('line', { x1: connX2, y1: yMidGnd, x2: W - 24, y2: yMidGnd, stroke: clr.dot, 'stroke-width': 2 }));
  dot(svg, connX2, yMidGnd, clr);
  // Coax outer line
  svg.appendChild(svgEl('line', { x1: W - 24, y1: coaxY + 11, x2: W - 24, y2: yMidGnd, stroke: clr.ok, 'stroke-width': 2 }));
  dot(svg, W - 24, yMidGnd, clr);

  // Ground symbol
  gndSymbol(svg, W - 24, yMidGnd, clr);
  svgTxt(svg, W - 12, yMidGnd + 4, 'Ground Rod', { fill: clr.gnd, 'font-size': '10' });
  svgTxt(svg, W - 12, yMidGnd + 16, 'Counterpoise', { fill: clr.gnd, 'font-size': '10' });

  // Info row
  svgTxt(svg, 8, H - 24, `線材長(1本): ${(parseFloat(cr.wireLength_m)/3).toFixed(2)}m × 3本 = ${cr.wireLength_m}m   実効L: ${cr.L_actual_uH}μH   XL: ${cr.Xl_actual}Ω`,
    { fill: clr.ok, 'font-size': '10' });
  svgTxt(svg, 8, H - 10, `製作: 3本の電線を束ねて ${N}回均等巻き → 上記配線で接続`,
    { fill: clr.text2, 'font-size': '10' });

  container.appendChild(svg);
}

/**
 * Draw Bifilar/Balun wiring diagram.
 * Shows A1, B1 (starts) and A2, B2 (ends) with correct connections.
 */
function drawBifilarDiagram(container, cr, txType, pattern) {
  container.innerHTML = '';
  const clr = getClr();
  const N   = cr.turns;
  const m   = cr.method;

  const W = 520, H = 260;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg }));

  svgTxt(svg, W / 2, 18, `${m.shortName} — ${m.name} ${N}回 / ${cr.core.label}`,
    { 'text-anchor': 'middle', fill: clr.accent, 'font-weight': 'bold', 'font-size': '13' });

  // Toroid
  const tx = 130, ty = 130, OR = 90, IR = 46;
  drawToroidRing(svg, tx, ty, OR, IR, N, clr);
  svgTxt(svg, tx, ty - 8, `${N}回`, { 'text-anchor': 'middle', fill: clr.text, 'font-weight': 'bold', 'font-size': '16' });
  svgTxt(svg, tx, ty + 10, '巻き',  { 'text-anchor': 'middle', fill: clr.text2, 'font-size': '12' });

  const exitX = tx + OR - 6;
  const leads = [
    { label: 'A1', y: ty - 40, color: clr.wA },
    { label: 'B1', y: ty - 8,  color: clr.wB },
    { label: 'A2', y: ty + 30, color: clr.wA },
    { label: 'B2', y: ty + 62, color: clr.wB },
  ];

  const termX = 275;
  leads.forEach(l => {
    svg.appendChild(svgEl('line', { x1: exitX, y1: l.y, x2: termX, y2: l.y, stroke: l.color, 'stroke-width': 2.5 }));
    svg.appendChild(svgEl('circle', { cx: termX, cy: l.y, r: 5, fill: clr.bg, stroke: l.color, 'stroke-width': 2 }));
    svgTxt(svg, termX + 10, l.y + 4, l.label, { fill: l.color, 'font-weight': 'bold', 'font-size': '12' });
  });

  const connX = 330, busX = 390;
  const isCurrentBalun = m.windType === 'current-balun';

  if (isCurrentBalun) {
    // 1:1 Balun: A1→Coax center, B1→Coax shield, A2→Antenna+, B2→Antenna-
    const yA1 = leads[0].y, yB1 = leads[1].y;
    const yA2 = leads[2].y, yB2 = leads[3].y;

    // Left: Coax
    svg.appendChild(svgEl('line', { x1: connX, y1: yA1, x2: busX, y2: yA1, stroke: clr.wA, 'stroke-width': 2 }));
    svg.appendChild(svgEl('line', { x1: connX, y1: yB1, x2: busX, y2: yB1, stroke: clr.wB, 'stroke-width': 2 }));
    // Coax symbol
    svg.appendChild(svgEl('circle', { cx: busX + 14, cy: (yA1 + yB1) / 2, r: 13, fill: clr.bg2, stroke: clr.ok, 'stroke-width': 2 }));
    svg.appendChild(svgEl('circle', { cx: busX + 14, cy: yA1, r: 3, fill: clr.wA }));
    svg.appendChild(svgEl('circle', { cx: busX + 14, cy: yB1, r: 3, fill: clr.wB }));
    svgTxt(svg, busX + 30, yA1 + 4,  'A1 → 同軸センター', { fill: clr.wA, 'font-size': '10' });
    svgTxt(svg, busX + 30, yB1 + 4,  'B1 → 同軸シールド', { fill: clr.wB, 'font-size': '10' });

    // Right: Antenna
    svg.appendChild(svgEl('line', { x1: connX, y1: yA2, x2: busX, y2: yA2, stroke: clr.wA, 'stroke-width': 2 }));
    svg.appendChild(svgEl('line', { x1: connX, y1: yB2, x2: busX, y2: yB2, stroke: clr.wB, 'stroke-width': 2 }));
    svgTxt(svg, busX + 4, yA2 + 4, 'A2 → アンテナ＋', { fill: clr.wA, 'font-size': '10' });
    svgTxt(svg, busX + 4, yB2 + 4, 'B2 → アンテナ－', { fill: clr.wB, 'font-size': '10' });

  } else {
    // 4:1 or 2:1: A2=B1 junction (series tap)
    const yA1 = leads[0].y, yB1 = leads[1].y;
    const yA2 = leads[2].y, yB2 = leads[3].y;

    // A2 + B1 junction
    svg.appendChild(svgEl('line', { x1: connX, y1: yA2, x2: busX, y2: yA2, stroke: clr.wA, 'stroke-width': 2 }));
    svg.appendChild(svgEl('line', { x1: connX, y1: yB1, x2: busX, y2: yB1, stroke: clr.wB, 'stroke-width': 2 }));
    svg.appendChild(svgEl('line', { x1: busX, y1: yA2, x2: busX, y2: yB1, stroke: clr.dot, 'stroke-width': 2 }));
    const yJunction = (yA2 + yB1) / 2;
    dot(svg, busX, yA2, clr);
    dot(svg, busX, yB1, clr);
    dot(svg, busX, yJunction, clr);

    if (m.shortName === '4:1 UnUn') {
      // A1 → Antenna, A2=B1 → GND+Coax shield, B2 → Coax center...
      // Actually: A1=Coax center, A2=B1=GND, B2=Antenna
      svg.appendChild(svgEl('line', { x1: connX, y1: yA1, x2: W - 20, y2: yA1, stroke: clr.wA, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yA1 + 4, 'A1 → 同軸センター(50Ω)', { fill: clr.ok, 'font-size': '10' });
      svg.appendChild(svgEl('line', { x1: busX, y1: yJunction, x2: W - 20, y2: yJunction, stroke: clr.dot, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yJunction + 4, 'A2=B1 → GND・シールド', { fill: clr.text2, 'font-size': '10' });
      svg.appendChild(svgEl('line', { x1: connX, y1: yB2, x2: W - 20, y2: yB2, stroke: clr.wB, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yB2 + 4, 'B2 → アンテナ(~200Ω)', { fill: clr.warn, 'font-size': '10' });
      gndSymbol(svg, W - 20, yJunction + 4, clr);
    } else {
      // 4:1 Balun or 2:1 Balun
      svg.appendChild(svgEl('line', { x1: connX, y1: yA1, x2: W - 20, y2: yA1, stroke: clr.wA, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yA1 + 4, 'A1 → 同軸センター(50Ω)', { fill: clr.ok, 'font-size': '10' });
      svg.appendChild(svgEl('line', { x1: connX, y1: yB2, x2: W - 20, y2: yB2, stroke: clr.wB, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yB2 + 4, 'B2 → 同軸シールド', { fill: clr.text2, 'font-size': '10' });
      svg.appendChild(svgEl('line', { x1: busX, y1: yJunction, x2: W - 20, y2: yJunction, stroke: clr.dot, 'stroke-width': 2 }));
      svgTxt(svg, busX + 4, yJunction + 4, 'A2=B1 → アンテナ2端子へ', { fill: clr.accent, 'font-size': '10' });
      gndSymbol(svg, W - 24, yB2 + 14, clr);
    }
  }

  // Info
  svgTxt(svg, 8, H - 14, `線材長: ${cr.wireLength_m}m (2本合計)   実効L: ${cr.L_actual_uH}μH   XL: ${cr.Xl_actual}Ω`,
    { fill: clr.ok, 'font-size': '10' });

  container.appendChild(svg);
}

// ---- Connection diagram (Antenna → Transformer → Coax) ----
function drawConnectionDiagram(container, pattern) {
  container.innerHTML = '';
  const clr = getClr();
  const isDirectFeed = pattern.ratioNum === 1;
  const W = 520, H = 130;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 6 }));

  const cy = H / 2, bh = 52, by = cy - bh / 2;

  function box(x, y, w, h, bg, bc, label, sub, lc) {
    svg.appendChild(svgEl('rect', { x, y, width: w, height: h, fill: bg, stroke: bc, 'stroke-width': 2, rx: 6 }));
    if (label) svgTxt(svg, x + w / 2, y + h / 2 + (sub ? -5 : 4), label, { 'text-anchor': 'middle', fill: lc || bc, 'font-weight': 'bold', 'font-size': '13' });
    if (sub)   svgTxt(svg, x + w / 2, y + h / 2 + 11, sub, { 'text-anchor': 'middle', fill: lc || bc, 'font-size': '11' });
  }
  function arrow(x1, y1, x2, y2, col, lbl) {
    svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 2 }));
    const a = Math.atan2(y2 - y1, x2 - x1);
    svg.appendChild(svgEl('polygon', {
      points: `${x2},${y2} ${x2 - 10*Math.cos(a) + 5*Math.sin(a)},${y2 - 10*Math.sin(a) - 5*Math.cos(a)} ${x2 - 10*Math.cos(a) - 5*Math.sin(a)},${y2 - 10*Math.sin(a) + 5*Math.cos(a)}`,
      fill: col
    }));
    if (lbl) svgTxt(svg, (x1+x2)/2, (y1+y2)/2 - 7, lbl, { 'text-anchor': 'middle', fill: col, 'font-size': '11' });
  }

  if (isDirectFeed) {
    box(18,  by, 108, bh, clr.bg2, clr.ok,     'アンテナ', 'Dipole',         clr.ok);
    arrow(126, cy, 182, cy, clr.text2, `~${pattern.impedance}Ω`);
    box(182, by, 152, bh, clr.bg2, clr.accent, '1:1 電流 Balun', '平衡→不平衡', clr.accent);
    arrow(334, cy, 390, cy, clr.ok, '50Ω');
    box(390, by, 108, bh, clr.bg2, clr.text2,  '同軸ケーブル', '50Ω Coax',     clr.text2);
  } else {
    const ant = pattern.antennaType === 'longwire' ? 'ロングワイヤー' : pattern.antennaType === 'delta' ? 'デルタループ' : 'アンテナ';
    const fp  = { end: '端部給電', ltype: 'L型給電', apex: '頂点60°', side: '頂点90°', bottom: '頂点120°', center: '中点' }[pattern.feedPoint] || '';
    box(8,   by, 112, bh, clr.bg2, clr.warn,   ant, fp, clr.warn);
    arrow(120, cy, 178, cy, clr.warn, `~${pattern.impedance}Ω`);
    box(178, by, 155, bh, clr.bg2, clr.accent, `${pattern.ratio} ${pattern.transformerType}`,
      pattern.transformerType === 'UnUn' ? '不平衡→不平衡' : '平衡→不平衡', clr.accent);
    arrow(333, cy, 390, cy, clr.ok, '50Ω');
    box(390, by, 108, bh, clr.bg2, clr.ok,     '同軸ケーブル', '50Ω Coax',     clr.ok);
  }
  container.appendChild(svg);
}

// ---- Main entry point called from index.html ----
function drawWindingDiagram(container, coreResult, txType) {
  if (coreResult.method.windType === 'trifilar') {
    drawTrifilarDiagram(container, coreResult);
  } else {
    drawBifilarDiagram(container, coreResult, txType);
  }
}

window.Drawing = { drawConnectionDiagram, drawWindingDiagram };
