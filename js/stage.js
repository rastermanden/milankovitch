/**
 * One WebGL context, many on-page viewports. A full-window canvas sits behind
 * the page; each Stage owns a placeholder element and is rendered into the
 * matching scissor rectangle only while that element is on screen.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer = null;
const stages = [];
const clock = new THREE.Clock();

export function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

export class Stage {
  constructor(el, { fov = 42, near = 0.1, far = 200, controls = true, autoRotate = 0, polar = [0.2, Math.PI - 0.2] } = {}) {
    this.el = el;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.labels = [];
    this.tickers = [];
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'labels';
    el.appendChild(this.labelLayer);
    this.controls = null;
    if (controls) {
      const c = new OrbitControls(this.camera, el);
      c.enableZoom = false;
      c.enablePan = false;
      c.enableDamping = true;
      c.dampingFactor = 0.08;
      c.rotateSpeed = 0.55;
      c.minPolarAngle = polar[0];
      c.maxPolarAngle = polar[1];
      c.autoRotate = autoRotate !== 0 && !REDUCED_MOTION;
      c.autoRotateSpeed = autoRotate;
      // OrbitControls sets touch-action:none; allow vertical page scrolling on touch.
      el.style.touchAction = 'pan-y';
      this.controls = c;
    }
    stages.push(this);
  }

  lookAt(x, y, z, tx = 0, ty = 0, tz = 0) {
    this.camera.position.set(x, y, z);
    if (this.controls) {
      this.controls.target.set(tx, ty, tz);
      this.controls.update();
    } else this.camera.lookAt(tx, ty, tz);
  }

  /** Attach an HTML label that follows a 3D anchor (Object3D or Vector3). */
  addLabel(anchor, text, className = '') {
    const div = document.createElement('div');
    div.className = 'label ' + className;
    div.textContent = text;
    this.labelLayer.appendChild(div);
    const label = { anchor, div, offset: new THREE.Vector3(), dx: 0, dy: 0 };
    this.labels.push(label);
    return label;
  }

  onTick(fn) { this.tickers.push(fn); }

  visibleRect() {
    const r = this.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
    if (r.width < 2 || r.height < 2) return null;
    return r;
  }

  render(rect, dt) {
    const w = rect.width, h = rect.height;
    if (this.camera.aspect !== w / h || this._lastW !== w) {
      this._lastW = w;
      this.camera.aspect = w / h;
      if (this.fovFor) this.camera.fov = this.fovFor(w / h, w);
      this.camera.updateProjectionMatrix();
    }
    for (const fn of this.tickers) fn(dt);
    if (this.controls) this.controls.update();
    const bottom = window.innerHeight - rect.bottom;
    renderer.setViewport(rect.left, bottom, w, h);
    renderer.setScissor(rect.left, bottom, w, h);
    renderer.render(this.scene, this.camera);
    this.updateLabels(w, h);
  }

  updateLabels(w, h) {
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      if (l.anchor.isObject3D) l.anchor.getWorldPosition(v); else v.copy(l.anchor);
      v.add(l.offset);
      v.project(this.camera);
      const behind = v.z > 1;
      const x = (v.x + 1) / 2 * w + l.dx, y = (1 - v.y) / 2 * h + l.dy;
      l.div.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      l.div.style.opacity = behind || x < -20 || x > w + 20 || y < -20 || y > h + 20 ? '0' : '1';
    }
  }
}

let running = false;
export function startLoop() {
  if (running) return;
  running = true;
  getRenderer();
  const frame = () => {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const w = window.innerWidth, h = window.innerHeight;
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const s of stages) {
      const rect = s.visibleRect();
      if (rect) s.render(rect, dt);
    }
  };
  frame();
}

// ---------- shared helpers ------------------------------------------------
let glowTex = null;
function getGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,240,200,0.85)');
  grad.addColorStop(0.45, 'rgba(255,200,110,0.22)');
  grad.addColorStop(1, 'rgba(255,180,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export function makeSun(radius, { glow = 6, color = '#ffe2a0' } = {}) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.MeshBasicMaterial({ color }));
  g.add(core);
  const sm = new THREE.SpriteMaterial({ map: getGlowTexture(), color: '#ffcf7a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(sm);
  sprite.scale.setScalar(radius * glow);
  g.add(sprite);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTexture(), color: '#ffb35a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(radius * glow * 2.2);
  g.add(halo);
  g.userData.sprite = sprite;
  g.userData.halo = halo;
  return g;
}

export function makeGlowSprite(scale, color = '#ffcf7a', opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale);
  return s;
}

/** A thin latitude ring around a unit-axis (+Y) body. */
export function makeLatitudeRing(radius, latDeg, color, opacity = 0.6, segments = 128) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const r = radius * Math.cos(lat), y = radius * Math.sin(lat);
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  line.userData.update = (newLat) => {
    const l = THREE.MathUtils.degToRad(newLat);
    const rr = radius * Math.cos(l), yy = radius * Math.sin(l);
    const pos = geo.attributes.position;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pos.setXYZ(i, rr * Math.cos(a), yy, rr * Math.sin(a));
    }
    pos.needsUpdate = true;
  };
  return line;
}

/** Rotation axis rod through the poles. */
export function makeAxisRod(radius, length = 1.6, color = '#f3b64a') {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(radius * 0.012, radius * 0.012, radius * length * 2, 12);
  const rod = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  g.add(rod);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.045, radius * 0.14, 16), new THREE.MeshBasicMaterial({ color }));
  tip.position.y = radius * length;
  g.add(tip);
  const north = new THREE.Object3D();
  north.position.y = radius * length + radius * 0.1;
  g.add(north);
  const south = new THREE.Object3D();
  south.position.y = -radius * length - radius * 0.05;
  g.add(south);
  g.userData.north = north;
  g.userData.south = south;
  return g;
}

export function makeDot(radius, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshBasicMaterial({ color }));
}

export function makeLine(points, color, opacity = 0.5, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.12, gapSize: 0.08 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}
