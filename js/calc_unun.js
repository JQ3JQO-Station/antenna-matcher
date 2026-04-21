/**
 * calc_unun.js — Toroid winding calculation for UnUn / Balun
 */

'use strict';

// ---- Core presets (Al in nH/N^2) ----
const CORES = [
  { id: 'FT140-43', label: 'FT140-43', Al: 885,  OD_mm: 35.6, ID_mm: 22.9, H_mm: 12.7, material: '43' },
  { id: 'FT240-43', label: 'FT240-43', Al: 1075, OD_mm: 61.0, ID_mm: 35.6, H_mm: 25.4, material: '43' },
  { id: 'FT140-61', label: 'FT140-61', Al: 195,  OD_mm: 35.6, ID_mm: 22.9, H_mm: 12.7, material: '61' },
  { id: 'FT240-61', label: 'FT240-61', Al: 230,  OD_mm: 61.0, ID_mm: 35.6, H_mm: 25.4, material: '61' }
];

/**
 * Winding method definitions by ratio + type.
 * windType: 'trifilar' | 'bifilar' | 'bifilar-balun' | 'current-balun'
 */
function getWindingMethod(ratioNum, txType) {
  // 9:1 UnUn — trifilar (3 wires in parallel) winding
  if (ratioNum === 9 && txType === 'UnUn') {
    return {
      windType: 'trifilar',
      wires: 3,
      name: 'トリファイラ巻き（3本並行）',
      shortName: '9:1 UnUn',
      steps: [
        '3本の電線を並べて束にする',
        'その束をコアに N 回均等に巻く',
        '【コア側 50Ω】3本の始端を全て接続 → 同軸シールドへ',
        '【アンテナ側 ~450Ω】線A終端 + 線B始端を接続、線B終端 + 線C始端を接続',
        '線A始端 → 同軸センター、線C終端 → アンテナ線',
        '線A始端 = 同軸センター、コアシールド = 同軸シールド'
      ],
      connectionNote: '3本直列でアンテナ側(高Z)、3本並列でコア側(50Ω)'
    };
  }
  // 4:1 UnUn — bifilar autotransformer
  if (ratioNum === 4 && txType === 'UnUn') {
    return {
      windType: 'bifilar',
      wires: 2,
      name: 'バイファイラ巻き（2本並行）',
      shortName: '4:1 UnUn',
      steps: [
        '2本の電線を並べて束にする',
        'その束をコアに N 回均等に巻く',
        '線A終端 + 線B始端を接続（中間タップ）',
        '【50Ω側】線A始端 → コア中心、線A始端 = 同軸センター',
        '【~200Ω側】線B終端 → アンテナ線',
        '線A終端 = 線B始端 → グランド（同軸シールド）'
      ],
      connectionNote: '2本直列でアンテナ側(高Z)、中間タップでコア側(50Ω)'
    };
  }
  // 4:1 Balun — bifilar transmission line
  if (ratioNum === 4 && txType === 'Balun') {
    return {
      windType: 'bifilar-balun',
      wires: 2,
      name: 'バイファイラ伝送線路型',
      shortName: '4:1 Balun',
      steps: [
        '2本の電線を並べて束にする（ツイストペア推奨）',
        'その束をコアに N 回均等に巻く',
        '線A終端 + 線B始端を接続',
        '【50Ω側】線A始端 → 同軸センター、線B終端 → 同軸シールド',
        '【~200Ω Balun側】線A始端 と 線B終端 をアンテナの2点へ',
        '中間接続点（A終=B始）はオープン'
      ],
      connectionNote: '伝送線路型。平衡アンテナ→不平衡50Ω'
    };
  }
  // 2:1 Balun — bifilar
  if (ratioNum === 2 && txType === 'Balun') {
    return {
      windType: 'bifilar',
      wires: 2,
      name: 'バイファイラ巻き',
      shortName: '2:1 Balun',
      steps: [
        '2本の電線を並べて束にする',
        'その束をコアに N 回均等に巻く',
        '線A終端 + 線B始端を接続（センタータップ）',
        '【50Ω側】線A始端 → 同軸センター、センタータップ → 同軸シールド',
        '【~100Ω Balun側】線A終端(=線B始端) と 線B終端 をアンテナへ'
      ],
      connectionNote: '平衡アンテナ100Ω → 不平衡50Ω'
    };
  }
  // 1:1 current Balun — bifilar
  return {
    windType: 'current-balun',
    wires: 2,
    name: 'バイファイラ電流 Balun',
    shortName: '1:1 Balun',
    steps: [
      '2本の電線を並べて束にする（ツイストペア推奨）',
      'その束をコアに N 回均等に巻く',
      '線A始端 → 同軸センター、線B始端 → 同軸シールド',
      '線A終端 → アンテナ+側、線B終端 → アンテナ−側',
      'コアはコモンモード電流を抑制する'
    ],
    connectionNote: 'コモンモード抑制。直結73Ω→50Ω'
  };
}

/**
 * Calculate minimum inductance needed at a given frequency.
 * Rule: XL >= 4 * 50Ω
 */
function calcRequiredL(freqMHz, zSource) {
  zSource = zSource || 50;
  const minXL = 4 * zSource;
  const omega = 2 * Math.PI * freqMHz * 1e6;
  return minXL / omega;
}

function calcTurns(L_H, Al_nH) {
  const Al_H = Al_nH * 1e-9;
  return Math.ceil(Math.sqrt(L_H / Al_H));
}

function calcWireLength(turns, core, wires) {
  wires = wires || 1;
  const meanCirc_mm = Math.PI * (core.OD_mm + core.ID_mm) / 2;
  const perTurn_mm  = meanCirc_mm + core.H_mm * 2;
  const total_mm    = perTurn_mm * turns * wires * 1.15; // 15% lead dress
  return Math.round(total_mm) / 1000;
}

/**
 * Calculate winding data for all cores at a given frequency.
 */
function calcAllCores(freqMHz, ratioNum, txType) {
  const L_H = calcRequiredL(freqMHz);
  const omega = 2 * Math.PI * freqMHz * 1e6;
  const method = getWindingMethod(ratioNum, txType);

  return CORES.map(core => {
    const turns = calcTurns(L_H, core.Al);
    const wireLength_m = calcWireLength(turns, core, method.wires);

    const L_actual_H  = (turns * turns) * core.Al * 1e-9;
    const L_actual_uH = (L_actual_H * 1e6).toFixed(1);
    const Xl_actual   = Math.round(omega * L_actual_H);

    const recMat    = freqMHz <= 10 ? '43' : '61';
    const recommended = core.material === recMat;

    return {
      core,
      turns,
      wireLength_m: wireLength_m.toFixed(2),
      L_actual_uH,
      Xl_actual,
      ok: Xl_actual >= 4 * 50,
      recommended,
      method,      // winding method object
      winding: {   // backwards compat
        description: `${method.name} ${turns}回`
      }
    };
  });
}

// Export
window.CalcUnun = { CORES, getWindingMethod, calcRequiredL, calcTurns, calcWireLength, calcAllCores };
