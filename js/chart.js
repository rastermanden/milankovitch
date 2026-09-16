/**
 * Small-multiple time-series strip drawn on a 2D canvas: one panel per
 * quantity, a shared time axis, a scrub marker, pointer scrubbing.
 */
import { t, n } from './i18n.js';

const PANELS = [
  { key: 'e', title: 'chart.e', color: '#f3b64a', min: 0, max: 0.06, fmt: (v) => v.toFixed(3) },
  { key: 'eps', title: 'chart.eps', color: '#5aa8ff', min: 22, max: 24.6, fmt: (v) => v.toFixed(2) + '°' },
  { key: 'prec', title: 'chart.prec', color: '#ef86b0', min: -0.06, max: 0.06, fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(3), zero: true },
  { key: 'q65', title: 'chart.q65', color: '#ff8d5c', min: 420, max: 580, fmt: (v) => v.toFixed(0) + ' W/m²' },
  { key: 'albedo', title: 'chart.albedo', color: '#b9e6ff', min: 0.27, max: 0.31, fmt: (v) => v.toFixed(3), fill: true },
  { key: 'dT', title: 'chart.dT', color: '#ffd98a', min: -1.6, max: 0.8, fmt: (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' °C', zero: true },
];

// approximate interglacial peaks in the marine isotope record, kyr before present
const INTERGLACIALS = [0, -125, -240, -330, -410, -500, -600, -700, -785];

export class TimeChart {
  constructor(canvas, series, { onScrub } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.series = series;
    this.t = 0;
    this.onScrub = onScrub;
    this.tMin = series[0].t;
    this.tMax = series[series.length - 1].t;
    this.pad = { left: 44, right: 14, top: 26, bottom: 24 };
    this.styles = getComputedStyle(document.documentElement);
    this._bind();
    this.resize();
  }

  _bind() {
    const c = this.canvas;
    let down = false;
    const scrub = (ev) => {
      const r = c.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const t = this.tMin + ((x - this.pad.left) / (r.width - this.pad.left - this.pad.right)) * (this.tMax - this.tMin);
      const clamped = Math.max(this.tMin, Math.min(this.tMax, t));
      if (this.onScrub) this.onScrub(clamped);
    };
    c.addEventListener('pointerdown', (ev) => { down = true; c.setPointerCapture(ev.pointerId); scrub(ev); });
    c.addEventListener('pointermove', (ev) => { if (down) scrub(ev); });
    const up = () => { down = false; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('keydown', (ev) => {
      const step = ev.shiftKey ? 10 : 1;
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); this.onScrub && this.onScrub(Math.max(this.tMin, this.t - step)); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); this.onScrub && this.onScrub(Math.min(this.tMax, this.t + step)); }
    });
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  setTime(t) {
    this.t = t;
    this.draw();
  }

  x(t) {
    return this.pad.left + ((t - this.tMin) / (this.tMax - this.tMin)) * (this.w - this.pad.left - this.pad.right);
  }

  draw() {
    const ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    const css = (n) => this.styles.getPropertyValue(n).trim();
    const ink = css('--ink-2') || '#aab3d1';
    const muted = css('--ink-3') || '#7e88aa';
    const grid = css('--line') || '#263052';
    const font = css('--font-mono') || 'ui-monospace, monospace';
    const sans = css('--font-body') || 'system-ui, sans-serif';
    ctx.clearRect(0, 0, w, h);

    const count = PANELS.length;
    const gap = 14;
    const plotH = (h - this.pad.top - this.pad.bottom - gap * (count - 1)) / count;
    const x0 = this.pad.left, x1 = w - this.pad.right;

    // interglacial ticks along the top
    ctx.font = `10px ${sans}`;
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.fillText(t('chart.peaks'), x0, 10);
    for (const t of INTERGLACIALS) {
      const x = this.x(t);
      ctx.fillStyle = muted;
      ctx.beginPath();
      ctx.moveTo(x, this.pad.top - 8);
      ctx.lineTo(x - 3.5, this.pad.top - 2);
      ctx.lineTo(x + 3.5, this.pad.top - 2);
      ctx.closePath();
      ctx.fill();
    }

    PANELS.forEach((p, i) => {
      const y0 = this.pad.top + i * (plotH + gap), y1 = y0 + plotH;
      const yOf = (v) => y1 - ((v - p.min) / (p.max - p.min)) * plotH;
      // frame + gridlines
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5);
      ctx.stroke();
      if (p.zero) {
        ctx.beginPath();
        ctx.moveTo(x0, yOf(0) + 0.5); ctx.lineTo(x1, yOf(0) + 0.5);
        ctx.stroke();
      }
      // "now" line
      ctx.strokeStyle = muted;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(this.x(0) + 0.5, y0); ctx.lineTo(this.x(0) + 0.5, y1);
      ctx.stroke();
      ctx.setLineDash([]);

      // series
      ctx.beginPath();
      this.series.forEach((s, k) => {
        const x = this.x(s.t), y = yOf(Math.max(p.min, Math.min(p.max, s[p.key])));
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      if (p.fill) {
        ctx.save();
        ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        this.series.forEach((s, k) => {
          const x = this.x(s.t), y = yOf(s[p.key]);
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
      }
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // axis extremes
      ctx.fillStyle = muted;
      ctx.font = `10px ${font}`;
      ctx.textAlign = 'right';
      ctx.fillText(n(p.fmt(p.max).replace(' W/m²', '').replace(' °C', '')), x0 - 6, y0 + 9);
      ctx.fillText(n(p.fmt(p.min).replace(' W/m²', '').replace(' °C', '')), x0 - 6, y1);

      // title
      ctx.fillStyle = ink;
      ctx.font = `600 11px ${sans}`;
      ctx.textAlign = 'left';
      ctx.fillText(t(p.title), x0 + 6, y0 + 11);

      // marker + current value
      const cur = this.valueAt(p.key);
      const mx = this.x(this.t), my = yOf(Math.max(p.min, Math.min(p.max, cur)));
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(mx + 0.5, y0); ctx.lineTo(mx + 0.5, y1);
      ctx.stroke();
      ctx.fillStyle = css('--bg') || '#0a0e1c';
      ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
      const txt = n(p.fmt(cur));
      ctx.font = `11px ${font}`;
      const tw = ctx.measureText(txt).width;
      const right = mx + 10 + tw > x1;
      ctx.textAlign = right ? 'right' : 'left';
      const tx = right ? mx - 10 : mx + 10;
      ctx.fillStyle = css('--bg') || '#0a0e1c';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(right ? tx - tw - 5 : tx - 5, my - 8, tw + 10, 16, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.fillText(txt, tx, my + 4);
    });

    // time axis
    ctx.fillStyle = muted;
    ctx.font = `10px ${font}`;
    ctx.textAlign = 'center';
    const nowLabel = t('time.now'), unitLabel = t('chart.unit');
    for (let k = Math.ceil(this.tMin / 100) * 100; k <= this.tMax; k += 100) {
      const x = this.x(k);
      ctx.fillText(k === 0 ? nowLabel : (k > 0 ? '+' : '') + k, x, h - 8);
    }
    ctx.textAlign = 'right';
    ctx.fillText(unitLabel, x1, h - 8 - 12);
  }

  valueAt(key) {
    const s = this.series;
    const f = ((this.t - this.tMin) / (this.tMax - this.tMin)) * (s.length - 1);
    const i = Math.max(0, Math.min(s.length - 2, Math.floor(f)));
    const u = f - i;
    return s[i][key] * (1 - u) + s[i + 1][key] * u;
  }
}
