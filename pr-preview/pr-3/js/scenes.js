/**
 * The five 3D stages on the page. Each builder returns a controller with a
 * `set()` method that main.js drives from the sliders.
 */
import * as THREE from 'three';
import { Stage, REDUCED_MOTION, makeSun, makeGlowSprite, makeLatitudeRing, makeAxisRod, makeDot, makeLine } from './stage.js';
import { createEarth, axisDirection } from './earth.js';
import { t, n, onLanguageChange } from './i18n.js';

// labels whose text is a translation key; refreshed when the language changes
const i18nLabels = [];
function tl(label, key) { label.key = key; label.div.textContent = t(key); i18nLabels.push(label); return label; }
onLanguageChange(() => i18nLabels.forEach((l) => { l.div.textContent = t(l.key); }));

const COLORS = {
  gold: '#f3b64a',
  ice: '#b9e6ff',
  ink: '#aab3d1',
  faint: '#5c6890',
  rose: '#ef86b0',
  blue: '#5aa8ff',
};

function azimuthOf(v) {
  // angle (deg) of a world direction's horizontal component, CCW seen from +Y, 0 = +X
  return THREE.MathUtils.radToDeg(Math.atan2(-v.z, v.x));
}

function fovForAspect(base, narrowBoost = 1.0) {
  return (aspect, width) => {
    const byAspect = base / Math.pow(Math.min(aspect, 1), 0.85);
    const byWidth = width < 620 ? base * narrowBoost : base;
    return THREE.MathUtils.clamp(Math.max(byAspect, byWidth), base, 80);
  };
}

/** A faint translucent disc marking the orbital (ecliptic) plane. */
function makePlaneDisc(radius, opacity = 0.07) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.MeshBasicMaterial({ color: '#7f9bff', transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  g.add(disc);
  const ring = makeLatitudeRing(radius, 0, '#7f9bff', 0.35);
  g.add(ring);
  return g;
}

// ---------------------------------------------------------------------------
export function buildHeroScene(el) {
  const stage = new Stage(el, { fov: 34, polar: [1.05, 2.0], autoRotate: 0.6 });
  stage.fovFor = fovForAspect(34);
  stage.lookAt(0, 1.25, 3.6);
  const earth = createEarth(1.1, { segments: 128 });
  const sunDir = new THREE.Vector3(1.2, 0.5, 0.5).normalize();
  earth.setSunDir(sunDir);
  earth.setAxis(axisDirection(23.44, azimuthOf(sunDir) - 40));
  stage.scene.add(earth.group);
  const glow = makeGlowSprite(9.5, '#ffcf7a', 0.9);
  glow.position.copy(sunDir).multiplyScalar(7);
  stage.scene.add(glow);
  stage.onTick((dt) => { if (!REDUCED_MOTION) earth.rotate(dt, 0.08); });
  return {
    stage,
    set({ iceNorth, iceSouth }) { earth.setIce(iceNorth, iceSouth); },
  };
}

// ---------------------------------------------------------------------------
export function buildOrbitScene(el) {
  const stage = new Stage(el, { fov: 40, polar: [0.25, 1.35] });
  stage.fovFor = fovForAspect(40, 1.45);
  stage.lookAt(0, 5.6, 7.6);
  const A = 3.2;
  const scene = stage.scene;

  const sun = makeSun(0.4, { glow: 7 });
  scene.add(sun);
  Object.assign(tl(stage.addLabel(sun, '', 'label-sun'), 'scene.sun'), { dy: 34 });

  const earth = createEarth(0.32, { segments: 64, clouds: false });
  scene.add(earth.group);
  const axis = makeAxisRod(0.32, 2.2);
  earth.group.add(axis);
  stage.addLabel(axis.userData.north, 'N', 'label-pole');

  const segs = 256;
  const orbitPts = Array.from({ length: segs + 1 }, () => new THREE.Vector3());
  const orbit = makeLine(orbitPts, COLORS.gold, 0.55);
  scene.add(orbit);
  const distLine = makeLine([new THREE.Vector3(), new THREE.Vector3()], COLORS.ice, 0.55, true);
  scene.add(distLine);

  const peri = makeDot(0.06, COLORS.gold); scene.add(peri);
  const aph = makeDot(0.06, COLORS.faint); scene.add(aph);
  Object.assign(tl(stage.addLabel(peri, '', 'label-mark'), 'scene.perihelion'), { dy: 16 });
  Object.assign(tl(stage.addLabel(aph, '', 'label-mark'), 'scene.aphelion'), { dy: 16 });
  const seasonDots = [0, 1, 2, 3].map((i) => {
    const d = makeDot(0.045, COLORS.blue);
    scene.add(d);
    Object.assign(tl(stage.addLabel(d, '', 'label-season'), 'season.' + i), { dy: -15 });
    return d;
  });
  const distLabel = stage.addLabel(new THREE.Vector3(), '', 'label-value');

  const state = { e: 0.0167, nu: 0, varpi: 283, eps: 23.44, iceNorth: 70, iceSouth: 66 };

  function radius(nuDeg, e) {
    return (A * (1 - e * e)) / (1 + e * Math.cos(THREE.MathUtils.degToRad(nuDeg)));
  }
  function posAt(nuDeg, e, out = new THREE.Vector3()) {
    const r = radius(nuDeg, e);
    const t = THREE.MathUtils.degToRad(nuDeg);
    return out.set(r * Math.cos(t), 0, -r * Math.sin(t));
  }

  function rebuildOrbit() {
    const pos = orbit.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      posAt((i / segs) * 360, state.e, v);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    posAt(0, state.e, peri.position);
    posAt(180, state.e, aph.position);
    seasonDots.forEach((d, k) => posAt(k * 90 - state.varpi, state.e, d.position));
  }

  function update() {
    posAt(state.nu, state.e, earth.group.position);
    const toSun = earth.group.position.clone().multiplyScalar(-1).normalize();
    earth.setSunDir(toSun);
    // axis horizontal component points at azimuth 270° − ϖ (see orbital.js conventions)
    earth.setAxis(axisDirection(state.eps, 270 - state.varpi));
    earth.setIce(state.iceNorth, state.iceSouth);
    const p = distLine.geometry.attributes.position;
    p.setXYZ(0, 0, 0, 0);
    p.setXYZ(1, earth.group.position.x, 0, earth.group.position.z);
    p.needsUpdate = true;
    distLine.computeLineDistances();
    distLabel.anchor.copy(earth.group.position).multiplyScalar(0.5);
    distLabel.dy = -13;
    distLabel.div.textContent = `${n((radius(state.nu, state.e) / A).toFixed(3))} AU`;
  }

  stage.onTick((dt) => { if (!REDUCED_MOTION) earth.rotate(dt, 0.6); });
  rebuildOrbit();
  update();

  return {
    stage,
    set(p) {
      const eChanged = p.e !== undefined && p.e !== state.e;
      const vChanged = p.varpi !== undefined && p.varpi !== state.varpi;
      Object.assign(state, p);
      if (eChanged || vChanged) rebuildOrbit();
      update();
    },
  };
}

// ---------------------------------------------------------------------------
export function buildTiltScene(el) {
  const stage = new Stage(el, { fov: 38, polar: [0.55, 2.3] });
  stage.fovFor = fovForAspect(38, 1.1);
  stage.lookAt(0, 1.7, 4.0);
  const scene = stage.scene;
  const R = 1.2;

  const earth = createEarth(R, { segments: 128 });
  scene.add(earth.group);
  const axis = makeAxisRod(R, 1.42);
  earth.group.add(axis);
  stage.addLabel(axis.userData.north, 'N', 'label-pole');
  stage.addLabel(axis.userData.south, 'S', 'label-pole');

  const rings = {
    equator: makeLatitudeRing(R * 1.003, 0, COLORS.ink, 0.5),
    tropicN: makeLatitudeRing(R * 1.003, 23.44, COLORS.gold, 0.35),
    tropicS: makeLatitudeRing(R * 1.003, -23.44, COLORS.gold, 0.35),
    arcticN: makeLatitudeRing(R * 1.003, 66.56, COLORS.gold, 0.7),
    arcticS: makeLatitudeRing(R * 1.003, -66.56, COLORS.gold, 0.7),
    iceN: makeLatitudeRing(R * 1.006, 70, COLORS.ice, 0.9),
    iceS: makeLatitudeRing(R * 1.006, -66, COLORS.ice, 0.9),
  };
  Object.values(rings).forEach((r) => earth.group.add(r));

  // label anchors ride on the rings, on the side facing the camera
  const anchor = (lat, azimuthDeg = 90) => {
    const o = new THREE.Object3D();
    const l = THREE.MathUtils.degToRad(lat), a = THREE.MathUtils.degToRad(azimuthDeg);
    o.position.set(R * Math.cos(l) * Math.cos(a), R * Math.sin(l), R * Math.cos(l) * Math.sin(a));
    earth.group.add(o);
    return o;
  };
  const anchors = { equator: anchor(0, 60), arctic: anchor(66.56, 40), ice: anchor(70, 130), tropic: anchor(23.44, 60) };
  const labels = {
    equator: tl(stage.addLabel(anchors.equator, '', 'label-ring'), 'scene.equator'),
    tropic: stage.addLabel(anchors.tropic, 'Tropic of Cancer 23.4°', 'label-ring'),
    arctic: stage.addLabel(anchors.arctic, 'Arctic Circle 66.6°', 'label-ring label-gold'),
    ice: stage.addLabel(anchors.ice, 'Ice edge 70°', 'label-ring label-ice'),
  };
  labels.equator.dy = 12;
  labels.arctic.dy = -12;
  labels.arctic.dx = 30;
  labels.ice.dy = -12;
  labels.ice.dx = -30;
  labels.tropic.dy = -10;

  scene.add(makePlaneDisc(R * 1.9, 0.06));

  const sunDir = new THREE.Vector3(1, 0.1, 0.32).normalize();
  earth.setSunDir(sunDir);
  const glow = makeGlowSprite(8, '#ffcf7a', 0.9);
  glow.position.copy(sunDir).multiplyScalar(6.5);
  scene.add(glow);
  const sunLabel = tl(stage.addLabel(new THREE.Vector3().copy(sunDir).multiplyScalar(2.6), '', 'label-sun'), 'scene.sunlight');
  sunLabel.dy = -14;

  const state = { eps: 23.44, lambda: 90, iceNorth: 70, iceSouth: 66 };
  const sunAz = azimuthOf(sunDir);

  function update() {
    earth.setAxis(axisDirection(state.eps, sunAz + (state.lambda - 90)));
    earth.setIce(state.iceNorth, state.iceSouth);
    rings.tropicN.userData.update(state.eps);
    rings.tropicS.userData.update(-state.eps);
    rings.arcticN.userData.update(90 - state.eps);
    rings.arcticS.userData.update(-(90 - state.eps));
    rings.iceN.userData.update(state.iceNorth);
    rings.iceS.userData.update(-state.iceSouth);
    const setAnchor = (o, lat, az) => {
      const l = THREE.MathUtils.degToRad(lat), a = THREE.MathUtils.degToRad(az);
      o.position.set(R * Math.cos(l) * Math.cos(a), R * Math.sin(l), R * Math.cos(l) * Math.sin(a));
    };
    setAnchor(anchors.arctic, 90 - state.eps, 40);
    setAnchor(anchors.tropic, state.eps, 60);
    setAnchor(anchors.ice, state.iceNorth, 130);
    labels.arctic.div.textContent = `${t('scene.arctic')} ${n((90 - state.eps).toFixed(1))}°`;
    labels.tropic.div.textContent = `${t('scene.tropic')} ${n(state.eps.toFixed(1))}°`;
    labels.ice.div.textContent = state.iceNorth >= 89.5 ? t('scene.iceFree') : `${t('scene.iceEdge')} ${state.iceNorth.toFixed(0)}°N`;
    rings.iceN.visible = state.iceNorth < 89.5;
  }
  stage.onTick((dt) => { if (!REDUCED_MOTION) earth.rotate(dt, 0.1); });
  onLanguageChange(update);
  update();
  return {
    stage,
    set(p) { Object.assign(state, p); update(); },
  };
}

// ---------------------------------------------------------------------------
export function buildWobbleScene(el) {
  const stage = new Stage(el, { fov: 40, polar: [0.5, 1.75] });
  stage.fovFor = fovForAspect(40);
  stage.lookAt(0.4, 1.9, 4.8, 0, 0.45, 0);
  const scene = stage.scene;
  const R = 0.85;
  const L = R * 2.0;

  const earth = createEarth(R, { segments: 96 });
  scene.add(earth.group);
  const axis = makeAxisRod(R, 2.0);
  earth.group.add(axis);
  stage.addLabel(axis.userData.north, 'N', 'label-pole');
  earth.group.add(makeLatitudeRing(R * 1.003, 0, COLORS.ink, 0.45));

  scene.add(makePlaneDisc(R * 2.3, 0.06));

  // the precession cone: ring traced by the pole, plus a faint cone surface
  const coneGroup = new THREE.Group();
  scene.add(coneGroup);
  let coneMesh = null;
  const ring = makeLatitudeRing(1, 0, COLORS.rose, 0.75);
  coneGroup.add(ring);
  const upright = makeLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, L * 1.05, 0)], COLORS.faint, 0.6, true);
  scene.add(upright);
  Object.assign(tl(stage.addLabel(new THREE.Vector3(0, L * 1.05, 0), '', 'label-ring'), 'scene.perpendicular'), { dy: -12 });

  function buildCone(eps) {
    const e = THREE.MathUtils.degToRad(eps);
    const r = L * Math.sin(e), h = L * Math.cos(e);
    if (coneMesh) { coneGroup.remove(coneMesh); coneMesh.geometry.dispose(); }
    coneMesh = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 64, 1, true),
      new THREE.MeshBasicMaterial({ color: COLORS.rose, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })
    );
    coneMesh.rotation.x = Math.PI;
    coneMesh.position.y = h / 2;
    coneGroup.add(coneMesh);
    const pos = ring.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const a = (i / (pos.count - 1)) * Math.PI * 2;
      pos.setXYZ(i, r * Math.cos(a), h, r * Math.sin(a));
    }
    pos.needsUpdate = true;
  }

  const sunPos = new THREE.Vector3(-4.0, 1.9, -7.0);
  const sun = makeSun(0.55, { glow: 7 });
  sun.position.copy(sunPos);
  scene.add(sun);
  Object.assign(tl(stage.addLabel(sun, '', 'label-sun'), 'scene.sunPerihelion'), { dy: 40 });
  const sunDir = sunPos.clone().normalize();
  earth.setSunDir(sunDir);
  const sunAz = azimuthOf(sunDir);
  const toSun = makeLine([new THREE.Vector3(), sunDir.clone().multiplyScalar(2.6)], COLORS.gold, 0.35, true);
  scene.add(toSun);

  const state = { eps: 23.44, varpi: 283, iceNorth: 70, iceSouth: 66 };
  let builtEps = null;
  function update() {
    if (builtEps !== state.eps) { buildCone(state.eps); builtEps = state.eps; }
    earth.setAxis(axisDirection(state.eps, sunAz + (90 - state.varpi)));
    earth.setIce(state.iceNorth, state.iceSouth);
  }
  stage.onTick((dt) => { if (!REDUCED_MOTION) earth.rotate(dt, 0.25); });
  update();
  return {
    stage,
    set(p) { Object.assign(state, p); update(); },
  };
}

// ---------------------------------------------------------------------------
export function buildTimelineScene(el) {
  const stage = new Stage(el, { fov: 38, polar: [0.6, 2.2] });
  stage.fovFor = fovForAspect(38, 1.1);
  stage.lookAt(0, 1.8, 4.1);
  const scene = stage.scene;
  const R = 1.25;

  const earth = createEarth(R, { segments: 128 });
  scene.add(earth.group);
  const axis = makeAxisRod(R, 1.4);
  earth.group.add(axis);
  stage.addLabel(axis.userData.north, 'N', 'label-pole');
  const iceN = makeLatitudeRing(R * 1.006, 70, COLORS.ice, 0.8);
  const iceS = makeLatitudeRing(R * 1.006, -66, COLORS.ice, 0.8);
  earth.group.add(iceN, iceS);
  scene.add(makePlaneDisc(R * 1.9, 0.05));

  const sunDir = new THREE.Vector3(1, 0.35, 0.3).normalize();
  earth.setSunDir(sunDir);
  const glow = makeGlowSprite(11, '#ffcf7a', 0.95);
  glow.position.copy(sunDir).multiplyScalar(4.6);
  scene.add(glow);
  const sunAz = azimuthOf(sunDir);
  const sunLabel = tl(stage.addLabel(new THREE.Vector3().copy(sunDir).multiplyScalar(2.5), '', 'label-sun'), 'scene.midsummerSun');
  sunLabel.dy = -14;

  const state = { eps: 23.44, iceNorth: 70, iceSouth: 66, sunStrength: 1 };
  function update() {
    earth.setAxis(axisDirection(state.eps, sunAz));
    earth.setIce(state.iceNorth, state.iceSouth);
    iceN.userData.update(state.iceNorth);
    iceS.userData.update(-state.iceSouth);
    iceN.visible = state.iceNorth < 89.5;
    iceS.visible = state.iceSouth < 89.5;
    glow.scale.setScalar(11 * state.sunStrength);
  }
  stage.onTick((dt) => { if (!REDUCED_MOTION) earth.rotate(dt, 0.1); });
  update();
  return {
    stage,
    set(p) { Object.assign(state, p); update(); },
  };
}
