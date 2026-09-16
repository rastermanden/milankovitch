/**
 * Procedural Earth: a seamless noise-generated map, a shader that paints
 * dynamic polar ice caps, day/night lighting and an atmospheric rim.
 */
import * as THREE from 'three';

// ---------- seamless 3D value noise -------------------------------------
function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const lat = (x, y, z) => perm[(perm[(perm[x & 255] + y) & 255] + z) & 255] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const c000 = lat(xi, yi, zi), c100 = lat(xi + 1, yi, zi);
    const c010 = lat(xi, yi + 1, zi), c110 = lat(xi + 1, yi + 1, zi);
    const c001 = lat(xi, yi, zi + 1), c101 = lat(xi + 1, yi, zi + 1);
    const c011 = lat(xi, yi + 1, zi + 1), c111 = lat(xi + 1, yi + 1, zi + 1);
    const x00 = c000 + (c100 - c000) * xf, x10 = c010 + (c110 - c010) * xf;
    const x01 = c001 + (c101 - c001) * xf, x11 = c011 + (c111 - c011) * xf;
    const y0 = x00 + (x10 - x00) * yf, y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  }
  function fbm(x, y, z, oct = 5, gain = 0.5, lac = 2.05) {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += a * noise(x * f + i * 7.3, y * f + i * 3.1, z * f + i * 11.7);
      norm += a;
      a *= gain;
      f *= lac;
    }
    return sum / norm;
  }
  return { noise, fbm };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

const OCEAN_DEEP = [12, 44, 84];
const OCEAN_SHELF = [24, 92, 140];
const LAND_LOW = [86, 128, 74];
const LAND_MID = [140, 128, 84];
const LAND_HIGH = [118, 104, 92];
const LAND_PEAK = [176, 170, 164];
const DESERT = [196, 168, 108];
const TUNDRA = [150, 150, 130];

/** Generates an equirectangular colour map. Returns a CanvasTexture. */
export function generateEarthTexture(width = 1024, seed = 7) {
  const height = width / 2;
  const { fbm } = makeNoise(seed);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const data = img.data;

  // First pass: height field, to pick a sea level that gives ~29% land.
  const hf = new Float32Array(width * height);
  const sample = [];
  for (let j = 0; j < height; j++) {
    const lat = (0.5 - j / height) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < width; i++) {
      const lon = (i / width) * Math.PI * 2;
      const x = cl * Math.cos(lon), y = sl, z = cl * Math.sin(lon);
      const w = fbm(x * 1.4 + 3.2, y * 1.4, z * 1.4, 3);
      const h = fbm(x * 2.1 + w * 0.7, y * 2.1 + w * 0.7, z * 2.1, 6);
      hf[j * width + i] = h;
      if ((i & 7) === 0 && (j & 7) === 0) sample.push(h);
    }
  }
  sample.sort((a, b) => a - b);
  const seaLevel = sample[Math.floor(sample.length * 0.71)];
  const maxH = sample[sample.length - 1];

  for (let j = 0; j < height; j++) {
    const latDeg = (0.5 - j / height) * 180;
    const absLat = Math.abs(latDeg);
    for (let i = 0; i < width; i++) {
      const idx = j * width + i;
      const h = hf[idx];
      let c;
      if (h < seaLevel) {
        const depth = clamp01((seaLevel - h) / 0.09);
        c = mix3(OCEAN_SHELF, OCEAN_DEEP, Math.pow(depth, 0.6));
      } else {
        const rel = clamp01((h - seaLevel) / Math.max(1e-4, maxH - seaLevel));
        if (rel < 0.35) c = mix3(LAND_LOW, LAND_MID, rel / 0.35);
        else if (rel < 0.7) c = mix3(LAND_MID, LAND_HIGH, (rel - 0.35) / 0.35);
        else c = mix3(LAND_HIGH, LAND_PEAK, (rel - 0.7) / 0.3);
        // dry subtropical belts
        const desert = Math.exp(-Math.pow((absLat - 23) / 9, 2)) * (0.55 + 0.45 * ((hf[(j * width + ((i + 137) % width))]) - 0.4) * 3);
        c = mix3(c, DESERT, clamp01(desert) * 0.8);
        // cold high latitudes
        const cold = clamp01((absLat - 55) / 20);
        c = mix3(c, TUNDRA, cold * 0.7);
      }
      const o = idx * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft cloud layer, alpha only. */
export function generateCloudTexture(width = 768, seed = 21) {
  const height = width / 2;
  const { fbm } = makeNoise(seed);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const data = img.data;
  for (let j = 0; j < height; j++) {
    const lat = (0.5 - j / height) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < width; i++) {
      const lon = (i / width) * Math.PI * 2;
      const x = cl * Math.cos(lon), y = sl, z = cl * Math.sin(lon);
      const n = fbm(x * 3.3, y * 3.3 + 9, z * 3.3, 5, 0.55);
      const band = 0.75 + 0.25 * Math.cos(lat * 6); // storm tracks
      const a = clamp01((n - 0.47) * 3.2) * band;
      const o = (j * width + i) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255;
      data[o + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- shaders ------------------------------------------------------
const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vLocalNormal = normal;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  uniform vec3 sunDir;
  uniform float iceNorth;   // radians of latitude
  uniform float iceSouth;
  uniform vec3 iceColor;
  uniform vec3 atmoColor;
  uniform float nightLevel;
  varying vec2 vUv;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 base = texture2D(map, vUv).rgb;
    vec3 n = normalize(vLocalNormal);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);
    // ragged, slightly noisy ice margin
    float rag = (vnoise(vec2(lon * 4.0, lat * 6.0)) - 0.5) * 0.05
              + (vnoise(vec2(lon * 14.0, lat * 18.0)) - 0.5) * 0.02;
    float edgeN = smoothstep(iceNorth - 0.012, iceNorth + 0.012, lat + rag);
    float edgeS = smoothstep(iceSouth - 0.012, iceSouth + 0.012, -lat + rag);
    float ice = max(edgeN, edgeS);
    // a faint blue-white crust texture so ice is not flat
    float crust = 0.9 + 0.1 * vnoise(vec2(lon * 40.0, lat * 40.0));
    vec3 col = mix(base, iceColor * crust, ice);

    vec3 wn = normalize(vWorldNormal);
    float ndl = dot(wn, sunDir);
    float day = smoothstep(-0.08, 0.2, ndl);
    float diff = max(ndl, 0.0);

    // ocean glint
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 h = normalize(sunDir + viewDir);
    float ocean = step(base.g + 0.02, base.b) * (1.0 - ice);
    float spec = pow(max(dot(wn, h), 0.0), 60.0) * 0.35 * ocean;

    vec3 lit = col * (0.06 + 1.05 * diff) + spec * vec3(1.0, 0.95, 0.85);
    vec3 night = col * nightLevel + vec3(0.02, 0.03, 0.06);
    vec3 shade = mix(night, lit, day);

    float rim = pow(1.0 - max(dot(viewDir, wn), 0.0), 3.2);
    shade += atmoColor * rim * (0.25 + 0.75 * day);
    gl_FragColor = vec4(shade, 1.0);
    #include <colorspace_fragment>
  }
`;

const CLOUD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const CLOUD_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  uniform vec3 sunDir;
  uniform float opacity;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float a = texture2D(map, vUv).a * opacity;
    float ndl = dot(normalize(vWorldNormal), sunDir);
    float day = smoothstep(-0.1, 0.25, ndl);
    vec3 c = vec3(0.98, 0.99, 1.0) * (0.12 + 0.95 * max(ndl, 0.0));
    gl_FragColor = vec4(c, a * (0.25 + 0.75 * day));
    #include <colorspace_fragment>
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const ATMO_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 glowColor;
  uniform vec3 sunDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.6);
    float day = 0.35 + 0.65 * smoothstep(-0.3, 0.4, dot(normalize(vNormal), sunDir));
    gl_FragColor = vec4(glowColor, rim * 0.85 * day);
    #include <colorspace_fragment>
  }
`;

let sharedMap = null;
let sharedClouds = null;
export function getEarthTextures() {
  if (!sharedMap) {
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
    sharedMap = generateEarthTexture(narrow ? 768 : 1024);
    sharedClouds = generateCloudTexture(narrow ? 512 : 768);
  }
  return { map: sharedMap, clouds: sharedClouds };
}

/**
 * Builds an Earth group.
 *   group           – place / orient this (its +Y is the rotation axis)
 *   spin            – child group that rotates daily
 *   setSunDir(v)    – world-space unit vector towards the Sun
 *   setIce(latN, latS) – ice cap edge latitudes in degrees
 */
export function createEarth(radius = 1, { segments = 96, clouds = true, atmosphere = true } = {}) {
  const { map, clouds: cloudMap } = getEarthTextures();
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  const uniforms = {
    map: { value: map },
    sunDir: { value: new THREE.Vector3(1, 0, 0) },
    iceNorth: { value: THREE.MathUtils.degToRad(70) },
    iceSouth: { value: THREE.MathUtils.degToRad(66) },
    iceColor: { value: new THREE.Color('#e9f6ff') },
    atmoColor: { value: new THREE.Color('#6fb4ff') },
    nightLevel: { value: 0.05 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments / 2), material);
  spin.add(mesh);

  let cloudMesh = null;
  if (clouds) {
    const cu = { map: { value: cloudMap }, sunDir: uniforms.sunDir, opacity: { value: 0.85 } };
    const cm = new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, uniforms: cu, transparent: true, depthWrite: false });
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, segments / 2, segments / 4), cm);
    spin.add(cloudMesh);
  }

  if (atmosphere) {
    const au = { glowColor: { value: new THREE.Color('#5fa9ff') }, sunDir: uniforms.sunDir };
    const am = new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: au, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, segments / 2, segments / 4), am);
    group.add(atmo);
  }

  return {
    group,
    spin,
    mesh,
    radius,
    setSunDir(v) { uniforms.sunDir.value.copy(v).normalize(); },
    setIce(latN, latS) {
      uniforms.iceNorth.value = THREE.MathUtils.degToRad(latN);
      uniforms.iceSouth.value = THREE.MathUtils.degToRad(latS);
    },
    /** Point the rotation axis at a world-space direction. */
    setAxis(dir) {
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    },
    rotate(dt, speed = 0.12) {
      spin.rotation.y += dt * speed;
      if (cloudMesh) cloudMesh.rotation.y += dt * speed * 0.15;
    },
  };
}

/** Axis direction for tilt eps (deg) whose horizontal component points at azimuth theta (deg, CCW seen from +Y, 0 = +X). */
export function axisDirection(epsDeg, thetaDeg) {
  const e = THREE.MathUtils.degToRad(epsDeg);
  const t = THREE.MathUtils.degToRad(thetaDeg);
  return new THREE.Vector3(Math.sin(e) * Math.cos(t), Math.cos(e), -Math.sin(e) * Math.sin(t));
}
