import { orbitalElements, PRESENT, climate, energyBalance, dailyInsolation, distanceAU, trueAnomalyFromMean, meanAnomalyFromTrue, perihelionDate, seasonAtPerihelion, dayOfYearToDate, timeSeries } from './orbital.js';

const $ = (id) => document.getElementById(id);
const fmt = {
  signed: (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d),
  signedPlain: (v, d) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d),
};
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- star field (2D, behind everything) --------------------------
function drawStars() {
  const c = $('stars');
  const ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  c.width = w * dpr; c.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createRadialGradient(w * 0.75, h * 0.1, 0, w * 0.75, h * 0.1, Math.max(w, h) * 0.9);
  g.addColorStop(0, '#141c3a');
  g.addColorStop(0.5, '#0c1226');
  g.addColorStop(1, '#080b17');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const n = Math.round((w * h) / 2600);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd();
    const size = r < 0.9 ? 0.6 + rnd() * 0.6 : 1.2 + rnd() * 1.1;
    const a = 0.25 + rnd() * 0.6;
    const warm = rnd() < 0.2;
    ctx.fillStyle = warm ? `rgba(255,225,190,${a})` : `rgba(210,225,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  }
}
drawStars();
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawStars, 150); });

// ---------- shared present-day climate ----------------------------------
const NOW = climate(PRESENT.e, PRESENT.eps, PRESENT.varpi);

// ---------- WebGL + scenes ----------------------------------------------
let scenes = null;
async function initScenes() {
  const test = document.createElement('canvas');
  const gl = test.getContext('webgl2') || test.getContext('webgl');
  if (!gl) throw new Error('no webgl');
  const [{ startLoop }, S] = await Promise.all([import('./stage.js'), import('./scenes.js')]);
  scenes = {
    hero: S.buildHeroScene($('stage-hero')),
    orbit: S.buildOrbitScene($('stage-orbit')),
    tilt: S.buildTiltScene($('stage-tilt')),
    wobble: S.buildWobbleScene($('stage-wobble')),
    timeline: S.buildTimelineScene($('stage-timeline')),
  };
  scenes.hero.set({ iceNorth: NOW.iceNorth, iceSouth: NOW.iceSouth });
  startLoop();
  // push current slider state into the freshly built scenes
  ecc.update(); tilt.update(); prec.update(); time.update(time.t);
}

// ---------- a tiny "play" helper -----------------------------------------
function player(button, { onFrame, labelPlay, labelStop }) {
  let raf = 0, last = 0;
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; button.setAttribute('aria-pressed', 'false'); button.textContent = labelPlay; };
  const step = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (onFrame(dt) === false) { stop(); return; }
    raf = requestAnimationFrame(step);
  };
  button.addEventListener('click', () => {
    if (raf) return stop();
    button.setAttribute('aria-pressed', 'true');
    button.textContent = labelStop;
    last = performance.now();
    raf = requestAnimationFrame(step);
  });
  return { stop, get playing() { return raf !== 0; } };
}

// =========================================================================
// Eccentricity lab
// =========================================================================
const ecc = {
  e: PRESENT.e,
  day: 0,
  update() {
    const e = ecc.e;
    const M = (ecc.day / 365.25) * 360;
    const nu = trueAnomalyFromMean(M, e);
    const lambda = (nu + PRESENT.varpi) % 360;
    const r = distanceAU(lambda, e, PRESENT.varpi);
    const rel = Math.sqrt(1 - e * e) / (r * r) - 1; // the annual mean of 1/r² is 1/√(1−e²)
    $('ecc-e-out').value = e.toFixed(3) + (e > 0.058 ? ' (exaggerated)' : '');
    $('ecc-day-out').value = String(Math.round(ecc.day));
    $('ecc-date').textContent = dayOfYearToDate((3 + ecc.day) % 365.25); // perihelion ≈ 3–4 January
    $('ecc-dist').textContent = r.toFixed(3);
    $('ecc-rel').textContent = fmt.signed(rel * 100, 1);
    $('ecc-peri').textContent = (1 - e).toFixed(3);
    $('ecc-aph').textContent = (1 + e).toFixed(3);
    $('ecc-contrast').textContent = fmt.signed((((1 + e) / (1 - e)) ** 2 - 1) * 100, 1);
    if (scenes) scenes.orbit.set({ e, nu, varpi: PRESENT.varpi, eps: PRESENT.eps, iceNorth: NOW.iceNorth, iceSouth: NOW.iceSouth });
  },
};
$('ecc-e').addEventListener('input', (ev) => { ecc.e = parseFloat(ev.target.value); ecc.update(); });
$('ecc-day').addEventListener('input', (ev) => { ecc.day = parseFloat(ev.target.value); eccPlayer.stop(); ecc.update(); });
const eccPlayer = player($('ecc-play'), {
  labelPlay: '▶ Orbit a year', labelStop: '❚❚ Pause',
  onFrame(dt) {
    ecc.day = (ecc.day + dt * (365.25 / 14)) % 365.25; // one year in 14 s
    $('ecc-day').value = ecc.day.toFixed(0);
    ecc.update();
  },
});
ecc.update();

// =========================================================================
// Obliquity lab
// =========================================================================
const SEASON_NAMES = [[0, 'March equinox'], [90, 'June solstice'], [180, 'September equinox'], [270, 'December solstice']];
function seasonLabel(lambda) {
  for (const [l, n] of SEASON_NAMES) if (Math.abs(((lambda - l + 540) % 360) - 180) < 4) return n;
  const doy = (79 + (lambda / 360) * 365.25) % 365.25;
  return dayOfYearToDate(doy);
}
const tilt = {
  eps: PRESENT.eps,
  lambda: 90,
  update() {
    const c = climate(PRESENT.e, tilt.eps, PRESENT.varpi);
    $('tilt-eps-out').value = tilt.eps.toFixed(1) + '°';
    $('tilt-season-out').value = seasonLabel(tilt.lambda);
    $('tilt-arctic').textContent = (90 - tilt.eps).toFixed(1);
    $('tilt-q65').textContent = c.qNorth.toFixed(0);
    $('tilt-iceN').textContent = c.iceNorth >= 89.5 ? 'none' : c.iceNorth.toFixed(0);
    $('tilt-iceS').textContent = c.iceSouth >= 89.5 ? 'none' : c.iceSouth.toFixed(0);
    $('tilt-icefrac').textContent = (c.iceFraction * 100).toFixed(1);
    $('tilt-albedo').textContent = c.albedo.toFixed(3);
    $('tilt-absorbed').textContent = fmt.signed(c.absorbed - NOW.absorbed, 1);
    $('tilt-teff').textContent = c.tEffective.toFixed(1);
    $('tilt-dt').textContent = fmt.signed(c.dTSurface, 2);
    tilt.albedo = c.albedo;
    document.querySelectorAll('.chip[data-eps]').forEach((b) => b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.eps) - tilt.eps) < 0.05));
    if (scenes) scenes.tilt.set({ eps: tilt.eps, lambda: tilt.lambda, iceNorth: c.iceNorth, iceSouth: c.iceSouth });
  },
};
$('tilt-eps').addEventListener('input', (ev) => { tilt.eps = parseFloat(ev.target.value); tilt.update(); });
$('tilt-season').addEventListener('input', (ev) => { tilt.lambda = parseFloat(ev.target.value); tilt.update(); });
document.querySelectorAll('.chip[data-eps]').forEach((b) => b.addEventListener('click', () => {
  tilt.eps = parseFloat(b.dataset.eps);
  $('tilt-eps').value = tilt.eps;
  tilt.update();
}));
tilt.update();

// =========================================================================
// Precession lab
// =========================================================================
const prec = {
  varpi: PRESENT.varpi,
  update() {
    const v = prec.varpi;
    const c = climate(PRESENT.e, PRESENT.eps, v);
    $('prec-phase-out').value = Math.round(v) + '°';
    $('prec-date').textContent = perihelionDate(v);
    $('prec-season').textContent = seasonAtPerihelion(v);
    $('prec-dist').textContent = distanceAU(90, PRESENT.e, v).toFixed(3);
    const q = c.qNorth;
    $('prec-q65').textContent = `${q.toFixed(0)} (${fmt.signed(q - NOW.qNorth, 0)})`;
    $('prec-index').textContent = fmt.signedPlain(PRESENT.e * Math.sin((v * Math.PI) / 180), 3);
    $('prec-iceN').textContent = c.iceNorth >= 89.5 ? 'none' : c.iceNorth.toFixed(0);
    if (scenes) scenes.wobble.set({ eps: PRESENT.eps, varpi: v, iceNorth: c.iceNorth, iceSouth: c.iceSouth });
  },
};
$('prec-phase').addEventListener('input', (ev) => { prec.varpi = parseFloat(ev.target.value); precPlayer.stop(); prec.update(); });
const precPlayer = player($('prec-play'), {
  labelPlay: '▶ Sweep one cycle', labelStop: '❚❚ Pause',
  onFrame(dt) {
    prec.varpi = (prec.varpi + dt * (360 / 18)) % 360;
    $('prec-phase').value = prec.varpi.toFixed(0);
    prec.update();
  },
});
prec.update();

// =========================================================================
// Timeline
// =========================================================================
const SERIES = timeSeries(-800, 100, 1);
const time = {
  t: 0,
  chart: null,
  update(t, fromChart = false) {
    time.t = t;
    const el = orbitalElements(t * 1000);
    const c = climate(el.e, el.eps, el.varpi);
    const kyr = Math.abs(t) < 0.25 ? 'now' : `${Math.abs(t).toFixed(1)} kyr ${t < 0 ? 'ago' : 'ahead'}`;
    $('time-t-out').value = kyr;
    if (!fromChart) $('time-t').value = t;
    $('time-e').textContent = el.e.toFixed(3);
    $('time-eps').textContent = el.eps.toFixed(2);
    $('time-prec').textContent = fmt.signedPlain(el.precIndex, 3);
    $('time-q65').textContent = c.qNorth.toFixed(0);
    $('time-iceN').textContent = c.iceNorth >= 89.5 ? 'none' : c.iceNorth.toFixed(0);
    $('time-albedo').textContent = c.albedo.toFixed(3);
    $('time-absorbed').textContent = fmt.signed(c.absorbed - NOW.absorbed, 1);
    $('time-teff').textContent = c.tEffective.toFixed(1);
    $('time-dt').textContent = fmt.signed(c.dTSurface, 2);
    time.albedo = c.albedo;
    document.querySelectorAll('.chip[data-t]').forEach((b) => b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.t) - t) < 0.3));
    if (time.chart) time.chart.setTime(t);
    if (scenes) {
      const r = distanceAU(90, el.e, el.varpi);
      scenes.timeline.set({ eps: el.eps, iceNorth: c.iceNorth, iceSouth: c.iceSouth, sunStrength: 1 / (r * r) });
    }
  },
};
$('time-t').addEventListener('input', (ev) => { timePlayer.stop(); time.update(parseFloat(ev.target.value)); });
$('time-now').addEventListener('click', () => { timePlayer.stop(); time.update(0); });
document.querySelectorAll('.chip[data-t]').forEach((b) => b.addEventListener('click', () => { timePlayer.stop(); time.update(parseFloat(b.dataset.t)); }));
const timePlayer = player($('time-play'), {
  labelPlay: '▶ Play from −800 kyr', labelStop: '❚❚ Pause',
  onFrame(dt) {
    let t = time.t;
    if (t >= 100 || (t === 0 && !timePlayer.started)) t = -800;
    timePlayer.started = true;
    t = Math.min(100, t + dt * 24); // 24 kyr per second
    time.update(t);
    if (t >= 100) { timePlayer.started = false; return false; }
  },
});

import('./chart.js').then(({ TimeChart }) => {
  time.chart = new TimeChart($('chart'), SERIES, { onScrub: (t) => { timePlayer.stop(); time.update(Math.round(t * 2) / 2); } });
  time.chart.setTime(time.t);
});
time.update(0);

// =========================================================================
// Energy balance lab: albedo → absorbed power → Stefan–Boltzmann temperature
// =========================================================================
const energy = {
  albedo: NOW.albedo,
  update() {
    const a = energy.albedo;
    const b = energyBalance(a); // today's S/4, so only albedo varies here
    const pct = (v) => ((100 * v) / b.incoming).toFixed(1) + '%';
    $('en-alb-out').value = a.toFixed(3);
    $('en-eq-in').textContent = b.incoming.toFixed(1);
    $('en-eq-alb').textContent = a.toFixed(3);
    $('en-eq-abs').textContent = b.absorbed.toFixed(1);
    $('en-eq-teff').textContent = b.tEffective.toFixed(1);
    $('en-in').textContent = b.incoming.toFixed(1);
    $('en-ref').textContent = b.reflected.toFixed(1);
    $('en-abs').textContent = b.absorbed.toFixed(1);
    $('en-out').textContent = b.absorbed.toFixed(1);
    $('en-bar-ref').style.setProperty('--w', pct(b.reflected));
    $('en-bar-abs').style.setProperty('--w', pct(b.absorbed));
    $('en-bar-out').style.setProperty('--w', pct(b.absorbed));
    $('en-incoming').textContent = b.incoming.toFixed(1);
    $('en-absorbed').textContent = b.absorbed.toFixed(1);
    $('en-dabs').textContent = fmt.signed(b.absorbed - NOW.absorbed, 1);
    $('en-teff').textContent = b.tEffective.toFixed(1);
    $('en-tsurf').textContent = b.tSurface.toFixed(1);
    $('en-tsurf-c').textContent = (b.tSurface - 273.15).toFixed(1);
    $('en-dt').textContent = fmt.signed(b.dTSurface, 2);
    $('en-sens').textContent = b.sensitivity.toFixed(2);
    document.querySelectorAll('.chip[data-alb]').forEach((c) => {
      const v = energy.presetValue(c.dataset.alb);
      c.classList.toggle('is-active', v !== null && Math.abs(v - a) < 0.0005);
    });
  },
  presetValue(key) {
    if (key === 'today') return NOW.albedo;
    if (key === 'tilt') return tilt.albedo ?? null;
    if (key === 'timeline') return time.albedo ?? null;
    return parseFloat(key);
  },
  set(a) {
    energy.albedo = Math.max(0.2, Math.min(0.48, a));
    $('en-alb').value = energy.albedo.toFixed(3);
    energy.update();
  },
};
$('en-alb').addEventListener('input', (ev) => { energy.albedo = parseFloat(ev.target.value); energy.update(); });
document.querySelectorAll('.chip[data-alb]').forEach((b) => b.addEventListener('click', () => {
  const v = energy.presetValue(b.dataset.alb);
  if (v !== null) energy.set(v);
}));
energy.update();

// ---------- go ------------------------------------------------------------
initScenes().catch((err) => {
  console.error(err);
  $('webgl-fallback').hidden = false;
});
