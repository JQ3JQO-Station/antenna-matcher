/**
 * drawing.js — SVG diagram generation (simple block-diagram style, theme-aware)
 */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Get current theme colors from CSS variables */
function getClr() {
  const s = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.classList.contains('dark-theme');
  return {
    bg:     s.getPropertyValue('--bg3').trim()   || (isDark ? '#21262d' : '#eaeef2'),
    bg2:    s.getPropertyValue('--bg2').trim()   || (isDark ? '#161b22' : '#ffffff'),
    border: s.getPropertyValue('--border').trim()|| (isDark ? '#30363d' : '#d0d7de'),
    text:   s.getPropertyValue('--text').trim()  || (isDark ? '#e6edf3' : '#1f2328'),
    text2:  s.getPropertyValue('--text2').trim() || (isDark ? '#8b949e' : '#57606a'),
    accent: s.getPropertyValue('--accent').trim()|| (isDark ? '#58a6ff' : '#0969da'),
    ok:     s.getPropertyValue('--ok').trim()    || (isDark ? '#3fb950' : '#1a7f37'),
    warn:   s.getPropertyValue('--warn').trim()  || (isDark ? '#f0883e' : '#bc4c00'),
  };
}

/** Create SVG element with attributes */
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/** Create SVG text */
function svgText(x, y, content, attrs) {
  const el = svgEl('text', Object.assign({
    x, y,
    'font-size': '13',
    'font-family': '-apple-system, BlinkMacSystemFont, sans-serif'
  }, attrs));
  el.textContent = content;
  return el;
}

/** Draw arrow from (x1,y1) to (x2,y2) */
function svgArrow(svg, x1, y1, x2, y2, color, label) {
  const clr = color;
  svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: clr, 'stroke-width': 2.5 }));
  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const al = 10, aw = 5;
  const p1x = x2 - al * Math.cos(angle) + aw * Math.sin(angle);
  const p1y = y2 - al * Math.sin(angle) - aw * Math.cos(angle);
  const p2x = x2 - al * Math.cos(angle) - aw * Math.sin(angle);
  const p2y = y2 - al * Math.sin(angle) + aw * Math.cos(angle);
  const poly = svgEl('polygon', {
    points: `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`,
    fill: clr
  });
  svg.appendChild(poly);
  if (label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 8;
    svg.appendChild(svgText(mx, my, label, { 'text-anchor': 'middle', fill: clr, 'font-size': '11' }));
  }
}

/** Draw a labeled box */
function svgBox(svg, x, y, w, h, bgFill, borderColor, label, sublabel, labelColor) {
  svg.appendChild(svgEl('rect', { x, y, width: w, height: h, fill: bgFill, stroke: borderColor, 'stroke-width': 2, rx: 6 }));
  if (label) {
    svg.appendChild(svgText(x + w / 2, y + h / 2 - (sublabel ? 7 : 0), label, {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: labelColor || borderColor, 'font-weight': 'bold', 'font-size': '13'
    }));
  }
  if (sublabel) {
    svg.appendChild(svgText(x + w / 2, y + h / 2 + 12, sublabel, {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: labelColor || borderColor, 'font-size': '11'
    }));
  }
}

/**
 * Draw connection diagram: Antenna → Transformer → Coax (block-diagram style)
 */
function drawConnectionDiagram(container, pattern) {
  container.innerHTML = '';
  const clr = getClr();
  const isDirectFeed = pattern.ratioNum === 1;

  const W = 520, H = 140;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');

  // Background
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 8 }));

  const cy = H / 2;
  const boxH = 56;
  const by = cy - boxH / 2;

  if (isDirectFeed) {
    // === Direct feed: Antenna → [1:1 Balun] → Coax ===
    const bx1 = 20, bw1 = 100;
    const bx2 = 180, bw2 = 160;
    const bx3 = 400, bw3 = 100;

    svgBox(svg, bx1, by, bw1, boxH, clr.bg2, clr.ok, 'アンテナ', 'Dipole', clr.ok);
    svgArrow(svg, bx1 + bw1, cy, bx2, cy, clr.text2, `~${pattern.impedance}Ω`);
    svgBox(svg, bx2, by, bw2, boxH, clr.bg2, clr.accent, '1:1 電流 Balun', '平衡→不平衡', clr.accent);
    svgArrow(svg, bx2 + bw2, cy, bx3, cy, clr.text2, '50Ω');
    svgBox(svg, bx3, by, bw3, boxH, clr.bg2, clr.text2, '同軸ケーブル', '50Ω Coax', clr.text2);
  } else {
    // === Transformer: Antenna → [UnUn/Balun] → Coax ===
    const bx1 = 10,  bw1 = 110;
    const bx2 = 180, bw2 = 160;
    const bx3 = 400, bw3 = 100;

    const antennaLabel = pattern.antennaType === 'longwire' ? 'ロングワイヤー'
                       : pattern.antennaType === 'delta'    ? 'デルタループ'
                       : 'アンテナ';

    svgBox(svg, bx1, by, bw1, boxH, clr.bg2, clr.warn, antennaLabel, pattern.feedPoint === 'end' ? '端部' : '給電点', clr.warn);
    svgArrow(svg, bx1 + bw1, cy, bx2, cy, clr.warn, `~${pattern.impedance}Ω`);
    svgBox(svg, bx2, by, bw2, boxH, clr.bg2, clr.accent,
      `${pattern.ratio} ${pattern.transformerType}`,
      pattern.transformerType === 'UnUn' ? '不平衡→不平衡' : '平衡→不平衡',
      clr.accent);
    svgArrow(svg, bx2 + bw2, cy, bx3, cy, clr.ok, '50Ω');
    svgBox(svg, bx3, by, bw3, boxH, clr.bg2, clr.ok, '同軸ケーブル', '50Ω Coax', clr.ok);
  }

  container.appendChild(svg);
}

/**
 * Draw toroid winding diagram (top view, simplified).
 */
function drawWindingDiagram(container, coreResult, txType) {
  container.innerHTML = '';
  const clr = getClr();

  const W = 420, H = 240;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;display:block;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: clr.bg, rx: 8 }));

  const cx = 150, cy = 115;
  const OR = 78, IR = 40;
  const turns = coreResult.turns;
  const isBifilar = txType === 'Balun';

  // Toroid body (top view: ring)
  const toroidFill = document.documentElement.classList.contains('dark-theme') ? '#3a2c18' : '#f0e8d8';
  svg.appendChild(svgEl('circle', { cx, cy, r: OR, fill: toroidFill, stroke: '#a07840', 'stroke-width': 3 }));
  svg.appendChild(svgEl('circle', { cx, cy, r: IR, fill: clr.bg }));

  // Turn dots around the ring
  const displayTurns = Math.min(turns, 24);
  for (let i = 0; i < displayTurns; i++) {
    const angle = (2 * Math.PI * i / displayTurns) - Math.PI / 2;
    const mr = (OR + IR) / 2;
    const x = cx + mr * Math.cos(angle);
    const y = cy + mr * Math.sin(angle);

    if (isBifilar) {
      const dx = -Math.sin(angle) * 6;
      const dy =  Math.cos(angle) * 6;
      svg.appendChild(svgEl('circle', { cx: x + dx, cy: y + dy, r: 4.5, fill: clr.ok, stroke: clr.bg, 'stroke-width': 1.5 }));
      svg.appendChild(svgEl('circle', { cx: x - dx, cy: y - dy, r: 4.5, fill: clr.accent, stroke: clr.bg, 'stroke-width': 1.5 }));
    } else {
      svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 5, fill: clr.ok, stroke: clr.bg, 'stroke-width': 1.5 }));
    }
  }

  // Center text: turns count
  svg.appendChild(svgText(cx, cy - 6, `${turns} 回`, {
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '20', 'font-weight': 'bold', fill: clr.text
  }));
  svg.appendChild(svgText(cx, cy + 14, '巻き', {
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': '13', fill: clr.text2
  }));

  // Right side: info panel
  const rx = 255, ry = 20, rw = 150;

  svg.appendChild(svgText(rx, ry + 14, coreResult.core.label, {
    fill: clr.accent, 'font-weight': 'bold', 'font-size': '15'
  }));

  const rows = [
    ['巻数',   `${turns} 回`],
    ['線材長', `${coreResult.wireLength_m} m`],
    ['実効L',  `${coreResult.L_actual_uH} μH`],
    ['XL',     `${coreResult.Xl_actual} Ω`],
    ['巻き方', coreResult.winding.description.length > 14
               ? coreResult.winding.description.substring(0, 14) + '…'
               : coreResult.winding.description]
  ];

  rows.forEach(([label, value], i) => {
    const rowY = ry + 40 + i * 36;
    svg.appendChild(svgEl('rect', { x: rx, y: rowY, width: rw, height: 30, fill: clr.bg2, stroke: clr.border, rx: 4 }));
    svg.appendChild(svgText(rx + 8, rowY + 11, label, { fill: clr.text2, 'font-size': '10' }));
    svg.appendChild(svgText(rx + 8, rowY + 23, value, { fill: clr.text, 'font-size': '12', 'font-weight': 'bold' }));
  });

  // Legend for bifilar
  if (isBifilar) {
    const ly = H - 28;
    svg.appendChild(svgEl('circle', { cx: 20, cy: ly, r: 5, fill: clr.ok }));
    svg.appendChild(svgText(30, ly + 4, '線A', { fill: clr.text2, 'font-size': '11' }));
    svg.appendChild(svgEl('circle', { cx: 70, cy: ly, r: 5, fill: clr.accent }));
    svg.appendChild(svgText(80, ly + 4, '線B', { fill: clr.text2, 'font-size': '11' }));
    svg.appendChild(svgText(120, ly + 4, '← バイファイラ巻き', { fill: clr.text2, 'font-size': '10' }));
  }

  container.appendChild(svg);
}

// Export
window.Drawing = { drawConnectionDiagram, drawWindingDiagram };
