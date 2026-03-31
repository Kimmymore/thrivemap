/**
 * Scoring engine for Happy Equal Life
 *
 * Calculates a weighted match score for each country based on
 * the user's profile and preference weights.
 */

import externalScores from './external-scores.json';

const WB_API_BASE = 'https://api.worldbank.org/v2/country/all/indicator';

/**
 * ISO 3166-1 alpha-2 → alpha-3 code mapping.
 * Used to match our country codes against WHO and World Bank API responses.
 */
const ISO2_TO_ISO3 = {
  IS: 'ISL', NO: 'NOR', SE: 'SWE', FI: 'FIN', DK: 'DNK',
  EE: 'EST', LV: 'LVA', LT: 'LTU',
  NL: 'NLD', BE: 'BEL', DE: 'DEU', AT: 'AUT', CH: 'CHE',
  LU: 'LUX', FR: 'FRA', IE: 'IRL', GB: 'GBR',
  PT: 'PRT', ES: 'ESP', IT: 'ITA', GR: 'GRC', MT: 'MLT',
  CY: 'CYP', AD: 'AND', SM: 'SMR',
  CZ: 'CZE', SI: 'SVN', SK: 'SVK', PL: 'POL', HU: 'HUN',
  RO: 'ROU', BG: 'BGR', RS: 'SRB', HR: 'HRV', AL: 'ALB',
  ME: 'MNE', MK: 'MKD', UA: 'UKR',
  CA: 'CAN', US: 'USA', MX: 'MEX',
  CR: 'CRI', CU: 'CUB', BB: 'BRB', BZ: 'BLZ',
  AR: 'ARG', UY: 'URY', CL: 'CHL', BR: 'BRA', CO: 'COL',
  EC: 'ECU', PE: 'PER', BO: 'BOL', SR: 'SUR',
  AU: 'AUS', NZ: 'NZL', FJ: 'FJI',
  JP: 'JPN', KR: 'KOR', TW: 'TWN', CN: 'CHN',
  TH: 'THA', VN: 'VNM', PH: 'PHL', KH: 'KHM',
  SG: 'SGP', LA: 'LAO',
  IN: 'IND', NP: 'NPL',
  IL: 'ISR',
  ZA: 'ZAF', BW: 'BWA', NA: 'NAM', CV: 'CPV',
  SC: 'SYC', MZ: 'MOZ', AO: 'AGO',
};

const ISO3_TO_ISO2 = Object.fromEntries(
  Object.entries(ISO2_TO_ISO3).map(([k, v]) => [v, k])
);



/**
 * Determine which racial experience key to use for a person.
 */
export function racialKey(race) {
  return race || 'white';
}

/**
 * Is this person LGBTQ+?
 */
export function isLgbtq(orientation) {
  return ['gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other'].includes(orientation);
}

/**
 * Is this person transgender / non-binary?
 * (affects gender-specific LGBTQ legal score weight)
 */
export function isGenderDiverse(gender) {
  return ['nonbinary', 'other'].includes(gender);
}

/**
 * Calculate the climate match score (0–100).
 */
export function climateScore(country, tempPref) {
  const countryTempScore = Math.max(0, Math.min(100, ((country.avg_temp_c + 10) / 45) * 100));
  const dist = Math.abs(countryTempScore - tempPref);
  return Math.max(0, 100 - dist * 1.2);
}

/**
 * Get racial experience score for one or two people.
 * For a couple, returns the lower of the two (most vulnerable).
 */
export function racialScore(country, persons) {
  const scores = persons
    .filter(p => p.race)
    .map(p => country.racial[racialKey(p.race)] ?? 60);
  if (scores.length === 0) return 70;
  return Math.min(...scores);
}

export function lgbtqOrientScore(country, persons) {
  const anyLgbtq = persons.some(p => isLgbtq(p.orientation));
  if (!anyLgbtq) return country.lgbtq_orient;
  return country.lgbtq_orient;
}

export function lgbtqGenderScore(country) {
  return country.lgbtq_gender;
}

/**
 * Compute the overall score for a country.
 */
export function scoreCountry(country, persons, weights, tempPref) {
  const breakdown = {
    climate:        climateScore(country, tempPref),
    lgbtq_orient:   country.lgbtq_orient ?? 50,
    lgbtq_gender:   country.lgbtq_gender ?? 50,
    lgbtq_social:   country.lgbtq_social ?? 50,
    racial:         racialScore(country, persons),
    safety:         country.safety,
    healthcare:     country.healthcare,
    cost_value:     country.cost_value,
    visa:           country.visa,
  };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(breakdown)) {
    const w = weights[key] ?? 0;
    weightedSum += breakdown[key] * w;
    totalWeight += w;
  }
  const total = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return { total: Math.round(total), breakdown };
}

export const DEFAULT_WEIGHTS = {
  climate:      50,
  lgbtq_orient: 50,
  lgbtq_gender: 50,
  lgbtq_social: 50,
  racial:       50,
  safety:       50,
  healthcare:   50,
  cost_value:   50,
  visa:         50,
};

export function suggestWeights(persons) {
  const weights = { ...DEFAULT_WEIGHTS };
  const anyLgbtq = persons.some(p => isLgbtq(p.orientation));
  const anyGenderDiverse = persons.some(p => isGenderDiverse(p.gender));
  const isPoc = persons.some(p => p.race && p.race !== 'white');
  const isCouple = persons.length === 2;
  if (anyLgbtq) { weights.lgbtq_orient = 80; weights.lgbtq_social = 75; }
  if (anyGenderDiverse) { weights.lgbtq_gender = 85; }
  if (isPoc) { weights.racial = 80; }
  if (isCouple) { weights.visa = 65; }
  return weights;
}

// NOTE: WHO GHO healthcare data is fetched server-side by the annual GitHub Actions
// workflow (update-external-scores.yml) and stored in external-scores.json.
// The ghoapi.azureedge.net endpoint does not send CORS headers, so it cannot be
// called directly from a browser. Healthcare scores are applied in mergeExternalScores().

/**
 * Fetch the Political Stability index from the World Bank.
 * Indicator: PV.EST. Returns { iso2: safetyScore (0–100) } or null.
 */
export async function fetchWorldBankSafety() {
  try {
    const url = `${WB_API_BASE}/PV.EST?format=json&mrv=1&per_page=350`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const records = Array.isArray(json) && json[1] ? json[1] : [];
    const map = {};
    for (const rec of records) {
      if (rec.value == null) continue;
      const iso2 = ISO3_TO_ISO2[rec.countryiso3code];
      if (!iso2) continue;
      map[iso2] = Math.round(Math.max(0, Math.min(100, (rec.value + 3.0) / 5.5 * 100)));
    }
    return Object.keys(map).length > 0 ? map : null;
  } catch (e) {
    console.warn('World Bank API unavailable, using built-in safety data.', e.message);
    return null;
  }
}

export function mergeSafetyData(countries, safetyMap) {
  if (!safetyMap) return countries;
  return countries.map(c => {
    const live = safetyMap[c.code];
    return live != null ? { ...c, safety: live } : c;
  });
}

/**
 * Apply bundled annual scores from external-scores.json.
 * Includes WHO GHO healthcare, GPI safety blend, and Rainbow Map LGBTQ index.
 * Call before mergeSafetyData (World Bank live data applied last).
 */
/** True when the annual GitHub Actions job has populated Equaldex data. */
export const equaldexAnnualAvailable =
  Object.keys(externalScores?.equaldex || {}).length > 0;

export function mergeExternalScores(countries) {
  const gpi        = externalScores?.gpi        || {};
  const rainbow    = externalScores?.rainbow    || {};
  const healthcare = externalScores?.healthcare || {};
  const equaldex   = externalScores?.equaldex   || {};

  return countries.map(c => {
    let updated = c;

    // WHO GHO → replace built-in healthcare score with the annual-fetched UHC index
    const healthScore = healthcare[c.code];
    if (healthScore != null) {
      updated = { ...updated, healthcare: healthScore };
    }

    // GPI → blend with existing safety score (50/50)
    const gpiScore = gpi[c.code];
    if (gpiScore != null) {
      updated = { ...updated, safety: Math.round((gpiScore + updated.safety) / 2) };
    }

    // Rainbow Map → override ei for European countries
    const rainbowScore = rainbow[c.code];
    if (rainbowScore != null) {
      updated = { ...updated, ei: rainbowScore };
    }

    // Equaldex → override LGBTQ+ orientation and social scores
    const eq = equaldex[c.code];
    if (eq) {
      updated = {
        ...updated,
        ei:           eq.ei           ?? updated.ei,
        lgbtq_orient: eq.lgbtq_orient ?? updated.lgbtq_orient,
        lgbtq_social: eq.lgbtq_social ?? updated.lgbtq_social,
      };
    }

    return updated;
  });
}

export const DIMENSIONS = [
  {
    key:         'climate',
    label:       'Climate',
    description: 'How well the country\'s typical climate matches your temperature preference and sunshine needs.',
  },
  {
    key:         'lgbtq_orient',
    label:       'LGBTQ+ Legal: Orientation',
    description: 'Legal protection based on sexual orientation — covering same-sex partnerships, marriage, adoption and anti-discrimination law. Data from Equaldex.',
  },
  {
    key:         'lgbtq_gender',
    label:       'LGBTQ+ Legal: Gender Identity',
    description: 'Legal gender recognition, protection from discrimination based on gender identity, and access to gender-affirming healthcare. Based on Rainbow Europe and ILGA World indices.',
  },
  {
    key:         'lgbtq_social',
    label:       'LGBTQ+ Social Acceptance',
    description: 'How accepted and visible LGBTQ+ people are in daily social life, measured by public attitude surveys. Data from Equaldex.',
  },
  {
    key:         'racial',
    label:       'Racial Experience',
    description: 'Estimated social comfort and safety for your racial background based on reported experiences, diversity research and colorism studies. Generalised — individual experiences vary.',
  },
  {
    key:         'safety',
    label:       'Safety',
    description: 'General personal safety including crime rates and political stability. Based on the Global Peace Index and other safety indices.',
  },
  {
    key:         'healthcare',
    label:       'Healthcare',
    description: 'Quality of and access to public healthcare. Based on WHO and Euro Health Consumer Index data.',
  },
  {
    key:         'cost_value',
    label:       'Cost / Value',
    description: 'Quality of life relative to cost of living. A high score means your money goes further without sacrificing quality.',
  },
  {
    key:         'visa',
    label:       'Visa / Residency',
    description: 'Ease of legally relocating — covering digital nomad visas, retirement visas, skilled worker routes and EU freedom of movement. Score reflects general accessibility for most Western passport holders.',
  },
];
