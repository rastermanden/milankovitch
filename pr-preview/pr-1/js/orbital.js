/**
 * Orbital forcing, a small ice–albedo model, and the Stefan–Boltzmann
 * energy balance that turns the resulting albedo into a temperature.
 *
 * Eccentricity, obliquity and precession follow the trigonometric series of
 * Berger (1978, J. Atmos. Sci. 35, 2362–2367), truncated to the leading
 * terms. That keeps the file small while reproducing the shape, timing and
 * amplitude of the cycles over the last million years. Time is in years,
 * negative in the past, relative to 1950.
 */

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;

export const S0 = 1361; // solar constant, W/m²

// Eccentricity: e·sin Π and e·cos Π series  [amplitude, rate arcsec/yr, phase deg]
const ECC = [
  [0.01860798, 4.207205, 28.620089],
  [0.01627522, 7.346091, 193.788772],
  [-0.01300660, 17.857263, 308.307024],
  [0.00988829, 17.220546, 320.199637],
  [-0.00336700, 16.846733, 279.376984],
  [0.00333077, 5.199079, 87.195000],
  [-0.00235400, 18.231076, 349.129677],
  [0.00140015, 26.216758, 192.417092],
  [0.00100700, 6.359169, 78.911610],
  [0.00085700, 16.210016, 84.762400],
  [0.00064990, 3.065181, 233.640015],
  [0.00059900, 16.583829, 234.909494],
  [0.00037800, 18.493980, 263.808602],
  [-0.00033700, 6.190953, 118.938502],
  [0.00027600, 18.867793, 293.299250],
  [0.00018200, 17.425567, 26.516150],
  [-0.00017400, 6.186001, 258.164230],
  [-0.00012400, 18.417441, 283.600045],
  [0.00001250, 0.667863, 21.593620],
];

// Obliquity series  [amplitude arcsec, rate arcsec/yr, phase deg]
const OBL_STAR = 23.320556; // degrees
const OBL = [
  [-2462.2214466, 31.609974, 251.9025],
  [-857.3232075, 32.620504, 280.8325],
  [-629.3231835, 24.172203, 128.3057],
  [-414.2804924, 31.983787, 292.7252],
  [-311.7632587, 44.828336, 15.3747],
  [308.9408604, 30.973257, 263.7951],
  [-162.5533601, 43.668246, 308.4258],
  [-116.1077911, 32.246691, 240.0099],
  [101.1189923, 30.599444, 222.9725],
  [-67.6856209, 42.681324, 110.5327],
  [24.9079067, 43.836462, 352.5771],
  [-21.5811149, 47.439436, 315.1969],
];

// General precession in longitude  [amplitude arcsec, rate arcsec/yr, phase deg]
const PSI_RATE = 50.439273; // arcsec/yr
const PSI_ZETA = 3.392506; // degrees
const PRE = [
  [7391.0225890, 31.609974, 251.9025],
  [2555.1526947, 32.620504, 280.8325],
  [2022.7629188, 24.172203, 128.3057],
  [-1973.6517951, 0.636717, 348.1074],
  [-1240.2321818, 31.983787, 292.7252],
  [953.8679112, 3.138886, 165.1686],
  [-931.7537108, 30.973257, 263.7951],
  [-872.2453599, 44.828336, 15.3747],
  [-606.5518384, 0.991874, 58.5765],
  [-496.0016690, 0.373813, 5.2114],
];

function wrap360(d) {
  return ((d % 360) + 360) % 360;
}

/**
 * Orbital elements at time t (years from 1950, negative = past).
 * @returns {{e:number, eps:number, varpi:number, precIndex:number}}
 *  e       eccentricity
 *  eps     obliquity, degrees
 *  varpi   longitude of perihelion, degrees, measured from the moving
 *          March equinox along the Sun's apparent path (≈283° today, so the
 *          Sun is at perihelion in early January)
 *  precIndex  climatic precession e·sin ϖ, positive when northern summer
 *          falls near perihelion
 */
export function orbitalElements(t) {
  let es = 0, ec = 0;
  for (const [m, g, b] of ECC) {
    const a = g * t * ARCSEC + b * DEG;
    es += m * Math.sin(a);
    ec += m * Math.cos(a);
  }
  const e = Math.hypot(es, ec);
  const Pi = Math.atan2(es, ec) / DEG;

  let eps = OBL_STAR;
  for (const [A, f, d] of OBL) eps += (A / 3600) * Math.cos(f * t * ARCSEC + d * DEG);

  let psi = (PSI_RATE * t) / 3600 + PSI_ZETA;
  for (const [F, f, d] of PRE) psi += (F / 3600) * Math.sin(f * t * ARCSEC + d * DEG);

  // Berger's ϖ (Earth's heliocentric longitude of perihelion, ≈103° today)
  const varpiEarth = wrap360(Pi + psi);
  // Sun-centred convention used by the insolation formulas below
  const varpi = wrap360(varpiEarth + 180);
  const precIndex = e * Math.sin(varpi * DEG);
  return { e, eps, varpi, varpiEarth, precIndex };
}

/** Present-day (t = 0) elements, cached. */
export const PRESENT = orbitalElements(0);

/**
 * Daily mean insolation (W/m²) at latitude lat (deg) when the Sun's true
 * longitude is lambda (deg; 0 = March equinox, 90 = June solstice).
 */
export function dailyInsolation(lat, lambda, e, eps, varpi) {
  const phi = lat * DEG;
  const lam = lambda * DEG;
  const delta = Math.asin(Math.sin(eps * DEG) * Math.sin(lam));
  const nu = lam - varpi * DEG; // true anomaly
  const rho = (1 - e * e) / (1 + e * Math.cos(nu)); // r / a
  const x = -Math.tan(phi) * Math.tan(delta);
  let H;
  if (x <= -1) H = Math.PI; // midnight sun
  else if (x >= 1) H = 0; // polar night
  else H = Math.acos(x);
  const q = H * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(H);
  return (S0 / Math.PI) * q / (rho * rho);
}

/** Sun–Earth distance in AU for a given Sun true longitude. */
export function distanceAU(lambda, e, varpi) {
  const nu = (lambda - varpi) * DEG;
  return (1 - e * e) / (1 + e * Math.cos(nu));
}

/**
 * Annual mean insolation at latitude lat, at the top of the atmosphere.
 * Integrating over true longitude removes the 1/r² factor exactly, so the
 * result depends only on obliquity and eccentricity.
 */
export function annualMeanInsolation(lat, e, eps, steps = 72) {
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const lambda = (i + 0.5) * (360 / steps);
    sum += dailyInsolation(lat, lambda, 0, eps, 0);
  }
  return (sum / steps) / Math.sqrt(1 - e * e);
}

/** Mean anomaly → true anomaly (degrees) by solving Kepler's equation. */
export function trueAnomalyFromMean(M, e) {
  const m = M * DEG;
  let E = m;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return wrap360(nu / DEG);
}

/** True anomaly → mean anomaly (degrees). */
export function meanAnomalyFromTrue(nu, e) {
  const v = nu * DEG;
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(v / 2), Math.sqrt(1 + e) * Math.cos(v / 2));
  return wrap360((E - e * Math.sin(E)) / DEG);
}

// ---------------------------------------------------------------------------
// A deliberately simple ice–albedo model.
//
// Ice sheets grow when high-latitude summers are too cool to melt the
// previous winter's snow. The classic diagnostic is the June solstice
// insolation at 65°N. Here the equatorward edge of each polar ice cap moves
// linearly with that hemisphere's midsummer insolation, and the planet's
// effective albedo is the insolation-weighted average of surface albedo.
// ---------------------------------------------------------------------------

export const ICE = {
  refLat: 65,
  northBase: 70, // ice edge latitude today, deg
  southBase: 66,
  northSens: 0.34, // degrees of latitude per W/m²
  southSens: 0.14,
  minLat: 45,
  albedoBase: 0.27,
  albedoIce: 0.66,
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const Q_NORTH_REF = dailyInsolation(65, 90, PRESENT.e, PRESENT.eps, PRESENT.varpi);
const Q_SOUTH_REF = dailyInsolation(-65, 270, PRESENT.e, PRESENT.eps, PRESENT.varpi);

/**
 * Ice edges and planetary albedo for a set of orbital elements.
 */
export function iceAlbedo(e, eps, varpi) {
  const qN = dailyInsolation(65, 90, e, eps, varpi);
  const qS = dailyInsolation(-65, 270, e, eps, varpi);
  const iceN = clamp(ICE.northBase + ICE.northSens * (qN - Q_NORTH_REF), ICE.minLat, 90);
  const iceS = clamp(ICE.southBase + ICE.southSens * (qS - Q_SOUTH_REF), ICE.minLat, 90);

  // Insolation-weighted planetary albedo over latitude bands, with the ice
  // edge allowed to fall part-way through a band so the result is smooth.
  const bands = 48;
  const dLat = 180 / bands;
  let wsum = 0, asum = 0, polarAnnual = 0;
  for (let i = 0; i < bands; i++) {
    const lo = -90 + i * dLat, hi = lo + dLat, lat = (lo + hi) / 2;
    const w = annualMeanInsolation(lat, e, eps, 36) * Math.cos(lat * DEG);
    let icedFrac;
    if (lat > 0) icedFrac = clamp((hi - iceN) / dLat, 0, 1);
    else icedFrac = clamp((-lo - iceS) / dLat, 0, 1);
    const a = ICE.albedoBase + (ICE.albedoIce - ICE.albedoBase) * icedFrac;
    wsum += w;
    asum += w * a;
    if (Math.abs(lat) > 65) polarAnnual += annualMeanInsolation(lat, e, eps, 36);
  }
  const albedo = asum / wsum;
  // Global, annual-mean sunlight at the top of the atmosphere. Over a
  // circular orbit this is S/4; the mean of 1/r² over an ellipse adds 1/√(1−e²).
  const globalMean = S0 / (4 * Math.sqrt(1 - e * e));
  const iceFraction = ((1 - Math.sin(iceN * DEG)) + (1 - Math.sin(iceS * DEG))) / 2;
  return {
    qNorth: qN,
    qSouth: qS,
    iceNorth: iceN,
    iceSouth: iceS,
    iceFraction,
    albedo,
    globalMean,
    polarAnnual: polarAnnual / Math.round((25 / dLat) * 2),
    arcticCircle: 90 - eps,
    tropic: eps,
  };
}

// ---------------------------------------------------------------------------
// Energy balance: from albedo to temperature.
//
// Averaged over the year and the whole sphere, Earth intercepts S/4 of
// sunlight per square metre (a disc's worth of sunlight, πR²·S, spread over
// a sphere, 4πR²). A fraction α, the planetary albedo, is reflected straight
// back to space; the rest is absorbed and warms the planet. A warm body
// radiates thermal infrared according to the Stefan–Boltzmann law, σT⁴, so
// the planet settles at the temperature where what goes out equals what
// comes in:
//
//     (S/4)(1 − α) = σ Tₑ⁴      →      Tₑ = [ S(1 − α) / 4σ ]^¼
//
// Tₑ is the "effective" or radiating temperature, about 255 K (−18 °C). The
// surface is warmer than that because greenhouse gases absorb much of the
// infrared the surface emits and re-radiate part of it downward. The simplest
// way to write that is a grey atmosphere: the surface at Tₛ radiates to space
// through an effective emissivity ε < 1,
//
//     (S/4)(1 − α) = ε σ Tₛ⁴
//
// and ε is calibrated once so that today's albedo gives today's 288 K
// (15 °C). Differentiating shows why a small albedo change matters:
//
//     dTₛ/dF = Tₛ / (4 F)  ≈ 288 / (4 × 243)  ≈ 0.30 K per W/m²
//
// where F is the absorbed power. This is the Planck response alone. Water
// vapour, clouds and lapse-rate feedbacks roughly double or triple it in the
// real climate, and in the real ice ages CO₂ and far larger ice sheets did
// most of the work. The page shows the bare Stefan–Boltzmann consequence of
// the modelled albedo, nothing more.
// ---------------------------------------------------------------------------

export const SIGMA = 5.670374419e-8; // Stefan–Boltzmann constant, W m⁻² K⁻⁴
export const T_SURFACE_TODAY = 288; // K, global mean surface temperature today

/** Present-day ice–albedo state, used to calibrate the grey atmosphere. */
const TODAY = iceAlbedo(PRESENT.e, PRESENT.eps, PRESENT.varpi);
export const ABSORBED_TODAY = TODAY.globalMean * (1 - TODAY.albedo);
export const ALBEDO_TODAY = TODAY.albedo;
/** Effective emissivity of the grey atmosphere, ε = F₀ / (σ · 288⁴) ≈ 0.62. */
export const EMISSIVITY = ABSORBED_TODAY / (SIGMA * T_SURFACE_TODAY ** 4);

/**
 * Stefan–Boltzmann energy balance for a planetary albedo and a global-mean
 * incoming sunlight (defaults to today's S/4).
 * @returns {{
 *   incoming:number, reflected:number, absorbed:number,
 *   tEffective:number, tSurface:number, dTSurface:number, sensitivity:number
 * }}
 *  incoming     global annual-mean sunlight at the top of the atmosphere, W/m²
 *  reflected    part sent straight back to space, α × incoming
 *  absorbed     part that warms the planet and must be re-radiated, W/m²
 *  tEffective   radiating temperature, [absorbed / σ]^¼, K
 *  tSurface     surface temperature under the grey atmosphere, [absorbed / εσ]^¼, K
 *  dTSurface    tSurface minus today's 288 K
 *  sensitivity  Planck response dTₛ/dF = Tₛ / (4 absorbed), K per W/m²
 */
export function energyBalance(albedo, incoming = TODAY.globalMean) {
  const reflected = incoming * albedo;
  const absorbed = incoming - reflected;
  const tEffective = (absorbed / SIGMA) ** 0.25;
  const tSurface = (absorbed / (EMISSIVITY * SIGMA)) ** 0.25;
  return {
    incoming,
    reflected,
    absorbed,
    tEffective,
    tSurface,
    dTSurface: tSurface - T_SURFACE_TODAY,
    sensitivity: tSurface / (4 * absorbed),
  };
}

/**
 * Full climate diagnostics for a set of orbital elements: ice edges,
 * planetary albedo, and the Stefan–Boltzmann temperature that follows.
 */
export function climate(e, eps, varpi) {
  const ice = iceAlbedo(e, eps, varpi);
  const bal = energyBalance(ice.albedo, ice.globalMean);
  return {
    ...ice,
    reflected: bal.reflected,
    absorbed: bal.absorbed,
    tEffective: bal.tEffective,
    tSurface: bal.tSurface,
    dTSurface: bal.dTSurface,
    sensitivity: bal.sensitivity,
  };
}

/** Sun's true longitude at perihelion → approximate calendar date. */
export function perihelionDate(varpi) {
  // Sun longitude 0 ≈ 20 March (day 79 of the year).
  const daysFromEquinox = (wrap360(varpi) / 360) * 365.25;
  const doy = (79 + daysFromEquinox) % 365.25;
  return dayOfYearToDate(doy);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function dayOfYearToDate(doy) {
  let d = Math.floor(doy) % 365;
  for (let m = 0; m < 12; m++) {
    if (d < MLEN[m]) return `${d + 1} ${MONTHS[m]}`;
    d -= MLEN[m];
  }
  return '31 Dec';
}

/** Which season does the northern hemisphere have at perihelion? */
export function seasonAtPerihelion(varpi) {
  const v = wrap360(varpi);
  if (v >= 45 && v < 135) return 'northern summer';
  if (v >= 135 && v < 225) return 'northern autumn';
  if (v >= 225 && v < 315) return 'northern winter';
  return 'northern spring';
}

/** Precompute a time series for the chart. t in kyr. */
export function timeSeries(fromKyr = -800, toKyr = 100, stepKyr = 1) {
  const out = [];
  for (let k = fromKyr; k <= toKyr + 1e-9; k += stepKyr) {
    const el = orbitalElements(k * 1000);
    const c = climate(el.e, el.eps, el.varpi);
    out.push({ t: k, e: el.e, eps: el.eps, prec: el.precIndex, q65: c.qNorth, albedo: c.albedo, iceNorth: c.iceNorth, absorbed: c.absorbed, dT: c.dTSurface });
  }
  return out;
}
