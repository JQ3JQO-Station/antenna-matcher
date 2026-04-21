/**
 * drawing.js — SVG diagram generation for toroid winding and connection diagrams
 */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Theme colors (matching CSS variables)
const CLR = {
  bg:      '#21262d',
  border:  '#30363d',
  text:    '#e6edf3',
  text2:   '#8b949e',
  accent:  '#58a6ff',
  ok:      '#3fb950',
  warn:    '#f0883e',
  wire:    '#f0883e',
  coax:    '#58a6ff',
  core:    '#8b949e',
  turn:    '#3fb950'
};

/** Create SVG element with attributes */
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/** Create text SVG element */
function svgText(x, y, content, attrs) {
  const el = svgEl('text', Object.assign({ x, y, fill: CLR.text, 'font-size': '12', 'font-family': 'sans-serif' }, attrs));
  el.textContent = content;
  return el;
}

/** Draw connection diagram: Antenna → Transformer → Coax */
function drawConnectionDiagram(container, pattern) {
  container.innerHTML = '';
  const W = 560, H = 160;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;');

  // Background
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: CLR.bg, rx: 6 }));

  const isUnUn = pattern.transformerType === 'UnUn';
  const isDirectFeed = pattern.ratioNum === 1;

  // === Antenna symbol (left) ===
  const ax = 60, ay = 80;
  // Antenna mast
  svg.appendChild(svgEl('line', { x1: ax, y1: 40, x2: ax, y2: 130, stroke: CLR.wire, 'stroke-width': 3 }));
  // Radiator lines
  for (let i = 0; i < 5; i++) {
    const ey = 45 + i * 20;
    const ex = ax + (i % 2 === 0 ? -30 : 30);
    svg.appendChild(svgEl('line', { x1: ax, y1: ey, x2: ex, y2: ey - 15, stroke: CLR.wire, 'stroke-width': 2 }));
  }
  svg.appendChild(svgText(ax, 148, 'Antenna', { 'text-anchor': 'middle', 'font-size': '11', fill: CLR.text2 }));

  // Feed wire from antenna to transformer
  const wireX1 = ax + 10, wireX2 = isDirectFeed ? 340 : 210;
  svg.appendChild(svgEl('line', { x1: wireX1, y1: ay, x2: wireX2, y2: ay, stroke: CLR.wire, 'stroke-width': 2, 'stroke-dasharray': isUnUn ? '' : '6,3' }));
  if (!isUnUn && !isDirectFeed) {
    // Second wire for balanced
    svg.appendChild(svgEl('line', { x1: wireX1, y1: ay + 20, x2: wireX2, y2: ay + 20, stroke: CLR.wire, 'stroke-width': 2, 'stroke-dasharray': '6,3' }));
    svg.appendChild(svgText((wireX1 + wireX2) / 2, ay - 8, 'balanced', { 'text-anchor': 'middle', 'font-size': '10', fill: CLR.text2 }));
  }

  if (!isDirectFeed) {
    // === Transformer box (center) ===
    const tx = 210, ty = 50, tw = 130, th = 70;
    svg.appendChild(svgEl('rect', { x: tx, y: ty, width: tw, height: th, fill: '#1a2230', stroke: CLR.accent, 'stroke-width': 2, rx: 6 }));

    // Toroid symbol inside box (simplified oval)
    const cx = tx + tw / 2, cy = ty + th / 2;
    svg.appendChild(svgEl('ellipse', { cx: cx - 16, cy, rx: 12, ry: 20, fill: 'none', stroke: CLR.core, 'stroke-width': 2 }));
    svg.appendChild(svgEl('ellipse', { cx: cx + 16, cy, rx: 12, ry: 20, fill: 'none', stroke: CLR.core, 'stroke-width': 2 }));
    // Coupling lines
    svg.appendChild(svgEl('line', { x1: cx - 4, y1: cy - 18, x2: cx + 4, y2: cy - 18, stroke: CLR.turn, 'stroke-width': 1.5 }));
    svg.appendChild(svgEl('line', { x1: cx - 4, y1: cy, x2: cx + 4, y2: cy, stroke: CLR.turn, 'stroke-width': 1.5 }));
    svg.appendChild(svgEl('line', { x1: cx - 4, y1: cy + 18, x2: cx + 4, y2: cy + 18, stroke: CLR.turn, 'stroke-width': 1.5 }));

    const txLabel = `${pattern.ratio} ${pattern.transformerType}`;
    svg.appendChild(svgText(cx, ty + th + 16, txLabel, { 'text-anchor': 'middle', 'font-size': '11', fill: CLR.accent }));

    // Impedance labels
    svg.appendChild(svgText(tx - 4, cy - 5, `${pattern.impedance}\u03a9`, { 'text-anchor': 'end', 'font-size': '10', fill: CLR.warn }));
    svg.appendChild(svgText(tx + tw + 4, cy - 5, '50\u03a9', { 'text-anchor': 'start', 'font-size': '10', fill: CLR.ok }));

    // Wire from transformer to coax
    svg.appendChild(svgEl('line', { x1: tx + tw, y1: ay, x2: 400, y2: ay, stroke: CLR.coax, 'stroke-width': 3 }));
  }

  // === Coax symbol (right) ===
  const cx2 = isDirectFeed ? 360 : 400;
  // Outer shield
  svg.appendChild(svgEl('rect', { x: cx2, y: ay - 14, width: 100, height: 28, fill: '#1a2230', stroke: CLR.coax, 'stroke-width': 2, rx: 3 }));
  // Center conductor
  svg.appendChild(svgEl('line', { x1: cx2, y1: ay, x2: cx2 + 100, y2: ay, stroke: CLR.wire, 'stroke-width': 2 }));
  // BNC connector
  svg.appendChild(svgEl('rect', { x: cx2 + 98, y: ay - 18, width: 14, height: 36, fill: '#30363d', stroke: CLR.border, rx: 3 }));
  svg.appendChild(svgText(cx2 + 50, ay + 30, '50\u03a9 Coax', { 'text-anchor': 'middle', 'font-size': '11', fill: CLR.text2 }));

  if (isDirectFeed) {
    svg.appendChild(svgText(cx2 + 50, 148, '1:1 Balun\u5185\u8535', { 'text-anchor': 'middle', 'font-size': '10', fill: CLR.text2 }));
  }

  container.appendChild(svg);
}

/**
 * Draw toroid winding diagram.
 * Shows a simplified top-down toroid with wire wound around it.
 * @param {object} coreResult  - from calcAllCores result entry
 * @param {string} txType      - 'UnUn' or 'Balun'
 */
function drawWindingDiagram(container, coreResult, txType) {
  container.innerHTML = '';
  const W = 400, H = 220;
  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute('style', 'max-width:100%;');
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: CLR.bg, rx: 6 }));

  const cx = W / 2, cy = H / 2 - 10;
  const OR = 75, IR = 38; // outer/inner radius

  // Draw toroid body
  svg.appendChild(svgEl('circle', { cx, cy, r: OR, fill: '#2a1f10', stroke: CLR.core, 'stroke-width': 3 }));
  svg.appendChild(svgEl('circle', { cx, cy, r: IR, fill: CLR.bg }));

  const turns = coreResult.turns;
  const isBifilar = txType === 'Balun' && coreResult.core.material;

  // Draw turn indicators evenly spaced around toroid
  const displayTurns = Math.min(turns, 20); // cap visual turns
  for (let i = 0; i < displayTurns; i++) {
    const angle = (2 * Math.PI * i / displayTurns) - Math.PI / 2;
    const mr = (OR + IR) / 2;
    const x = cx + mr * Math.cos(angle);
    const y = cy + mr * Math.sin(angle);
    const r = 4;

    if (isBifilar) {
      // Two conductors: slightly offset
      const dx = -Math.sin(angle) * 5;
      const dy =  Math.cos(angle) * 5;
      svg.appendChild(svgEl('circle', { cx: x + dx, cy: y + dy, r, fill: CLR.turn, stroke: '#0d1117', 'stroke-width': 1 }));
      svg.appendChild(svgEl('circle', { cx: x - dx, cy: y - dy, r, fill: CLR.accent, stroke: '#0d1117', 'stroke-width': 1 }));
    } else {
      svg.appendChild(svgEl('circle', { cx: x, cy: y, r, fill: CLR.turn, stroke: '#0d1117', 'stroke-width': 1 }));
    }
  }

  if (turns > 20) {
    svg.appendChild(svgText(cx, cy, `${turns}T`, { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': '18', 'font-weight': 'bold', fill: CLR.text }));
    svg.appendChild(svgText(cx, cy + 20, '(simplified)', { 'text-anchor': 'middle', 'font-size': '10', fill: CLR.text2 }));
  } else {
    svg.appendChild(svgText(cx, cy, `${turns}T`, { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': '16', 'font-weight': 'bold', fill: CLR.text2 }));
  }

  // Labels
  svg.appendChild(svgText(cx, H - 20, coreResult.core.id, { 'text-anchor': 'middle', 'font-size': '13', 'font-weight': 'bold', fill: CLR.accent }));
  svg.appendChild(svgText(cx, H - 6, coreResult.winding.description, { 'text-anchor': 'middle', 'font-size': '10', fill: CLR.text2 }));

  if (isBifilar) {
    // Legend
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 5, fill: CLR.turn }));
    svg.appendChild(svgText(28, 24, 'Wire A', { 'font-size': '10', fill: CLR.text2 }));
    svg.appendChild(svgEl('circle', { cx: 20, cy: 36, r: 5, fill: CLR.accent }));
    svg.appendChild(svgText(28, 40, 'Wire B', { 'font-size': '10', fill: CLR.text2 }));
  }

  container.appendChild(svg);
}

// Export
window.Drawing = { drawConnectionDiagram, drawWindingDiagram };
