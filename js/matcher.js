/**
 * matcher.js — Antenna feed matching selection logic
 * Determines impedance, transformer ratio, balun/unun type for each antenna config.
 */

'use strict';

// ---- Antenna patterns lookup table ----
// Each entry: { antennaType, feedPoint, impedance, ratio, transformerType, notes }
const PATTERNS = [
  {
    id: 'longwire-end',
    antennaType: 'longwire',
    feedPoint: 'end',
    impedance: 500,
    ratio: '9:1',
    ratioNum: 9,
    transformerType: 'UnUn',
    notes: 'End-fed longwire. High impedance at wire end. 9:1 UnUn converts 450\u03a9 to 50\u03a9.'
  },
  {
    id: 'longwire-ltype',
    antennaType: 'longwire',
    feedPoint: 'ltype',
    impedance: 200,
    ratio: '4:1',
    ratioNum: 4,
    transformerType: 'UnUn',
    notes: 'L-match fed longwire. 4:1 UnUn converts ~200\u03a9 to 50\u03a9.'
  },
  {
    id: 'delta-apex',
    antennaType: 'delta',
    feedPoint: 'apex',
    impedance: 100,
    ratio: '2:1',
    ratioNum: 2,
    transformerType: 'Balun',
    notes: 'Delta loop fed at apex (60\u00b0 angle). Balanced antenna requires Balun. 2:1 Balun converts ~100\u03a9 to 50\u03a9.'
  },
  {
    id: 'delta-side',
    antennaType: 'delta',
    feedPoint: 'side',
    impedance: 75,
    ratio: '1:1',
    ratioNum: 1,
    transformerType: 'Balun',
    notes: 'Delta loop fed at side midpoint (90\u00b0). Near 75\u03a9 \u2014 direct feed with 1:1 current Balun recommended.'
  },
  {
    id: 'delta-bottom',
    antennaType: 'delta',
    feedPoint: 'bottom',
    impedance: 200,
    ratio: '4:1',
    ratioNum: 4,
    transformerType: 'Balun',
    notes: 'Delta loop fed at bottom (120\u00b0). 4:1 Balun converts ~200\u03a9 to 50\u03a9.'
  },
  {
    id: 'dipole-center',
    antennaType: 'dipole',
    feedPoint: 'center',
    impedance: 73,
    ratio: '1:1',
    ratioNum: 1,
    transformerType: 'Balun',
    notes: 'Full-size dipole center-fed. ~73\u03a9, direct connection with 1:1 current Balun.'
  }
];

/**
 * Select matching pattern based on user inputs.
 * @param {string} antennaType - 'longwire' | 'delta' | 'dipole' | 'other'
 * @param {string} feedPoint   - antenna-specific feed point identifier
 * @returns {object|null} matching pattern or null
 */
function selectPattern(antennaType, feedPoint) {
  return PATTERNS.find(p => p.antennaType === antennaType && p.feedPoint === feedPoint) || null;
}

/**
 * Get human-readable description of feed point options for an antenna type.
 * @param {string} antennaType
 * @returns {Array<{id, label, description}>}
 */
function getFeedPoints(antennaType) {
  switch (antennaType) {
    case 'longwire':
      return [
        { id: 'end',   label: '\u7aef\u90e8\u7d66\u96fb (End-fed)', description: '~500\u03a9 \u30fb 9:1 UnUn\u5fc5\u8981' },
        { id: 'ltype', label: 'L\u578b\u7d66\u96fb',                 description: '~200\u03a9 \u30fb 4:1 UnUn\u5fc5\u8981' }
      ];
    case 'delta':
      return [
        { id: 'apex',   label: '\u9802\u70b9\u7d66\u96fb (60\u00b0)',     description: '~100\u03a9 \u30fb 2:1 Balun' },
        { id: 'side',   label: '\u8fba\u306e\u4e2d\u70b9 (90\u00b0)',     description: '~75\u03a9 \u30fb 1:1 Balun\u76f4\u7d50' },
        { id: 'bottom', label: '\u5e95\u8fba\u7d66\u96fb (120\u00b0)',    description: '~200\u03a9 \u30fb 4:1 Balun' }
      ];
    case 'dipole':
      return [
        { id: 'center', label: '\u4e2d\u70b9\u7d66\u96fb', description: '~73\u03a9 \u30fb 1:1\u96fb\u6d41Balun\u76f4\u7d50' }
      ];
    default:
      return [];
  }
}

/**
 * Estimate matching quality for a given longwire length and band.
 * Returns a rough SWR estimate based on whether length is resonant or not.
 * @param {number} lengthM  - wire length in meters
 * @param {number} freqMHz  - target frequency in MHz
 * @returns {string} quality descriptor
 */
function estimateLongwireMatch(lengthM, freqMHz) {
  const wavelength = 300 / freqMHz;
  const ratio = lengthM / wavelength;
  const half = ratio * 2; // multiples of half-wave
  const nearHalf = half % 1;
  // Avoid half-wave resonance (high Z at end)
  if (nearHalf < 0.08 || nearHalf > 0.92) {
    return 'avoid'; // near half-wave multiple — very high or low Z
  }
  if (nearHalf < 0.15 || nearHalf > 0.85) {
    return 'caution';
  }
  return 'ok';
}

/**
 * Build summary result object from pattern + inputs.
 * @param {object} pattern  - matched pattern
 * @param {number[]} bands  - selected frequencies in MHz
 * @param {number|null} lengthM - longwire length in meters (optional)
 * @returns {object} result summary
 */
function buildResult(pattern, bands, lengthM) {
  const result = {
    pattern,
    bands,
    lengthM,
    bandAnalysis: []
  };

  if (pattern.antennaType === 'longwire' && lengthM) {
    result.bandAnalysis = bands.map(f => {
      const quality = estimateLongwireMatch(lengthM, f);
      return { freq: f, quality };
    });
  }

  return result;
}

// Export for use in other modules
window.Matcher = { PATTERNS, selectPattern, getFeedPoints, buildResult };
