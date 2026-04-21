/**
 * calc_unun.js — Toroid winding calculation for UnUn / Balun
 * Calculates number of turns and wire length for a given core and frequency.
 */

'use strict';

// ---- Core presets (Al in nH/N^2) ----
const CORES = [
  { id: 'FT140-43', label: 'FT140-43', Al: 885,  OD_mm: 35.6, ID_mm: 22.9, H_mm: 12.7, material: '43' },
  { id: 'FT240-43', label: 'FT240-43', Al: 1075, OD_mm: 61.0, ID_mm: 35.6, H_mm: 25.4, material: '43' },
  { id: 'FT140-61', label: 'FT140-61', Al: 195,  OD_mm: 35.6, ID_mm: 22.9, H_mm: 12.7, material: '61' },
  { id: 'FT240-61', label: 'FT240-61', Al: 230,  OD_mm: 61.0, ID_mm: 35.6, H_mm: 25.4, material: '61' }
];

// Material characteristics (rough guidance)
const MATERIAL_GUIDE = {
  '43': { freqRange: '1\u201330 MHz', charColor: '#f0883e', note: 'HF\u5e2f\u5411\u3051\u30fb\u640d\u5931\u4f4e\u3081' },
  '61': { freqRange: '10\u201360 MHz', charColor: '#58a6ff', note: 'VHF\u5c0e\u5165\u30fbHF\u9ad8\u5468\u6ce2\u5411\u3051' }
};

/**
 * Calculate minimum inductance needed at a given frequency.
 * Rule: XL >= 4 * Z_source (50 ohm system)
 * @param {number} freqMHz
 * @param {number} zSource  - source impedance (default 50 ohm)
 * @returns {number} required inductance in Henry
 */
function calcRequiredL(freqMHz, zSource) {
  zSource = zSource || 50;
  const minXL = 4 * zSource;           // ohms
  const omega = 2 * Math.PI * freqMHz * 1e6;
  return minXL / omega;                // Henry
}

/**
 * Calculate number of turns for a given core and inductance.
 * N = sqrt(L_H / Al_H)  where Al is in H (converted from nH/N^2)
 * @param {number} L_H   - required inductance in Henry
 * @param {number} Al_nH - core Al value in nH/N^2
 * @returns {number} turns (rounded up)
 */
function calcTurns(L_H, Al_nH) {
  const Al_H = Al_nH * 1e-9;
  return Math.ceil(Math.sqrt(L_H / Al_H));
}

/**
 * Estimate wire length for given turns on a toroid.
 * Wire per turn ≈ pi * (OD_mm + ID_mm) / 2  +  H_mm  (mean path length per turn)
 * Plus ~15% overhead for lead dress and connections.
 * @param {number} turns
 * @param {object} core
 * @returns {number} estimated wire length in meters
 */
function calcWireLength(turns, core) {
  const meanCirc_mm = Math.PI * (core.OD_mm + core.ID_mm) / 2;
  const perTurn_mm  = meanCirc_mm + core.H_mm * 2; // approximate path around toroid
  const total_mm    = perTurn_mm * turns * 1.15;    // 15% overhead
  return Math.round(total_mm) / 1000;               // convert to meters, round to mm
}

/**
 * Calculate winding data for all cores at a given frequency.
 * @param {number} freqMHz      - lowest target frequency
 * @param {number} ratioNum     - transformer ratio (e.g. 4 for 4:1)
 * @param {string} txType       - 'UnUn' or 'Balun'
 * @returns {Array} array of {core, turns, wireLength_m, L_uH, Xl, ok}
 */
function calcAllCores(freqMHz, ratioNum, txType) {
  const L_H = calcRequiredL(freqMHz);
  const omega = 2 * Math.PI * freqMHz * 1e6;

  return CORES.map(core => {
    const turns = calcTurns(L_H, core.Al);
    const wireLength_m = calcWireLength(turns, core);

    // Actual inductance achieved
    const L_actual_H = (turns * turns) * core.Al * 1e-9;
    const L_actual_uH = L_actual_H * 1e6;
    const Xl_actual = omega * L_actual_H;

    // Recommended for HF (3.5-30MHz) use material 43; 10-50MHz use 61
    const recMat = freqMHz <= 10 ? '43' : '61';
    const recommended = core.material === recMat;

    // Winding instruction
    const winding = buildWindingInstruction(turns, ratioNum, txType);

    return {
      core,
      turns,
      wireLength_m: wireLength_m.toFixed(2),
      L_actual_uH: L_actual_uH.toFixed(1),
      Xl_actual: Math.round(Xl_actual),
      ok: Xl_actual >= 4 * 50,
      recommended,
      winding
    };
  });
}

/**
 * Build winding instruction text based on ratio and type.
 * @param {number} turns
 * @param {number} ratioNum
 * @param {string} txType
 * @returns {object} {primary, secondary, description}
 */
function buildWindingInstruction(turns, ratioNum, txType) {
  if (ratioNum === 1) {
    return {
      primary: turns,
      secondary: turns,
      description: `${turns}\u56de\u5dfb\u304d\u30fb\u30d0\u30a4\u30d5\u30a3\u30e9\u30fc\u5dfb\u304d`
    };
  }

  if (txType === 'UnUn') {
    // Autotransformer style — total turns split by ratio
    const secTurns  = turns;
    const tapPoint  = Math.round(turns / Math.sqrt(ratioNum));
    return {
      primary: tapPoint,
      secondary: secTurns,
      description: `\u5168\u4f53${secTurns}\u56de\u5dfb\u304d\u3001\u30bf\u30c3\u30d7\u70b9\u306f${tapPoint}\u56de\u76ee\uff08\u30aa\u30fc\u30c8\u30c8\u30e9\u30f3\u30b9\u5f62\u5f0f\uff09`
    };
  } else {
    // Balun: wound as transmission line (bifilar)
    const halfTurns = Math.round(turns / 2);
    return {
      primary: halfTurns,
      secondary: halfTurns,
      description: `${halfTurns}\u56de\u30d0\u30a4\u30d5\u30a1\u30fc\u5dfb\u304d\uff08\u4f1d\u9001\u7dda\u5f0f\uff09`
    };
  }
}

// Export
window.CalcUnun = { CORES, MATERIAL_GUIDE, calcRequiredL, calcTurns, calcWireLength, calcAllCores };
