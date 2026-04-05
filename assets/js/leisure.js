import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, clamp, lerp, setMeta, smoothScrollForHashes } from './utils.js';

const TAU = Math.PI * 2;
const STORAGE_KEY = 'haoyu-rest-best';
const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 }
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
  const mag = Math.hypot(x, y);
  if (mag < 1e-6) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}

function circleHit(a, b, extra = 0) {
  const r = a.r + b.r + extra;
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawSphere(ctx, x, y, r, fillA, fillB, alpha = 1) {
  const gradient = ctx.createRadialGradient(x - r * 0.34, y - r * 0.36, r * 0.16, x, y, r);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.28, fillA);
  gradient.addColorStop(1, fillB);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawGlow(ctx, x, y, r, color, alpha = 0.16) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue('--game-bg').trim() || 'rgba(4, 8, 18, 0.92)',
    grid: styles.getPropertyValue('--game-grid').trim() || 'rgba(143, 243, 255, 0.08)',
    ink: styles.getPropertyValue('--game-ink').trim() || 'rgba(245, 248, 255, 0.95)',
    soft: styles.getPropertyValue('--game-soft').trim() || 'rgba(194, 208, 238, 0.45)',
    accent: styles.getPropertyValue('--game-accent').trim() || '#8ff3ff',
    accent2: styles.getPropertyValue('--game-accent-2').trim() || '#88a4ff',
    good: styles.getPropertyValue('--game-good').trim() || '#6ee0c6',
    warn: styles.getPropertyValue('--game-warn').trim() || '#ff8ea4'
  };
}

function drawBackdrop(ctx, engine, tintA = null, tintB = null) {
  const { width, height, palette, time } = engine;
  const bgA = tintA || palette.accent;
  const bgB = tintB || palette.accent2;
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.bg);
  gradient.addColorStop(1, 'rgba(3, 7, 16, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = bgA;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.18, Math.max(width, height) * 0.28, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = bgB;
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.76, Math.max(width, height) * 0.24, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = engine.palette.grid;
  ctx.globalAlpha = 0.46;
  ctx.lineWidth = 1;
  const drift = Math.sin(time * 0.00012) * 12;
  for (let x = -44; x < width + 44; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, height);
    ctx.stroke();
  }
  for (let y = 0; y < height + 40; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function loadBestMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBestMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

class RestEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readPalette();
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.time = 0;
    this.lastTime = 0;
    this.pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, active: false };
    this.keys = new Set();
    this.bestMap = loadBestMap();
    this.mode = null;
    this.modeId = '';
    this.modeMeta = null;
    this.score = 0;
    this.best = 0;
    this.rafId = 0;
    this.metricsText = '';
    this.message = '';
    this.messageTimer = 0;
    this.bindEvents();
    this.resize();
  }

  bindEvents() {
    const toLocal = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (this.width / Math.max(1, rect.width)),
        y: (event.clientY - rect.top) * (this.height / Math.max(1, rect.height))
      };
    };

    this.canvas.addEventListener('pointermove', (event) => {
      const point = toLocal(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.active = true;
      if (this.mode?.pointerMove) this.mode.pointerMove(point, this);
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      const point = toLocal(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.down = true;
      this.pointer.justDown = true;
      this.pointer.active = true;
      if (this.mode?.pointerDown) this.mode.pointerDown(point, this);
      this.canvas.setPointerCapture?.(event.pointerId);
    });

    this.canvas.addEventListener('pointerup', (event) => {
      const point = toLocal(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.down = false;
      this.pointer.justUp = true;
      if (this.mode?.pointerUp) this.mode.pointerUp(point, this);
      this.canvas.releasePointerCapture?.(event.pointerId);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.down = false;
      this.pointer.active = false;
    });

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
        event.preventDefault();
      }
      this.keys.add(key);
      if (this.mode?.keyDown) this.mode.keyDown(key, this);
    });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      this.keys.delete(key);
      if (this.mode?.keyUp) this.mode.keyUp(key, this);
    });

    window.addEventListener('resize', () => this.resize());
    const observer = new MutationObserver(() => {
      this.palette = readPalette();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });
  }

  resize() {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 1.8);
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.mode?.resize) this.mode.resize(this);
  }

  setMode(id) {
    const modeMeta = leisureModes.find((item) => item.id === id) || leisureModes[0];
    const factory = MODE_FACTORIES[modeMeta.id] || MODE_FACTORIES[leisureModes[0].id];
    this.modeMeta = modeMeta;
    this.modeId = modeMeta.id;
    this.score = 0;
    this.best = Number(this.bestMap[this.modeId] || 0);
    this.metricsText = '';
    this.message = '';
    this.messageTimer = 0;
    this.mode = factory(this);
    updateHud(modeMeta, this);
  }

  setScore(value) {
    this.score = Math.max(0, Math.round(value));
    if (this.score > this.best) {
      this.best = this.score;
      this.bestMap[this.modeId] = this.best;
      saveBestMap(this.bestMap);
    }
  }

  addScore(delta) {
    this.setScore(this.score + delta);
  }

  setMessage(text, seconds = 1.6) {
    this.message = text;
    this.messageTimer = seconds;
  }

  loop = (timestamp) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = clamp((timestamp - this.lastTime) / 1000, 0.008, 0.032);
    this.lastTime = timestamp;
    this.time = timestamp;
    this.palette = readPalette();
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }
    if (this.mode?.update) this.mode.update(dt, this);
    if (this.mode?.draw) this.mode.draw(this.ctx, this);
    this.drawOverlay();
    this.pointer.justDown = false;
    this.pointer.justUp = false;
    updateScoreHud(this);
    this.rafId = requestAnimationFrame(this.loop);
  };

  drawOverlay() {
    if (!this.metricsText && !this.message) return;
    const ctx = this.ctx;
    const lines = [this.metricsText, this.message].filter(Boolean);
    const width = Math.min(460, this.width - 30);
    const lineHeight = 16;
    const height = 16 + lines.length * lineHeight;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(4, 8, 18, 0.56)';
    roundRect(ctx, 14, this.height - height - 14, width, height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
    ctx.fillStyle = this.palette.ink;
    ctx.font = '12px Inter, system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, 28, this.height - height + 10 + index * lineHeight);
    });
    ctx.restore();
  }
}

function getSteering(engine, origin) {
  let dx = 0;
  let dy = 0;
  if (engine.keys.has('arrowup') || engine.keys.has('w')) dy -= 1;
  if (engine.keys.has('arrowdown') || engine.keys.has('s')) dy += 1;
  if (engine.keys.has('arrowleft') || engine.keys.has('a')) dx -= 1;
  if (engine.keys.has('arrowright') || engine.keys.has('d')) dx += 1;
  if (dx !== 0 || dy !== 0) return normalize(dx, dy);
  if (engine.pointer.active || engine.pointer.down) {
    const ddx = engine.pointer.x - origin.x;
    const ddy = engine.pointer.y - origin.y;
    if (Math.hypot(ddx, ddy) > 10) return normalize(ddx, ddy);
  }
  return { x: 0, y: 0 };
}

function respawnPoint(engine, pad = 50) {
  return { x: rand(pad, engine.width - pad), y: rand(pad, engine.height - pad) };
}

function drawBar(ctx, x, y, width, value, color, label, engine) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, x, y, width, 14, 999);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, width * clamp(value, 0, 1), 14, 999);
  ctx.fill();
  ctx.fillStyle = engine.palette.ink;
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText(label, x + 8, y + 11);
  ctx.restore();
}

function followChain(segments, targetSpacing = 16) {
  for (let index = 1; index < segments.length; index += 1) {
    const lead = segments[index - 1];
    const bead = segments[index];
    const dx = lead.x - bead.x;
    const dy = lead.y - bead.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    bead.x += (dx / dist) * (dist - targetSpacing) * 0.28;
    bead.y += (dy / dist) * (dist - targetSpacing) * 0.28;
  }
}

function drawPolymerChain(ctx, segments, palette, headColor = '#ffffff', bondColor = 'rgba(143,243,255,0.35)') {
  for (let i = 0; i < segments.length - 1; i += 1) {
    const a = segments[i];
    const b = segments[i + 1];
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = bondColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  segments.slice().reverse().forEach((bead, index) => {
    const highlight = index === segments.length - 1;
    drawGlow(ctx, bead.x, bead.y, bead.r * 1.9, highlight ? palette.accent : palette.accent2, highlight ? 0.16 : 0.1);
    drawSphere(
      ctx,
      bead.x,
      bead.y,
      bead.r,
      highlight ? headColor : '#9fe7ff',
      highlight ? '#225480' : '#234763',
      0.96
    );
  });
}

function createChainGrowthMode(engine) {
  const segments = Array.from({ length: 10 }, (_, index) => ({
    x: engine.width * 0.3 - index * 16,
    y: engine.height * 0.55,
    r: 10
  }));
  const head = { x: segments[0].x, y: segments[0].y, vx: 0, vy: 0, r: 11 };
  const monomers = Array.from({ length: 26 }, () => ({
    ...respawnPoint(engine, 34),
    r: rand(6.8, 9.2),
    vx: rand(-12, 12),
    vy: rand(-12, 12),
    colorA: choice(['#9bf0b7', '#8fe7ff', '#f9d46b']),
    colorB: choice(['#1d5f3c', '#1d4f70', '#7a5c17'])
  }));
  const inhibitors = Array.from({ length: 4 }, () => ({
    ...respawnPoint(engine, 96),
    r: rand(15, 20),
    vx: rand(-20, 20),
    vy: rand(-18, 18),
    phase: rand(0, TAU)
  }));
  const catalysts = Array.from({ length: 2 }, () => ({
    ...respawnPoint(engine, 76),
    r: 13,
    phase: rand(0, TAU)
  }));
  let active = true;
  let dormant = 0;
  let growth = 0;
  let flash = 0;

  function resetPositions(nextEngine) {
    const p = respawnPoint(nextEngine, 100);
    head.x = p.x;
    head.y = p.y;
    head.vx = 0;
    head.vy = 0;
    segments.forEach((segment, index) => {
      segment.x = p.x - index * 16;
      segment.y = p.y;
    });
  }

  return {
    resize(nextEngine) {
      resetPositions(nextEngine);
    },
    update(dt, nextEngine) {
      const steer = getSteering(nextEngine, head);
      const targetSpeed = active ? 148 : 118;
      head.vx = lerp(head.vx, steer.x * targetSpeed, 0.07);
      head.vy = lerp(head.vy, steer.y * targetSpeed, 0.07);
      if (steer.x === 0 && steer.y === 0) {
        head.vx *= 0.95;
        head.vy *= 0.95;
      }
      head.x = clamp(head.x + head.vx * dt, 20, nextEngine.width - 20);
      head.y = clamp(head.y + head.vy * dt, 20, nextEngine.height - 20);
      segments[0].x = head.x;
      segments[0].y = head.y;
      followChain(segments, 16);

      if (!active) {
        dormant = Math.max(0, dormant - dt);
        if (dormant <= 0) {
          nextEngine.setMessage('chain end dormant — touch a catalyst bead', 1.2);
        }
      }
      flash = Math.max(0, flash - dt * 1.8);

      monomers.forEach((monomer) => {
        monomer.x += monomer.vx * dt;
        monomer.y += monomer.vy * dt;
        if (monomer.x < 22 || monomer.x > nextEngine.width - 22) monomer.vx *= -1;
        if (monomer.y < 22 || monomer.y > nextEngine.height - 22) monomer.vy *= -1;
        monomer.x = clamp(monomer.x, 22, nextEngine.width - 22);
        monomer.y = clamp(monomer.y, 22, nextEngine.height - 22);
        if (active && circleHit(head, monomer, 2)) {
          const tail = segments[segments.length - 1];
          segments.push({ x: tail.x, y: tail.y, r: 9.4 });
          Object.assign(monomer, { ...respawnPoint(nextEngine, 28), vx: rand(-12, 12), vy: rand(-12, 12) });
          growth += 1;
          nextEngine.addScore(1);
          flash = 1;
        }
      });

      inhibitors.forEach((inhibitor) => {
        inhibitor.x += (inhibitor.vx + Math.sin(nextEngine.time * 0.001 + inhibitor.phase) * 4) * dt;
        inhibitor.y += (inhibitor.vy + Math.cos(nextEngine.time * 0.0011 + inhibitor.phase) * 4) * dt;
        if (inhibitor.x < 34 || inhibitor.x > nextEngine.width - 34) inhibitor.vx *= -1;
        if (inhibitor.y < 34 || inhibitor.y > nextEngine.height - 34) inhibitor.vy *= -1;
        inhibitor.x = clamp(inhibitor.x, 34, nextEngine.width - 34);
        inhibitor.y = clamp(inhibitor.y, 34, nextEngine.height - 34);
        if (active && circleHit(head, inhibitor, 1)) {
          active = false;
          dormant = 2.6;
          nextEngine.setMessage('inhibitor collision — chain end quenched', 1.3);
        }
      });

      catalysts.forEach((catalyst, index) => {
        catalyst.y += Math.sin(nextEngine.time * 0.001 + catalyst.phase) * 0.28;
        if (!active && circleHit(head, catalyst, 1)) {
          active = true;
          dormant = 0;
          nextEngine.setMessage('catalyst restart — propagation resumed', 1.3);
          catalysts[index] = { ...respawnPoint(nextEngine, 76), r: 13, phase: rand(0, TAU) };
        }
      });

      nextEngine.metricsText = active
        ? 'active end propagating • monomer addition occurs locally at one chain end'
        : 'dormant end • find a catalyst bead to resume propagation';
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(110,224,198,0.15)', 'rgba(143,243,255,0.14)');
      monomers.forEach((monomer) => {
        drawGlow(ctx, monomer.x, monomer.y, monomer.r * 1.8, monomer.colorA, 0.12);
        drawSphere(ctx, monomer.x, monomer.y, monomer.r, monomer.colorA, monomer.colorB, 0.94);
      });
      inhibitors.forEach((inhibitor) => {
        drawGlow(ctx, inhibitor.x, inhibitor.y, inhibitor.r * 1.5, nextEngine.palette.warn, 0.14);
        drawSphere(ctx, inhibitor.x, inhibitor.y, inhibitor.r, '#ffb0be', '#6c1f34', 0.94);
      });
      catalysts.forEach((catalyst) => {
        drawGlow(ctx, catalyst.x, catalyst.y, catalyst.r * 1.9, '#f8d15a', 0.15);
        drawSphere(ctx, catalyst.x, catalyst.y, catalyst.r, '#ffe68d', '#7d5c1a', 0.96);
      });
      drawPolymerChain(ctx, segments, nextEngine.palette, active ? '#ffffff' : '#ffd9a8', active ? 'rgba(110,224,198,0.35)' : 'rgba(255,217,168,0.28)');
      if (flash > 0) drawGlow(ctx, head.x, head.y, 30 * flash, nextEngine.palette.good, 0.14 * flash);
      drawBar(ctx, 18, 18, 220, active ? 1 : dormant / 2.6, active ? nextEngine.palette.good : '#f8d15a', active ? 'active chain end' : 'dormant end', nextEngine);
      drawBar(ctx, 18, 38, 220, clamp(segments.length / 38, 0, 1), nextEngine.palette.accent, `degree of polymerization ~ ${segments.length}`, nextEngine);
    }
  };
}

function createBrushChannelMode(engine) {
  const tracer = { x: engine.width * 0.24, y: engine.height * 0.5, vx: 0, vy: 0, r: 10.5 };
  const rootsTop = [];
  const rootsBottom = [];
  const markers = [];
  let progress = 0;
  let mobility = 100;

  function seedRoots(nextEngine) {
    rootsTop.length = 0;
    rootsBottom.length = 0;
    const spacing = 44;
    const count = Math.ceil(nextEngine.width / spacing) + 6;
    for (let index = 0; index < count; index += 1) {
      const x = index * spacing - 80;
      rootsTop.push({ x, len: Math.floor(rand(4, 8)), phase: rand(0, TAU), sway: rand(0.7, 1.3) });
      rootsBottom.push({ x, len: Math.floor(rand(4, 8)), phase: rand(0, TAU), sway: rand(0.7, 1.3) });
    }
    markers.length = 0;
    for (let i = 0; i < 7; i += 1) {
      markers.push({ x: rand(100, nextEngine.width - 40), y: rand(nextEngine.height * 0.28, nextEngine.height * 0.72), r: 8, speed: rand(46, 72) });
    }
  }

  function brushBeads(root, top, nextEngine) {
    const beads = [];
    const sign = top ? 1 : -1;
    const baseY = top ? 12 : nextEngine.height - 12;
    for (let i = 1; i <= root.len; i += 1) {
      const s = i / root.len;
      const x = root.x + Math.sin(nextEngine.time * 0.001 * root.sway + root.phase + s * 1.8) * (10 + s * 10);
      const y = baseY + sign * (16 + i * 15) + Math.cos(nextEngine.time * 0.0011 + root.phase + s) * 4;
      beads.push({ x, y, r: 6.2 - s * 1.6 });
    }
    return beads;
  }

  return {
    resize(nextEngine) {
      tracer.x = nextEngine.width * 0.24;
      tracer.y = nextEngine.height * 0.5;
      tracer.vx = 0;
      tracer.vy = 0;
      progress = 0;
      mobility = 100;
      seedRoots(nextEngine);
    },
    update(dt, nextEngine) {
      const steer = getSteering(nextEngine, tracer);
      tracer.vx = lerp(tracer.vx, steer.x * 110, 0.08);
      tracer.vy = lerp(tracer.vy, steer.y * 110, 0.08);
      tracer.x = clamp(tracer.x + tracer.vx * dt, 32, nextEngine.width * 0.42);
      tracer.y = clamp(tracer.y + tracer.vy * dt, 30, nextEngine.height - 30);

      const scroll = 58 * dt;
      progress += scroll;
      nextEngine.setScore(Math.floor(progress * 0.08));
      mobility = clamp(mobility + dt * 4.5, 0, 100);

      [...rootsTop, ...rootsBottom].forEach((root) => {
        root.x -= scroll;
        if (root.x < -100) {
          root.x = nextEngine.width + rand(10, 70);
          root.len = Math.floor(rand(4, 8));
          root.phase = rand(0, TAU);
        }
      });

      markers.forEach((marker) => {
        marker.x -= marker.speed * dt;
        marker.y += Math.sin(nextEngine.time * 0.001 + marker.x * 0.01) * 0.8;
        if (marker.x < -20) {
          marker.x = nextEngine.width + rand(20, 90);
          marker.y = rand(nextEngine.height * 0.26, nextEngine.height * 0.74);
        }
        if (circleHit(tracer, marker, 1)) {
          nextEngine.addScore(2);
          mobility = clamp(mobility + 7, 0, 100);
          marker.x = nextEngine.width + rand(40, 120);
          marker.y = rand(nextEngine.height * 0.26, nextEngine.height * 0.74);
        }
      });

      let collisionCount = 0;
      [rootsTop, rootsBottom].forEach((roots, idx) => {
        roots.forEach((root) => {
          brushBeads(root, idx === 0, nextEngine).forEach((bead) => {
            if (circleHit(tracer, bead, -1)) collisionCount += 1;
          });
        });
      });
      if (collisionCount) {
        mobility = clamp(mobility - collisionCount * dt * 18, 0, 100);
        nextEngine.addScore(-collisionCount * 0.12);
      }
      nextEngine.metricsText = 'follow transient low-density corridors • transport depends on instantaneous free volume';
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(125,211,252,0.15)', 'rgba(110,224,198,0.12)');
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(nextEngine.width, 14);
      ctx.moveTo(0, nextEngine.height - 14);
      ctx.lineTo(nextEngine.width, nextEngine.height - 14);
      ctx.stroke();
      ctx.restore();

      [rootsTop, rootsBottom].forEach((roots, idx) => {
        roots.forEach((root) => {
          const beads = brushBeads(root, idx === 0, nextEngine);
          const baseY = idx === 0 ? 12 : nextEngine.height - 12;
          let lastX = root.x;
          let lastY = baseY;
          beads.forEach((bead) => {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = idx === 0 ? 'rgba(143,243,255,0.24)' : 'rgba(136,164,255,0.24)';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(bead.x, bead.y);
            ctx.stroke();
            ctx.restore();
            drawSphere(ctx, bead.x, bead.y, bead.r, idx === 0 ? '#a6efff' : '#c0d0ff', idx === 0 ? '#224d6c' : '#2f3f78', 0.92);
            lastX = bead.x;
            lastY = bead.y;
          });
        });
      });

      markers.forEach((marker) => {
        drawGlow(ctx, marker.x, marker.y, marker.r * 1.9, nextEngine.palette.good, 0.14);
        drawSphere(ctx, marker.x, marker.y, marker.r, '#bdfae8', '#185f56', 0.96);
      });
      drawGlow(ctx, tracer.x, tracer.y, tracer.r * 2.1, nextEngine.palette.accent, 0.16);
      drawSphere(ctx, tracer.x, tracer.y, tracer.r, '#ffffff', '#244b70', 1);
      drawBar(ctx, 18, 18, 220, mobility / 100, nextEngine.palette.accent, 'mobility', nextEngine);
      drawBar(ctx, 18, 38, 220, clamp(progress / (nextEngine.width * 4), 0, 1), nextEngine.palette.good, 'flux progress', nextEngine);
    }
  };
}

function createBondRepairMode(engine) {
  let nodes = [];
  let bonds = [];
  let integrity = 1;
  let breakTimer = 0;
  let level = 1;

  function buildNetwork(nextEngine, keepLevel = level) {
    level = keepLevel;
    const rows = 4 + Math.min(2, Math.floor(level / 3));
    const cols = 6 + Math.min(2, Math.floor(level / 4));
    const cell = Math.min((nextEngine.width - 120) / cols, (nextEngine.height - 180) / rows);
    const originX = (nextEngine.width - cell * (cols - 1)) * 0.5;
    const originY = Math.max(110, (nextEngine.height - cell * (rows - 1)) * 0.5);
    nodes = [];
    bonds = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        nodes.push({
          id: row * cols + col,
          row,
          col,
          x: originX + col * cell + rand(-6, 6),
          y: originY + row * cell + rand(-6, 6),
          r: 7.2
        });
      }
    }
    const nodeAt = (row, col) => nodes[row * cols + col];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (col < cols - 1) bonds.push({ a: nodeAt(row, col).id, b: nodeAt(row, col + 1).id, state: 'intact', age: 0 });
        if (row < rows - 1) bonds.push({ a: nodeAt(row, col).id, b: nodeAt(row + 1, col).id, state: 'intact', age: 0 });
        if (row < rows - 1 && col < cols - 1 && Math.random() < 0.18) bonds.push({ a: nodeAt(row, col).id, b: nodeAt(row + 1, col + 1).id, state: 'intact', age: 0 });
      }
    }
    for (let i = 0; i < 4 + Math.floor(level * 0.5); i += 1) {
      choice(bonds).state = 'broken';
    }
    integrity = computeIntegrity();
    breakTimer = 1.8;
  }

  function intactNeighbors(nodeId) {
    return bonds.filter((bond) => bond.state === 'intact' && (bond.a === nodeId || bond.b === nodeId));
  }

  function computeIntegrity() {
    const adj = new Map(nodes.map((node) => [node.id, []]));
    bonds.forEach((bond) => {
      if (bond.state !== 'intact') return;
      adj.get(bond.a).push(bond.b);
      adj.get(bond.b).push(bond.a);
    });
    let best = 0;
    const seen = new Set();
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      const stack = [node.id];
      let size = 0;
      seen.add(node.id);
      while (stack.length) {
        const current = stack.pop();
        size += 1;
        adj.get(current).forEach((next) => {
          if (!seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        });
      }
      best = Math.max(best, size);
    }
    return nodes.length ? best / nodes.length : 0;
  }

  function breakImportantBond() {
    const candidates = bonds.filter((bond) => bond.state === 'intact');
    if (!candidates.length) return;
    const weighted = candidates
      .map((bond) => ({ bond, weight: intactNeighbors(bond.a).length + intactNeighbors(bond.b).length + Math.random() * 2 }))
      .sort((a, b) => b.weight - a.weight);
    weighted[Math.floor(rand(0, Math.min(4, weighted.length)))].bond.state = 'broken';
  }

  function bondMidpoint(bond) {
    const a = nodes[bond.a];
    const b = nodes[bond.b];
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }

  buildNetwork(engine, 1);

  return {
    resize(nextEngine) {
      buildNetwork(nextEngine, level);
    },
    pointerDown(point, nextEngine) {
      let bestBond = null;
      let bestDist = 22;
      bonds.forEach((bond) => {
        if (bond.state !== 'broken') return;
        const mid = bondMidpoint(bond);
        const d = Math.hypot(point.x - mid.x, point.y - mid.y);
        if (d < bestDist) {
          bestDist = d;
          bestBond = bond;
        }
      });
      if (bestBond) {
        const before = integrity;
        bestBond.state = 'intact';
        bestBond.age = 0;
        integrity = computeIntegrity();
        const bonus = Math.max(1, Math.round((integrity - before) * 20));
        nextEngine.addScore(1 + bonus);
        nextEngine.setMessage(integrity > before ? 'bridge restored — global connectivity improved' : 'local repair completed', 1.2);
      }
    },
    update(dt, nextEngine) {
      breakTimer -= dt;
      bonds.forEach((bond) => {
        if (bond.state === 'broken') bond.age += dt;
      });
      if (breakTimer <= 0) {
        breakImportantBond();
        breakTimer = clamp(2.4 - level * 0.08, 1.15, 2.4);
      }
      bonds.forEach((bond) => {
        if (bond.state === 'broken' && bond.age > 5.5 && Math.random() < 0.002) {
          const neighbors = bonds.filter((other) => other.state === 'intact' && (other.a === bond.a || other.b === bond.a || other.a === bond.b || other.b === bond.b));
          if (neighbors.length) choice(neighbors).state = 'broken';
          bond.age = 0;
        }
      });
      integrity = computeIntegrity();
      nextEngine.setScore(nextEngine.score + dt * (2 + integrity * 6));
      if (integrity < 0.36) {
        nextEngine.setMessage('network lost a spanning component — reconfiguring topology', 1.6);
        buildNetwork(nextEngine, level + 1);
      }
      nextEngine.metricsText = `repair bridge bonds first • largest connected component ${(integrity * 100).toFixed(0)}%`;
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(255,142,164,0.13)', 'rgba(110,224,198,0.12)');
      bonds.forEach((bond) => {
        const a = nodes[bond.a];
        const b = nodes[bond.b];
        if (bond.state === 'intact') {
          ctx.save();
          ctx.globalAlpha = 0.36;
          ctx.strokeStyle = 'rgba(143,243,255,0.34)';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        } else {
          const mid = bondMidpoint(bond);
          const nx = (b.x - a.x) * 0.2;
          const ny = (b.y - a.y) * 0.2;
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = bond.age > 3 ? '#ffb36d' : nextEngine.palette.warn;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mid.x - nx, mid.y - ny);
          ctx.moveTo(mid.x + nx, mid.y + ny);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
          drawGlow(ctx, mid.x, mid.y, 14 + Math.sin(nextEngine.time * 0.01) * 2, bond.age > 3 ? '#ffb36d' : nextEngine.palette.warn, 0.12);
        }
      });
      nodes.forEach((node) => {
        drawSphere(ctx, node.x, node.y, node.r, '#eaf3ff', '#24496e', 0.98);
      });
      drawBar(ctx, 18, 18, 220, integrity, nextEngine.palette.good, `largest component ${(integrity * 100).toFixed(0)}%`, nextEngine);
      drawBar(ctx, 18, 38, 220, clamp(level / 8, 0, 1), nextEngine.palette.accent2, `network stage ${level}`, nextEngine);
    }
  };
}

const REAGENTS = {
  diol: { label: 'diol', short: 'HO-R-OH', colorA: '#9bf0b7', colorB: '#175e3d' },
  diacid: { label: 'diacid', short: 'HOOC-R-COOH', colorA: '#8fe7ff', colorB: '#1f4e72' },
  diacidchloride: { label: 'diacid chloride', short: 'ClOC-R-COCl', colorA: '#f5cb6b', colorB: '#7b5b17' },
  diamine: { label: 'diamine', short: 'H2N-R-NH2', colorA: '#f4a7ff', colorB: '#6b2579' },
  diisocyanate: { label: 'diisocyanate', short: 'OCN-R-NCO', colorA: '#ffb0be', colorB: '#6d2234' },
  epoxide: { label: 'epoxide', short: 'epoxide', colorA: '#adc7ff', colorB: '#284878' },
  dialdehyde: { label: 'dialdehyde', short: 'OHC-R-CHO', colorA: '#ffd59e', colorB: '#7e5220' }
};

const TARGETS = [
  { id: 'polyester', label: 'Polyester formation', reactants: ['diol', 'diacid'] },
  { id: 'polyamide', label: 'Polyamide formation', reactants: ['diamino', 'diacidchloride'] },
  { id: 'polyurethane', label: 'Polyurethane formation', reactants: ['diol', 'diisocyanate'] },
  { id: 'epoxy-amine', label: 'Epoxy–amine curing', reactants: ['epoxide', 'diamine'] },
  { id: 'imine-network', label: 'Imine network formation', reactants: ['dialdehyde', 'diamine'] }
].map((target) => ({ ...target, reactants: target.reactants.map((value) => (value === 'diamino' ? 'diamine' : value)) }));

function createReactionMatchMode(engine) {
  const rows = 5;
  const cols = 6;
  let board = [];
  let cellSize = 84;
  let originX = 0;
  let originY = 0;
  let selected = null;
  let target = choice(TARGETS);
  let targetCount = 0;
  let combo = 0;
  let flashBad = 0;

  function randomReagent(preferTarget = false) {
    if (preferTarget && Math.random() < 0.55) return choice(target.reactants);
    return choice(Object.keys(REAGENTS));
  }

  function refillBoard() {
    board = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => ({ row, col, type: randomReagent(true) })));
    ensurePlayable();
  }

  function ensurePlayable() {
    const counts = new Map(Object.keys(REAGENTS).map((key) => [key, 0]));
    board.flat().forEach((cell) => counts.set(cell.type, counts.get(cell.type) + 1));
    target.reactants.forEach((type) => {
      if (!counts.get(type)) {
        const cell = choice(board.flat());
        cell.type = type;
      }
    });
  }

  function setGeometry(nextEngine) {
    cellSize = Math.min(88, (nextEngine.width - 160) / cols, (nextEngine.height - 240) / rows);
    originX = (nextEngine.width - cellSize * cols) * 0.5;
    originY = Math.max(120, (nextEngine.height - cellSize * rows) * 0.5 + 16);
  }

  function cellAt(point) {
    const col = Math.floor((point.x - originX) / cellSize);
    const row = Math.floor((point.y - originY) / cellSize);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return board[row][col];
  }

  function pairMatches(a, b) {
    const set = [a.type, b.type].sort().join('|');
    const need = [...target.reactants].sort().join('|');
    return set === need;
  }

  function replaceCell(cell) {
    board[cell.row][cell.col] = { row: cell.row, col: cell.col, type: randomReagent(true) };
  }

  setGeometry(engine);
  refillBoard();

  return {
    resize(nextEngine) {
      setGeometry(nextEngine);
    },
    pointerDown(point, nextEngine) {
      const cell = cellAt(point);
      if (!cell) return;
      if (!selected) {
        selected = cell;
        return;
      }
      if (selected.row === cell.row && selected.col === cell.col) {
        selected = null;
        return;
      }
      if (pairMatches(selected, cell)) {
        replaceCell(selected);
        replaceCell(cell);
        ensurePlayable();
        combo += 1;
        targetCount += 1;
        nextEngine.addScore(8 + combo * 2);
        nextEngine.setMessage(`${target.label} matched`, 1.0);
        if (targetCount >= 5) {
          target = choice(TARGETS.filter((item) => item.id !== target.id));
          targetCount = 0;
          combo = 0;
          ensurePlayable();
          nextEngine.setMessage(`target advanced → ${target.label}`, 1.5);
        }
      } else {
        combo = 0;
        flashBad = 1;
        nextEngine.setMessage('wrong chemistry for the current target', 1.0);
      }
      selected = null;
    },
    update(dt, nextEngine) {
      flashBad = Math.max(0, flashBad - dt * 2);
      nextEngine.metricsText = `target reaction: ${target.label.toLowerCase()} • recognize compatible functional-group pairs`;
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(244,167,255,0.12)', 'rgba(245,203,107,0.12)');
      ctx.save();
      ctx.fillStyle = 'rgba(8, 13, 25, 0.58)';
      roundRect(ctx, originX - 4, originY - 76, cellSize * cols + 8, 62, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
      ctx.fillStyle = nextEngine.palette.ink;
      ctx.font = '600 16px Inter, system-ui, sans-serif';
      ctx.fillText(target.label, originX + 16, originY - 38);
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = nextEngine.palette.soft;
      ctx.fillText(`need: ${REAGENTS[target.reactants[0]].label} + ${REAGENTS[target.reactants[1]].label}`, originX + 16, originY - 18);
      ctx.restore();

      board.flat().forEach((cell) => {
        const x = originX + cell.col * cellSize;
        const y = originY + cell.row * cellSize;
        const reagent = REAGENTS[cell.type];
        const selectedHere = selected && selected.row === cell.row && selected.col === cell.col;
        ctx.save();
        ctx.fillStyle = selectedHere ? 'rgba(255,255,255,0.12)' : 'rgba(9, 14, 27, 0.68)';
        roundRect(ctx, x + 6, y + 6, cellSize - 12, cellSize - 12, 18);
        ctx.fill();
        ctx.strokeStyle = selectedHere ? nextEngine.palette.good : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = selectedHere ? 2 : 1;
        ctx.stroke();
        drawGlow(ctx, x + cellSize * 0.5, y + cellSize * 0.42, cellSize * 0.19, reagent.colorA, 0.12);
        drawSphere(ctx, x + cellSize * 0.5, y + cellSize * 0.42, cellSize * 0.12, reagent.colorA, reagent.colorB, 0.96);
        ctx.fillStyle = nextEngine.palette.ink;
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(reagent.label, x + cellSize * 0.5, y + cellSize * 0.71);
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillStyle = nextEngine.palette.soft;
        const lines = wrapText(ctx, reagent.short, cellSize - 18).slice(0, 2);
        lines.forEach((line, index) => ctx.fillText(line, x + cellSize * 0.5, y + cellSize * 0.83 + index * 12));
        ctx.restore();
      });
      if (flashBad > 0) {
        ctx.save();
        ctx.globalAlpha = flashBad * 0.18;
        ctx.fillStyle = nextEngine.palette.warn;
        ctx.fillRect(0, 0, nextEngine.width, nextEngine.height);
        ctx.restore();
      }
      drawBar(ctx, 18, 18, 220, clamp(targetCount / 5, 0, 1), nextEngine.palette.accent, `target deck progress ${targetCount}/5`, nextEngine);
      drawBar(ctx, 18, 38, 220, clamp(combo / 6, 0, 1), '#f8d15a', `combo ${combo}`, nextEngine);
    }
  };
}

function connectorsFor(tile) {
  if (tile.kind === 'block') return [];
  if (tile.kind === 'cross') return [0, 1, 2, 3];
  if (tile.kind === 'straight') return tile.rotation % 2 === 0 ? [0, 2] : [1, 3];
  if (tile.kind === 'corner') return [tile.rotation % 4, (tile.rotation + 1) % 4];
  if (tile.kind === 'tee') return [0, 1, 2, 3].filter((dir) => dir !== tile.rotation % 4);
  return [];
}

function pathKindFromConnectors(connectors) {
  const sorted = [...connectors].sort((a, b) => a - b);
  if (sorted.length === 4) return { kind: 'cross', rotation: 0 };
  if (sorted.length === 3) {
    const missing = [0, 1, 2, 3].find((dir) => !sorted.includes(dir));
    return { kind: 'tee', rotation: missing };
  }
  if (sorted.length === 2) {
    const diff = Math.abs(sorted[0] - sorted[1]);
    if (diff === 2) return { kind: 'straight', rotation: sorted.includes(0) ? 0 : 1 };
    const min = Math.min(...sorted);
    if (sorted[0] === 0 && sorted[1] === 3) return { kind: 'corner', rotation: 3 };
    return { kind: 'corner', rotation: min };
  }
  return { kind: 'block', rotation: 0 };
}

function createPercolationMode(engine) {
  let rows = 6;
  let cols = 6;
  let board = [];
  let cellSize = 72;
  let originX = 0;
  let originY = 0;
  let sourceRow = 0;
  let sinkRow = 0;
  let mobility = 100;
  let solvedPath = [];
  let pulseTimer = 0;
  let level = 1;

  function setGeometry(nextEngine) {
    cellSize = Math.min(86, (nextEngine.width - 150) / cols, (nextEngine.height - 210) / rows);
    originX = (nextEngine.width - cellSize * cols) * 0.5;
    originY = Math.max(120, (nextEngine.height - cellSize * rows) * 0.5 + 18);
  }

  function buildPathCells() {
    sourceRow = Math.floor(rand(0, rows));
    let row = sourceRow;
    const cells = [{ row, col: 0 }];
    for (let col = 0; col < cols - 1; col += 1) {
      const wiggles = Math.random() < 0.52 ? Math.floor(rand(0, 3)) : 0;
      for (let step = 0; step < wiggles; step += 1) {
        const dir = choice([-1, 1]);
        const nextRow = clamp(row + dir, 0, rows - 1);
        if (nextRow !== row) {
          row = nextRow;
          cells.push({ row, col });
        }
      }
      cells.push({ row, col: col + 1 });
    }
    sinkRow = row;
    return cells.filter((cell, index, array) => index === 0 || cell.row !== array[index - 1].row || cell.col !== array[index - 1].col);
  }

  function newTile(kind = choice(['straight', 'corner', 'tee'])) {
    return {
      kind,
      rotation: Math.floor(rand(0, 4)),
      special: Math.random() < 0.12 ? 'dopant' : Math.random() < 0.1 ? 'trap' : null
    };
  }

  function generateBoard(nextEngine) {
    rows = 6 + Math.min(1, Math.floor(level / 4));
    cols = 6 + Math.min(1, Math.floor(level / 5));
    setGeometry(nextEngine);
    board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => newTile(Math.random() < 0.18 ? 'block' : choice(['straight', 'corner', 'tee']))));
    const path = buildPathCells();
    path.forEach((cell, index) => {
      const connectors = [];
      if (index === 0) connectors.push(3);
      if (index === path.length - 1) connectors.push(1);
      if (index > 0) {
        const prev = path[index - 1];
        if (prev.row < cell.row) connectors.push(0);
        else if (prev.row > cell.row) connectors.push(2);
        else if (prev.col < cell.col) connectors.push(3);
        else connectors.push(1);
      }
      if (index < path.length - 1) {
        const next = path[index + 1];
        if (next.row < cell.row) connectors.push(0);
        else if (next.row > cell.row) connectors.push(2);
        else if (next.col > cell.col) connectors.push(1);
        else connectors.push(3);
      }
      const { kind, rotation } = pathKindFromConnectors(connectors);
      board[cell.row][cell.col] = {
        kind,
        rotation: (rotation + Math.floor(rand(0, 4))) % 4,
        special: Math.random() < 0.22 ? 'dopant' : null
      };
    });
    board[sinkRow][cols - 1].special = 'collector';
    board[sourceRow][0].special = 'source';
    mobility = clamp(mobility, 45, 100);
    solvedPath = [];
    pulseTimer = 0;
  }

  function cellAt(point) {
    const col = Math.floor((point.x - originX) / cellSize);
    const row = Math.floor((point.y - originY) / cellSize);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  }

  function solvePath() {
    const start = { row: sourceRow, col: 0 };
    const queue = [start];
    const key = (row, col) => `${row}-${col}`;
    const parent = new Map([[key(start.row, start.col), null]]);
    while (queue.length) {
      const current = queue.shift();
      const tile = board[current.row][current.col];
      const connectors = connectorsFor(tile);
      if (current.row === sinkRow && current.col === cols - 1 && connectors.includes(1)) {
        const out = [];
        let cursor = current;
        while (cursor) {
          out.push(cursor);
          cursor = parent.get(key(cursor.row, cursor.col));
        }
        return out.reverse();
      }
      if (current.row === sourceRow && current.col === 0 && !connectors.includes(3)) continue;
      connectors.forEach((dir) => {
        const next = { row: current.row + DIRS[dir].dr, col: current.col + DIRS[dir].dc };
        if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) return;
        const nextTile = board[next.row][next.col];
        const back = (dir + 2) % 4;
        if (!connectorsFor(nextTile).includes(back)) return;
        const id = key(next.row, next.col);
        if (!parent.has(id)) {
          parent.set(id, current);
          queue.push(next);
        }
      });
    }
    return [];
  }

  generateBoard(engine);

  return {
    resize(nextEngine) {
      setGeometry(nextEngine);
    },
    pointerDown(point, nextEngine) {
      const cell = cellAt(point);
      if (!cell || pulseTimer > 0) return;
      const tile = board[cell.row][cell.col];
      if (tile.kind === 'block' || tile.special === 'source' || tile.special === 'collector') return;
      tile.rotation = (tile.rotation + 1) % 4;
      const solved = solvePath();
      if (solved.length) {
        solvedPath = solved;
        pulseTimer = 1.15;
        const bonus = solved.reduce((sum, step) => sum + (board[step.row][step.col].special === 'dopant' ? 3 : 1), 0);
        nextEngine.addScore(10 + bonus + level);
        mobility = clamp(mobility + 22, 0, 100);
        nextEngine.setMessage('connected transport pathway recovered', 1.2);
      }
    },
    update(dt, nextEngine) {
      mobility = clamp(mobility - dt * 4.2, 0, 100);
      if (mobility <= 0) {
        nextEngine.setMessage('mobility collapsed — reshuffling disorder field', 1.4);
        generateBoard(nextEngine);
        mobility = 100;
      }
      if (pulseTimer > 0) {
        pulseTimer -= dt;
        if (pulseTimer <= 0) {
          level += 1;
          generateBoard(nextEngine);
        }
      }
      nextEngine.metricsText = 'rotate tiles to recover a source-to-collector pathway through disorder';
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(136,164,255,0.16)', 'rgba(248,209,90,0.12)');
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const tile = board[row][col];
          const x = originX + col * cellSize;
          const y = originY + row * cellSize;
          const centerX = x + cellSize * 0.5;
          const centerY = y + cellSize * 0.5;
          ctx.save();
          ctx.fillStyle = tile.special === 'source'
            ? 'rgba(30, 116, 92, 0.46)'
            : tile.special === 'collector'
              ? 'rgba(76, 106, 192, 0.48)'
              : tile.kind === 'block'
                ? 'rgba(104,114,131,0.34)'
                : 'rgba(9, 14, 27, 0.68)';
          roundRect(ctx, x + 5, y + 5, cellSize - 10, cellSize - 10, 18);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.stroke();
          ctx.lineCap = 'round';
          ctx.lineWidth = cellSize * 0.13;
          ctx.strokeStyle = tile.special === 'trap' ? nextEngine.palette.warn : tile.special === 'dopant' ? '#f8d15a' : nextEngine.palette.accent;
          const arm = cellSize * 0.28;
          if (tile.kind !== 'block') {
            connectorsFor(tile).forEach((dir) => {
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(centerX + DIRS[dir].dc * arm, centerY + DIRS[dir].dr * arm);
              ctx.stroke();
            });
            drawSphere(ctx, centerX, centerY, cellSize * 0.1, tile.special === 'dopant' ? '#ffe68d' : '#d9efff', tile.special === 'trap' ? '#6d2234' : '#284b75', 0.96);
          }
          if (tile.special === 'trap') {
            drawGlow(ctx, centerX, centerY, cellSize * 0.18, nextEngine.palette.warn, 0.14);
          }
          ctx.restore();
        }
      }
      if (solvedPath.length && pulseTimer > 0) {
        const t = 1 - pulseTimer / 1.15;
        const pulseIndex = Math.min(solvedPath.length - 1, Math.floor(t * solvedPath.length));
        solvedPath.forEach((step, index) => {
          const x = originX + step.col * cellSize + cellSize * 0.5;
          const y = originY + step.row * cellSize + cellSize * 0.5;
          drawGlow(ctx, x, y, cellSize * 0.18, index <= pulseIndex ? nextEngine.palette.good : nextEngine.palette.accent, index <= pulseIndex ? 0.18 : 0.06);
        });
      }
      drawBar(ctx, 18, 18, 220, mobility / 100, nextEngine.palette.accent, 'mobility window', nextEngine);
      drawBar(ctx, 18, 38, 220, clamp(level / 8, 0, 1), '#f8d15a', `percolation stage ${level}`, nextEngine);
    }
  };
}

const MODE_FACTORIES = {
  'chain-growth-runner': createChainGrowthMode,
  'brush-channel': createBrushChannelMode,
  'bond-repair': createBondRepairMode,
  'reaction-match': createReactionMatchMode,
  'charge-tactics': createPercolationMode
};

function updateHud(modeMeta, engine) {
  byId('mode-subtitle').textContent = modeMeta.subtitle;
  byId('mode-title').textContent = modeMeta.title;
  byId('mode-description').textContent = modeMeta.description;
  byId('mode-instruction').textContent = modeMeta.instruction;
  byId('mode-concept').textContent = modeMeta.concept;
  byId('mode-selector').value = modeMeta.id;
  updateScoreHud(engine);
}

function updateScoreHud(engine) {
  byId('hud-score').textContent = `${engine.score}`;
  byId('hud-best').textContent = `${engine.best}`;
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.leisure);
  activateNav('leisure');
  smoothScrollForHashes();

  const canvas = byId('playground');
  const engine = new RestEngine(canvas);
  const selector = byId('mode-selector');
  selector.innerHTML = '';
  leisureModes.forEach((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = mode.title;
    selector.appendChild(option);
  });

  selector.addEventListener('change', (event) => {
    engine.setMode(event.target.value);
  });

  byId('mode-reroll').addEventListener('click', () => {
    const candidates = leisureModes.filter((mode) => mode.id !== engine.modeId);
    engine.setMode(choice(candidates.length ? candidates : leisureModes).id);
  });

  engine.setMode(choice(leisureModes).id);
  engine.rafId = requestAnimationFrame(engine.loop);
});
