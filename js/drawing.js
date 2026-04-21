/**
 * drawing.js — SVG diagram generation (block-diagram style, theme-aware)
 */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

function getClr() {
  const s  = getComputedStyle(document.documentElement);
  const dk = document.documentElement.classList.contains('dark-theme');
  return {
    bg:     s.getPropertyValue('--bg3').trim()    || (dk ? '#21262d' : '#eaeef2'),
    bg2:    s.getPropertyValue('--bg2').trim()    || (dk ? '#161b22' : '#ffffff'),
    border: s.getPropertyValue('--border').trim() || (dk ? '#30363d' : '#d0d7de'),
    text:   s.getPropertyValue('--text').trim()   || (dk ? '#e6edf3' : '#1f2328'),
    text2:  s.getPropertyValue('--text2').trim()  || (dk ? '#8b949e' : '#57606a'),
    accent: s.getPropertyValue('--accent').trim() || (dk ? '#58a6ff' : '#0969da'),
    ok:     s.getPropertyValue('--ok').trim()     || (dk ? '#3fb950' : '#1a7f37'),
    warn:   s.getPropertyValue('--warn').trim()   || (dk ? '#f0883e' : '#bc4c00'),
  };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function svgText(x, y, txt, attrs) {
  const el = svgEl('text', Object.assign({
    x, y, 'font-size': '13',
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif'
  }, attrs));
  el.textContent = txt;
  return el;
}

function svgArrow(svg, x1, y1, x2, y2, color, label) {
  svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 2.5 }));
  const a = Math.atan2(y2 - y1, x2 - x1), al = 10, aw = 5;
  svg.appendChild(svgEl('polygon', {
    points: `${x2},${y2} ${x2 - al * Math.cos(a) + aw * Math.sin(a)},${y2 - al * Math.sin(a) - aw * Math.cos(a)} ${x2 - al * Math.cos(a) - aw * Math.sin(a)},${y2 - al * Math.sin(a) + aw * Math.cos(a)}`,
    fill: color
  }));
  if (label) svg.appendChild(svgText((x1 + x2) / 2, (y1 + y2) / 2 - 8, label,
    { 'text-anchor': 'middle', fill: color, 'font-size': '11' }));
}

function svgBox(svg, x, y, w, h, bg, border, label, sub, lc) {
  svg.appendChild(svgEl('rect', { x, y, width: w, height: h, fill: bg, stroke: border, 'stroke-width': 2, rx: 6 }));
  if (label) svg.appendChild(svgText(x + w / 2, y + h / 2 + (sub ? -6 : 4), label,
    { 'text-anchor': 'middle', fill: lc || border, 'font-weight': 'bold', 'font-size': '13' }));
  if (sub) svg.appendChild(svgText(x + w / 2, y + h / 2 + 12, sub,
    { 'text-anchor': 'middle', fill: lc || border, 'font-size': '11' }));
}

// ---- Connection diagram (Antenna → Transformer → Coax) ----
function drawConnectionDiagram(container, pattern) {
  container.innerHTML = '';
  const clr = getClr();
  const isDirectFeed = pattern.ratioNum === 1;
  const W = 520, H = 140;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 8 }));

  const cy = H / 2, bh = 56, by = cy - bh / 2;

  if (isDirectFeed) {
    svgBox(svg, 20,  by, 110, bh, clr.bg2, clr.ok,     'アンテナ',    'Dipole',          clr.ok);
    svgArrow(svg, 130, cy, 185, cy, clr.text2, `~${pattern.impedance}Ω`);
    svgBox(svg, 185, by, 150, bh, clr.bg2, clr.accent, '1:1 電流 Balun', '平衡→不平衡', clr.accent);
    svgArrow(svg, 335, cy, 390, cy, clr.ok, '50Ω');
    svgBox(svg, 390, by, 110, bh, clr.bg2, clr.text2,  '同軸ケーブル','50Ω Coax',        clr.text2);
  } else {
    const ant = pattern.antennaType === 'longwire' ? 'ロングワイヤー'
              : pattern.antennaType === 'delta'    ? 'デルタループ' : 'アンテナ';
    const fp  = pattern.feedPoint === 'end' ? '端部給電'
              : pattern.feedPoint === 'ltype' ? 'L型給電'
              : pattern.feedPoint === 'apex'  ? '頂点給電'
              : pattern.feedPoint === 'side'  ? '辺中点給電'
              : pattern.feedPoint === 'bottom'? '底辺給電' : '';
    svgBox(svg, 10,  by, 110, bh, clr.bg2, clr.warn,   ant,           fp,                clr.warn);
    svgArrow(svg, 120, cy, 180, cy, clr.warn, `~${pattern.impedance}Ω`);
    svgBox(svg, 180, by, 155, bh, clr.bg2, clr.accent,
      `${pattern.ratio} ${pattern.transformerType}`,
      pattern.transformerType === 'UnUn' ? '不平衡→不平衡' : '平衡→不平衡', clr.accent);
    svgArrow(svg, 335, cy, 390, cy, clr.ok, '50Ω');
    svgBox(svg, 390, by, 110, bh, clr.bg2, clr.ok,     '同軸ケーブル','50Ω Coax',        clr.ok);
  }
  container.appendChild(svg);
}

// ---- Winding diagram: shows wire layout + connection schematic ----
function drawWindingDiagram(container, coreResult, txType) {
  container.innerHTML = '';
  const clr  = getClr();
  const m    = coreResult.method;
  const N    = coreResult.turns;

  if (m.windType === 'trifilar') {
    drawTrifilar(container, clr, coreResult, N);
  } else if (m.windType === 'bifilar' || m.windType === 'bifilar-balun' || m.windType === 'current-balun') {
    drawBifilar(container, clr, coreResult, N, m);
  } else {
    drawBifilar(container, clr, coreResult, N, m);
  }
}

/**
 * Draw 9:1 UnUn — trifilar winding connection schematic
 */
function drawTrifilar(container, clr, cr, N) {
  const W = 520, H = 280;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 8 }));

  // Title
  svg.appendChild(svgText(W / 2, 22, `9:1 UnUn — トリファイラ巻き ${N}回 (${cr.core.label})`,
    { 'text-anchor': 'middle', fill: clr.accent, 'font-weight': 'bold', 'font-size': '13' }));

  // Wire colors
  const wc = [clr.warn, clr.ok, clr.accent];
  const wl = ['線A', '線B', '線C'];

  // --- Toroid block (center) ---
  const tx = 180, ty = 50, tw = 130, th = 160;
  svg.appendChild(svgEl('rect', { x: tx, y: ty, width: tw, height: th, fill: '#f5ead8', stroke: '#a07840', 'stroke-width': 2.5, rx: 8 }));
  svg.appendChild(svgText(tx + tw / 2, ty + th / 2 - 10, `トロイダルコア`,
    { 'text-anchor': 'middle', fill: '#a07840', 'font-size': '11' }));
  svg.appendChild(svgText(tx + tw / 2, ty + th / 2 + 6, `${N} 回巻き × 3本`,
    { 'text-anchor': 'middle', fill: '#a07840', 'font-weight': 'bold', 'font-size': '12' }));

  // 3 wires through core
  const yStart = [80, 120, 160];
  yStart.forEach((y, i) => {
    // Left side (begin)
    svg.appendChild(svgEl('line', { x1: 30, y1: y, x2: tx, y2: y, stroke: wc[i], 'stroke-width': 2.5 }));
    svg.appendChild(svgText(32, y - 6, `${wl[i]} 始`, { fill: wc[i], 'font-size': '10' }));
    // Right side (end)
    svg.appendChild(svgEl('line', { x1: tx + tw, y1: y, x2: 355, y2: y, stroke: wc[i], 'stroke-width': 2.5 }));
    svg.appendChild(svgText(tx + tw + 4, y - 6, `${wl[i]} 終`, { fill: wc[i], 'font-size': '10' }));
  });

  // === Left side: Coax (50Ω) — 3本始端を並列接続 ===
  // Vertical bus bar connecting all 3 starts
  svg.appendChild(svgEl('line', { x1: 30, y1: 80, x2: 30, y2: 160, stroke: clr.text, 'stroke-width': 2 }));
  svg.appendChild(svgEl('line', { x1: 10, y1: 120, x2: 30, y2: 120, stroke: clr.text, 'stroke-width': 2 }));
  svg.appendChild(svgText(4, 120 + 4, '=', { fill: clr.text, 'font-size': '14', 'font-weight': 'bold' }));

  // Coax box
  svgBox(svg, 2, 190, 60, 36, clr.bg2, clr.ok, '同軸', '50Ω 側', clr.ok);
  svg.appendChild(svgEl('line', { x1: 32, y1: 190, x2: 32, y2: 160, stroke: clr.ok, 'stroke-width': 2 }));
  svg.appendChild(svgText(2, 238, 'センター+シールド', { fill: clr.text2, 'font-size': '9' }));

  // === Right side: Antenna (~450Ω) — A終+B始, B終+C始 直列接続 ===
  // A終 (y=80) + B始 (y=120) → joined at x=355
  svg.appendChild(svgEl('line', { x1: 355, y1: 80, x2: 380, y2: 80, stroke: wc[0], 'stroke-width': 2.5 }));
  svg.appendChild(svgEl('line', { x1: 355, y1: 120, x2: 380, y2: 120, stroke: wc[1], 'stroke-width': 2.5 }));
  // A終=B始 junction
  svg.appendChild(svgEl('line', { x1: 380, y1: 80, x2: 380, y2: 120, stroke: clr.text, 'stroke-width': 2 }));
  svg.appendChild(svgEl('circle', { cx: 380, cy: 100, r: 4, fill: clr.text }));
  svg.appendChild(svgText(384, 104, 'A終=B始', { fill: clr.text2, 'font-size': '9' }));

  // B終 (y=120) + C始 (y=160) → joined at x=355
  svg.appendChild(svgEl('line', { x1: 355, y1: 120, x2: 355, y2: 160, stroke: clr.text, 'stroke-width': 1, 'stroke-dasharray': '3,2' }));
  svg.appendChild(svgEl('line', { x1: 355, y1: 160, x2: 380, y2: 160, stroke: wc[2], 'stroke-width': 2.5 }));
  // B終=C始 junction
  svg.appendChild(svgEl('line', { x1: 380, y1: 120, x2: 380, y2: 160, stroke: clr.text, 'stroke-width': 2 }));
  svg.appendChild(svgEl('circle', { cx: 380, cy: 140, r: 4, fill: clr.text }));
  svg.appendChild(svgText(384, 144, 'B終=C始', { fill: clr.text2, 'font-size': '9' }));

  // A始 → Coax center  /  C終 → Antenna wire
  // A始 output (from left bus, goes to coax center)
  svg.appendChild(svgText(4, 75, '→ 同軸センター', { fill: clr.ok, 'font-size': '9' }));

  // C終 → Antenna
  svg.appendChild(svgEl('line', { x1: 380, y1: 160, x2: 450, y2: 160, stroke: wc[2], 'stroke-width': 2.5 }));
  svgBox(svg, 452, 143, 60, 34, clr.bg2, clr.warn, 'アンテナ', '~450Ω', clr.warn);
  svg.appendChild(svgText(385, 175, 'C終→アンテナ', { fill: clr.warn, 'font-size': '9' }));

  // Info box
  const ix = 2, iy = 248;
  svg.appendChild(svgText(ix, iy,      `巻数: ${N}回  線材長(1本): ${(parseFloat(cr.wireLength_m)/3).toFixed(2)}m × 3本 = ${cr.wireLength_m}m`, { fill: clr.text2, 'font-size': '10' }));
  svg.appendChild(svgText(ix, iy + 14, `実効L: ${cr.L_actual_uH}μH   XL: ${cr.Xl_actual}Ω   ${cr.ok ? '✓ OK' : '⚠ 不足'}`, { fill: cr.ok ? clr.ok : clr.warn, 'font-size': '10' }));

  container.appendChild(svg);
}

/**
 * Draw bifilar / current-balun winding connection schematic
 */
function drawBifilar(container, clr, cr, N, m) {
  const W = 520, H = 240;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 8 }));

  const isCurrentBalun = m.windType === 'current-balun';
  const isBifilarBalun = m.windType === 'bifilar-balun';

  // Title
  svg.appendChild(svgText(W / 2, 22, `${m.shortName} — ${m.name} ${N}回 (${cr.core.label})`,
    { 'text-anchor': 'middle', fill: clr.accent, 'font-weight': 'bold', 'font-size': '13' }));

  const wc = [clr.warn, clr.ok];

  // Toroid block
  const tx = 185, ty = 45, tw = 130, th = 120;
  svg.appendChild(svgEl('rect', { x: tx, y: ty, width: tw, height: th, fill: '#f5ead8', stroke: '#a07840', 'stroke-width': 2.5, rx: 8 }));
  svg.appendChild(svgText(tx + tw / 2, ty + th / 2 - 8, 'トロイダルコア',
    { 'text-anchor': 'middle', fill: '#a07840', 'font-size': '11' }));
  svg.appendChild(svgText(tx + tw / 2, ty + th / 2 + 8, `${N} 回巻き × 2本`,
    { 'text-anchor': 'middle', fill: '#a07840', 'font-weight': 'bold', 'font-size': '12' }));

  // 2 wires
  const ys = [90, 130];
  ys.forEach((y, i) => {
    svg.appendChild(svgEl('line', { x1: 30, y1: y, x2: tx, y2: y, stroke: wc[i], 'stroke-width': 2.5 }));
    svg.appendChild(svgText(32, y - 6, `線${['A','B'][i]} 始`, { fill: wc[i], 'font-size': '10' }));
    svg.appendChild(svgEl('line', { x1: tx + tw, y1: y, x2: 370, y2: y, stroke: wc[i], 'stroke-width': 2.5 }));
    svg.appendChild(svgText(tx + tw + 4, y - 6, `線${['A','B'][i]} 終`, { fill: wc[i], 'font-size': '10' }));
  });

  if (isCurrentBalun) {
    // 1:1 Current Balun
    // Left: Coax (A始→センター, B始→シールド)
    svgBox(svg, 2, 75, 28, 70, clr.bg2, clr.ok, '同', '軸', clr.ok);
    svg.appendChild(svgEl('line', { x1: 30, y1: 90, x2: 30, y2: 90, stroke: clr.ok, 'stroke-width': 0 }));
    svg.appendChild(svgText(4, 155, 'センター→線A始', { fill: clr.warn, 'font-size': '9' }));
    svg.appendChild(svgText(4, 167, 'シールド→線B始', { fill: clr.ok, 'font-size': '9' }));

    // Right: Antenna (A終→+側, B終→−側)
    svgBox(svg, 370, 75, 60, 70, clr.bg2, clr.accent, 'アンテナ', 'Dipole', clr.accent);
    svg.appendChild(svgText(373, 155, 'A終→アンテナ+', { fill: clr.warn, 'font-size': '9' }));
    svg.appendChild(svgText(373, 167, 'B終→アンテナ−', { fill: clr.ok, 'font-size': '9' }));

  } else {
    // 4:1 or 2:1 UnUn / Balun
    // A終 + B始 → junction (center tap)
    svg.appendChild(svgEl('line', { x1: 370, y1: 90, x2: 395, y2: 90, stroke: wc[0], 'stroke-width': 2.5 }));
    svg.appendChild(svgEl('line', { x1: 370, y1: 130, x2: 395, y2: 130, stroke: wc[1], 'stroke-width': 2.5 }));
    svg.appendChild(svgEl('line', { x1: 395, y1: 90, x2: 395, y2: 130, stroke: clr.text, 'stroke-width': 2 }));
    svg.appendChild(svgEl('circle', { cx: 395, cy: 110, r: 4, fill: clr.text }));
    svg.appendChild(svgText(398, 114, 'A終=B始', { fill: clr.text2, 'font-size': '9' }));

    if (m.shortName === '4:1 UnUn') {
      // Left: Coax 50Ω (A始=センター, A終=B始=GND)
      svgBox(svg, 2, 78, 28, 60, clr.bg2, clr.ok, '同', '軸', clr.ok);
      svg.appendChild(svgText(2, 150, 'A始→センター', { fill: clr.warn, 'font-size': '9' }));
      svg.appendChild(svgText(2, 162, 'A終=B始→GND', { fill: clr.text2, 'font-size': '9' }));
      // Right: Antenna ~200Ω (A始→一端, B終→他端)
      svgBox(svg, 440, 78, 70, 60, clr.bg2, clr.warn, 'アンテナ', '~200Ω', clr.warn);
      svg.appendChild(svgText(370, 150, 'B終→アンテナ', { fill: clr.warn, 'font-size': '9' }));
    } else if (m.shortName === '4:1 Balun') {
      // Left: Coax 50Ω
      svgBox(svg, 2, 78, 28, 60, clr.bg2, clr.ok, '同', '軸', clr.ok);
      svg.appendChild(svgText(2, 150, 'A始→センター', { fill: clr.warn, 'font-size': '9' }));
      svg.appendChild(svgText(2, 162, 'B終→シールド', { fill: clr.ok, 'font-size': '9' }));
      // Right: Antenna ~200Ω balanced
      svgBox(svg, 440, 78, 70, 60, clr.bg2, clr.accent, 'アンテナ', '~200Ω 平衡', clr.accent);
      svg.appendChild(svgText(370, 150, 'A始と B終が', { fill: clr.accent, 'font-size': '9' }));
      svg.appendChild(svgText(370, 162, 'アンテナ2点へ', { fill: clr.accent, 'font-size': '9' }));
    } else {
      // 2:1 Balun
      svgBox(svg, 2, 78, 28, 60, clr.bg2, clr.ok, '同', '軸', clr.ok);
      svg.appendChild(svgText(2, 150, 'A始→センター', { fill: clr.warn, 'font-size': '9' }));
      svg.appendChild(svgText(2, 162, 'A終=B始→GND', { fill: clr.text2, 'font-size': '9' }));
      svgBox(svg, 440, 78, 70, 60, clr.bg2, clr.accent, 'アンテナ', '~100Ω 平衡', clr.accent);
      svg.appendChild(svgText(370, 150, 'A終=B始と', { fill: clr.accent, 'font-size': '9' }));
      svg.appendChild(svgText(370, 162, 'B終 → 2点へ', { fill: clr.accent, 'font-size': '9' }));
    }
  }

  // Info row
  const iy = 195;
  svg.appendChild(svgEl('line', { x1: 10, y1: iy - 6, x2: W - 10, y2: iy - 6, stroke: clr.border, 'stroke-width': 1 }));
  svg.appendChild(svgText(10, iy + 8,  `巻数: ${N}回   線材長: ${cr.wireLength_m}m (2本合計)   実効L: ${cr.L_actual_uH}μH   XL: ${cr.Xl_actual}Ω   ${cr.ok ? '✓ OK' : '⚠ 不足'}`,
    { fill: cr.ok ? clr.ok : clr.warn, 'font-size': '11' }));

  // Steps
  const steps = cr.method.steps || [];
  svg.appendChild(svgText(10, iy + 28, '【製作手順】', { fill: clr.text, 'font-size': '11', 'font-weight': 'bold' }));
  steps.slice(0, 2).forEach((s, i) => {
    svg.appendChild(svgText(10, iy + 42 + i * 14, `${i + 1}. ${s}`, { fill: clr.text2, 'font-size': '10' }));
  });

  container.appendChild(svg);
}

window.Drawing = { drawConnectionDiagram, drawWindingDiagram };
