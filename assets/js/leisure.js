import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, clamp, setMeta, smoothScrollForHashes } from './utils.js';

const TAU = Math.PI * 2;
const STORAGE_KEY = 'haoyu-rest-best';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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
  const gradient = ctx.createRadialGradient(x - r * 0.32, y - r * 0.34, r * 0.18, x, y, r);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.3, fillA);
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
  ctx.globalAlpha = 0.11;
  ctx.fillStyle = bgA;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.18, Math.max(width, height) * 0.32, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = bgB;
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.74, Math.max(width, height) * 0.26, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  const drift = Math.sin(time * 0.00012) * 14;
  for (let x = -48; x < width + 48; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, height);
    ctx.stroke();
  }
  for (let y = 0; y < height + 40; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
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
    const dt = clamp((timestamp - this.lastTime) / 1000, 0.008, 0.03);
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
    const width = Math.min(420, this.width - 32);
    const lines = [this.metricsText, this.message].filter(Boolean);
    const height = 14 + lines.length * 18;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(4, 8, 18, 0.54)';
    roundRect(ctx, 16, this.height - height - 16, width, height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
    ctx.fillStyle = this.palette.ink;
    ctx.font = '12px Inter, system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, 30, this.height - height + 10 + index * 18);
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
    if (Math.hypot(ddx, ddy) > 8) return normalize(ddx, ddy);
  }
  return { x: 0, y: 0 };
}

function respawnPoint(engine, pad = 50) {
  return { x: rand(pad, engine.width - pad), y: rand(pad, engine.height - pad) };
}

function makeSpark(x, y, color) {
  return {
    x,
    y,
    vx: rand(-70, 70),
    vy: rand(-70, 70),
    size: rand(2, 4),
    life: rand(0.45, 0.9),
    maxLife: 0,
    color
  };
}

function updateSparks(sparks, dt) {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    if (!spark.maxLife) spark.maxLife = spark.life;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.96;
    spark.vy *= 0.96;
    spark.life -= dt;
    if (spark.life <= 0) sparks.splice(index, 1);
  }
}

function drawSparks(ctx, sparks) {
  sparks.forEach((spark) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, spark.life / Math.max(0.001, spark.maxLife || spark.life));
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
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

function createChainGrowthMode(engine) {
  const monomerColors = ['#86efac', '#7dd3fc', '#fcd34d'];
  const segments = Array.from({ length: 8 }, (_, index) => ({
    x: engine.width * 0.32 - index * 18,
    y: engine.height * 0.55,
    r: 11
  }));
  const head = { x: segments[0].x, y: segments[0].y, vx: 0, vy: 0, r: 12 };
  const monomers = Array.from({ length: 24 }, () => ({
    ...respawnPoint(engine, 36),
    r: rand(7, 10),
    vx: rand(-16, 16),
    vy: rand(-16, 16),
    color: choice(monomerColors)
  }));
  const inhibitors = Array.from({ length: 5 }, () => ({
    ...respawnPoint(engine, 90),
    r: rand(18, 24),
    vx: rand(-42, 42),
    vy: rand(-38, 38),
    phase: rand(0, TAU)
  }));
  const sparks = [];
  let integrity = 100;
  let hitCooldown = 0;
  let survived = 0;

  return {
    resize(nextEngine) {
      const point = respawnPoint(nextEngine, 80);
      head.x = point.x;
      head.y = point.y;
      head.vx = 0;
      head.vy = 0;
      segments.forEach((segment, index) => {
        segment.x = point.x - index * 18;
        segment.y = point.y;
      });
    },
    update(dt, nextEngine) {
      survived += dt;
      const steer = getSteering(nextEngine, head);
      const speed = 210;
      head.vx = lerp(head.vx, steer.x * speed, 0.1);
      head.vy = lerp(head.vy, steer.y * speed, 0.1);
      if (steer.x === 0 && steer.y === 0) {
        head.vx *= 0.94;
        head.vy *= 0.94;
      }
      head.x = clamp(head.x + head.vx * dt, 20, nextEngine.width - 20);
      head.y = clamp(head.y + head.vy * dt, 20, nextEngine.height - 20);
      segments[0].x = head.x;
      segments[0].y = head.y;
      for (let index = 1; index < segments.length; index += 1) {
        const lead = segments[index - 1];
        const bead = segments[index];
        const dx = lead.x - bead.x;
        const dy = lead.y - bead.y;
        const dist = Math.max(0.001, Math.hypot(dx, dy));
        const target = 17;
        bead.x += (dx / dist) * (dist - target) * 0.32;
        bead.y += (dy / dist) * (dist - target) * 0.32;
      }

      monomers.forEach((monomer) => {
        monomer.x += monomer.vx * dt;
        monomer.y += monomer.vy * dt;
        if (monomer.x < 22 || monomer.x > nextEngine.width - 22) monomer.vx *= -1;
        if (monomer.y < 22 || monomer.y > nextEngine.height - 22) monomer.vy *= -1;
        monomer.x = clamp(monomer.x, 22, nextEngine.width - 22);
        monomer.y = clamp(monomer.y, 22, nextEngine.height - 22);
        if (circleHit(head, monomer)) {
          const tail = segments[segments.length - 1];
          segments.push({ x: tail.x, y: tail.y, r: 10.5 });
          nextEngine.addScore(12);
          monomer.x = rand(36, nextEngine.width - 36);
          monomer.y = rand(36, nextEngine.height - 36);
          monomer.vx = rand(-16, 16);
          monomer.vy = rand(-16, 16);
          for (let i = 0; i < 6; i += 1) sparks.push(makeSpark(monomer.x, monomer.y, monomer.color));
        }
      });

      inhibitors.forEach((inhibitor, index) => {
        inhibitor.x += inhibitor.vx * dt;
        inhibitor.y += inhibitor.vy * dt;
        inhibitor.vx += Math.sin(nextEngine.time * 0.001 + inhibitor.phase) * 0.06;
        inhibitor.vy += Math.cos(nextEngine.time * 0.0013 + inhibitor.phase) * 0.06;
        if (inhibitor.x < inhibitor.r || inhibitor.x > nextEngine.width - inhibitor.r) inhibitor.vx *= -1;
        if (inhibitor.y < inhibitor.r || inhibitor.y > nextEngine.height - inhibitor.r) inhibitor.vy *= -1;
        inhibitor.x = clamp(inhibitor.x, inhibitor.r, nextEngine.width - inhibitor.r);
        inhibitor.y = clamp(inhibitor.y, inhibitor.r, nextEngine.height - inhibitor.r);

        if (hitCooldown <= 0 && segments.some((segment) => circleHit(segment, inhibitor, -2))) {
          hitCooldown = 0.65;
          integrity = Math.max(0, integrity - 16);
          nextEngine.addScore(-8);
          const removeCount = Math.min(3, Math.max(0, segments.length - 6));
          for (let i = 0; i < removeCount; i += 1) segments.pop();
          for (let i = 0; i < 12; i += 1) sparks.push(makeSpark(inhibitor.x, inhibitor.y, nextEngine.palette.warn));
          inhibitor.x = rand(90, nextEngine.width - 90);
          inhibitor.y = rand(90, nextEngine.height - 90);
          inhibitor.phase = rand(0, TAU);
          nextEngine.setMessage('Scission event: backbone shortened.', 1.2);
        }
      });

      hitCooldown -= dt;
      integrity = clamp(integrity + dt * 2.2, 0, 100);
      if (integrity <= 0) {
        integrity = 72;
        while (segments.length > 8) segments.pop();
        const point = respawnPoint(nextEngine, 96);
        head.x = point.x;
        head.y = point.y;
        segments.forEach((segment, index) => {
          segment.x = point.x - index * 18;
          segment.y = point.y;
        });
        nextEngine.setMessage('Network reset after accumulated scission.', 1.6);
      }
      nextEngine.setScore((segments.length - 8) * 12 + survived * 3);
      nextEngine.metricsText = `chain length ${segments.length} · monomer addition at one reactive end · inhibitors cut from the tail`;
      updateSparks(sparks, dt);
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(110,224,198,0.18)', 'rgba(125,211,252,0.18)');
      monomers.forEach((monomer) => {
        drawGlow(ctx, monomer.x, monomer.y, monomer.r * 2.2, monomer.color, 0.12);
        drawSphere(ctx, monomer.x, monomer.y, monomer.r, monomer.color, '#0b1220', 0.98);
      });
      inhibitors.forEach((inhibitor) => {
        drawGlow(ctx, inhibitor.x, inhibitor.y, inhibitor.r * 2.1, nextEngine.palette.warn, 0.12);
        drawSphere(ctx, inhibitor.x, inhibitor.y, inhibitor.r, '#ff8ea4', '#6b1025', 0.96);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i += 1) {
          const angle = inhibitor.phase + i * (TAU / 5) + nextEngine.time * 0.0012;
          ctx.beginPath();
          ctx.moveTo(inhibitor.x, inhibitor.y);
          ctx.lineTo(inhibitor.x + Math.cos(angle) * inhibitor.r * 1.15, inhibitor.y + Math.sin(angle) * inhibitor.r * 1.15);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.save();
      ctx.strokeStyle = 'rgba(143,243,255,0.48)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i += 1) ctx.lineTo(segments[i].x, segments[i].y);
      ctx.stroke();
      ctx.restore();
      segments.slice().reverse().forEach((segment, index) => {
        const t = index / Math.max(1, segments.length - 1);
        drawSphere(
          ctx,
          segment.x,
          segment.y,
          segment.r * (1 - t * 0.08),
          `hsla(${180 + t * 80}, 90%, ${78 - t * 14}%, 1)`,
          `hsla(${220 + t * 30}, 70%, ${30 + t * 8}%, 1)`,
          0.98
        );
      });
      drawSparks(ctx, sparks);
      drawBar(ctx, 18, 18, 220, integrity / 100, nextEngine.palette.good, 'integrity', nextEngine);
    }
  };
}

function createBrushChannelMode(engine) {
  const tracer = { x: engine.width * 0.22, y: engine.height * 0.5, vx: 0, vy: 0, r: 12 };
  const rows = [];
  const sparks = [];
  let integrity = 100;
  let survived = 0;
  let collected = 0;

  const spawnRow = (x) => ({
    x,
    width: 34,
    gapY: rand(engine.height * 0.3, engine.height * 0.7),
    gapH: rand(96, 140),
    phase: rand(0, TAU),
    sway: rand(10, 22),
    marker: { y: 0, collected: false }
  });

  function fillRows(width) {
    rows.length = 0;
    let x = width * 0.45;
    while (x < width + 120) {
      rows.push(spawnRow(x));
      x += 120;
    }
  }
  fillRows(engine.width);

  return {
    resize(nextEngine) {
      tracer.x = nextEngine.width * 0.22;
      tracer.y = nextEngine.height * 0.5;
      tracer.vx = 0;
      tracer.vy = 0;
      fillRows(nextEngine.width);
    },
    update(dt, nextEngine) {
      survived += dt;
      const steer = getSteering(nextEngine, tracer);
      tracer.vx = lerp(tracer.vx, steer.x * 220, 0.08);
      tracer.vy = lerp(tracer.vy, steer.y * 220, 0.08);
      tracer.vx *= 0.985;
      tracer.vy *= 0.985;
      tracer.x = clamp(tracer.x + tracer.vx * dt, 18, nextEngine.width - 18);
      tracer.y = clamp(tracer.y + tracer.vy * dt, 18, nextEngine.height - 18);

      const speed = 110;
      rows.forEach((row) => {
        row.x -= speed * dt;
        row.gapY += Math.sin(nextEngine.time * 0.001 + row.phase) * 0.2;
        row.marker.y = row.gapY;

        const insideX = tracer.x + tracer.r > row.x && tracer.x - tracer.r < row.x + row.width;
        const gapTop = row.gapY - row.gapH * 0.5;
        const gapBottom = row.gapY + row.gapH * 0.5;
        if (insideX && (tracer.y < gapTop || tracer.y > gapBottom)) {
          const correction = tracer.y < gapTop ? gapTop - tracer.y : gapBottom - tracer.y;
          tracer.y += correction * 0.18;
          tracer.vy *= 0.76;
          integrity = clamp(integrity - 18 * dt, 0, 100);
        }

        if (!row.marker.collected && Math.abs(tracer.x - (row.x + row.width * 0.5)) < 16 && Math.abs(tracer.y - row.marker.y) < 18) {
          row.marker.collected = true;
          collected += 1;
          for (let i = 0; i < 10; i += 1) sparks.push(makeSpark(row.x + row.width * 0.5, row.marker.y, nextEngine.palette.good));
        }
      });

      if (rows.length && rows[0].x + rows[0].width < -20) rows.shift();
      while (rows.length && rows[rows.length - 1].x < nextEngine.width - 80) {
        rows.push(spawnRow(rows[rows.length - 1].x + 120));
      }

      integrity = clamp(integrity + dt * 4, 0, 100);
      if (integrity <= 0) {
        integrity = 72;
        tracer.x = nextEngine.width * 0.22;
        tracer.y = nextEngine.height * 0.5;
        tracer.vx = 0;
        tracer.vy = 0;
        nextEngine.setMessage('Tracer reintroduced after repeated steric blocking.', 1.5);
      }
      nextEngine.setScore(survived * 3 + collected * 10);
      nextEngine.metricsText = 'grafted brushes breathe, narrowing and widening the transport gap';
      updateSparks(sparks, dt);
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(125,211,252,0.16)', 'rgba(136,164,255,0.16)');
      rows.forEach((row) => {
        const gapTop = row.gapY - row.gapH * 0.5;
        const gapBottom = row.gapY + row.gapH * 0.5;
        const strands = 7;
        ctx.save();
        ctx.lineWidth = 2.3;
        ctx.strokeStyle = 'rgba(125,211,252,0.44)';
        for (let i = 0; i < strands; i += 1) {
          const blend = i / Math.max(1, strands - 1);
          const offset = (blend - 0.5) * row.width * 0.88;
          const x = row.x + row.width * 0.5 + offset;
          const sway = Math.sin(nextEngine.time * 0.0015 + row.phase + blend * 1.6) * row.sway;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.quadraticCurveTo(x + sway * 0.45, gapTop * 0.45, x + sway, gapTop);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, nextEngine.height);
          ctx.quadraticCurveTo(x - sway * 0.45, gapBottom + (nextEngine.height - gapBottom) * 0.55, x - sway, gapBottom);
          ctx.stroke();
        }
        ctx.restore();
        if (!row.marker.collected) drawSphere(ctx, row.x + row.width * 0.5, row.marker.y, 8, nextEngine.palette.good, '#0e352d', 0.96);
      });
      drawGlow(ctx, tracer.x, tracer.y, tracer.r * 2.6, nextEngine.palette.accent, 0.16);
      drawSphere(ctx, tracer.x, tracer.y, tracer.r, '#f5f8ff', '#17385c', 1);
      drawSparks(ctx, sparks);
      drawBar(ctx, 18, 18, 220, integrity / 100, nextEngine.palette.good, 'free-volume access', nextEngine);
    }
  };
}

function createBondRepairMode(engine) {
  const catalyst = { x: engine.width * 0.5, y: engine.height * 0.5, vx: 0, vy: 0, r: 13 };
  const brokenPairs = Array.from({ length: 10 }, () => ({
    x: rand(engine.width * 0.18, engine.width * 1.1),
    y: rand(60, engine.height - 60),
    sep: rand(18, 28),
    angle: rand(0, TAU),
    speed: rand(60, 110)
  }));
  const hotSpots = Array.from({ length: 5 }, () => ({
    x: rand(90, engine.width),
    y: rand(60, engine.height - 60),
    r: rand(18, 24),
    vx: rand(-24, 22),
    vy: rand(-20, 20),
    phase: rand(0, TAU)
  }));
  const sparks = [];
  let integrity = 100;

  return {
    resize(nextEngine) {
      catalyst.x = nextEngine.width * 0.5;
      catalyst.y = nextEngine.height * 0.5;
      catalyst.vx = 0;
      catalyst.vy = 0;
    },
    update(dt, nextEngine) {
      const steer = getSteering(nextEngine, catalyst);
      catalyst.vx = lerp(catalyst.vx, steer.x * 230, 0.09);
      catalyst.vy = lerp(catalyst.vy, steer.y * 230, 0.09);
      catalyst.vx *= 0.985;
      catalyst.vy *= 0.985;
      catalyst.x = clamp(catalyst.x + catalyst.vx * dt, 20, nextEngine.width - 20);
      catalyst.y = clamp(catalyst.y + catalyst.vy * dt, 20, nextEngine.height - 20);

      brokenPairs.forEach((pair) => {
        pair.x -= pair.speed * dt;
        pair.y += Math.sin(nextEngine.time * 0.0012 + pair.angle) * 0.28;
        if (pair.x < -40) {
          pair.x = nextEngine.width + rand(40, 180);
          pair.y = rand(60, nextEngine.height - 60);
          pair.sep = rand(18, 30);
          pair.angle = rand(0, TAU);
          pair.speed = rand(60, 110);
        }
        if (Math.hypot(catalyst.x - pair.x, catalyst.y - pair.y) < pair.sep + catalyst.r + 6) {
          nextEngine.addScore(14);
          integrity = clamp(integrity + 8, 0, 100);
          for (let i = 0; i < 12; i += 1) sparks.push(makeSpark(pair.x, pair.y, nextEngine.palette.good));
          pair.x = nextEngine.width + rand(60, 180);
          pair.y = rand(60, nextEngine.height - 60);
          pair.sep = rand(18, 30);
          pair.angle = rand(0, TAU);
        }
      });

      hotSpots.forEach((spot) => {
        spot.x += spot.vx * dt;
        spot.y += spot.vy * dt + Math.sin(nextEngine.time * 0.0012 + spot.phase) * 0.3;
        if (spot.x < spot.r || spot.x > nextEngine.width - spot.r) spot.vx *= -1;
        if (spot.y < spot.r || spot.y > nextEngine.height - spot.r) spot.vy *= -1;
        if (circleHit(catalyst, spot)) {
          integrity = clamp(integrity - 24, 0, 100);
          nextEngine.addScore(-6);
          for (let i = 0; i < 12; i += 1) sparks.push(makeSpark(spot.x, spot.y, nextEngine.palette.warn));
          spot.x = rand(90, nextEngine.width - 90);
          spot.y = rand(60, nextEngine.height - 60);
          nextEngine.setMessage('Reactive hot spot: additional scission pressure.', 1.2);
        }
      });

      integrity = clamp(integrity + dt * 1.1, 0, 100);
      if (integrity <= 0) {
        integrity = 74;
        catalyst.x = nextEngine.width * 0.5;
        catalyst.y = nextEngine.height * 0.5;
        nextEngine.setMessage('Connectivity collapsed; repair sweep restarted.', 1.5);
      }
      nextEngine.metricsText = 'heal split bond pairs before new scission hot spots disconnect the network';
      updateSparks(sparks, dt);
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(196,181,253,0.16)', 'rgba(255,142,164,0.14)');
      brokenPairs.forEach((pair) => {
        const ax = pair.x + Math.cos(pair.angle) * pair.sep * 0.5;
        const ay = pair.y + Math.sin(pair.angle) * pair.sep * 0.5;
        const bx = pair.x - Math.cos(pair.angle) * pair.sep * 0.5;
        const by = pair.y - Math.sin(pair.angle) * pair.sep * 0.5;
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,0.26)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
        drawSphere(ctx, ax, ay, 9, nextEngine.palette.accent, '#17385c', 0.96);
        drawSphere(ctx, bx, by, 9, nextEngine.palette.accent2, '#252a60', 0.96);
      });
      hotSpots.forEach((spot) => {
        drawGlow(ctx, spot.x, spot.y, spot.r * 2.2, nextEngine.palette.warn, 0.14);
        drawSphere(ctx, spot.x, spot.y, spot.r, '#ff8ea4', '#5e0d22', 0.92);
      });
      drawGlow(ctx, catalyst.x, catalyst.y, catalyst.r * 2.5, nextEngine.palette.good, 0.16);
      drawSphere(ctx, catalyst.x, catalyst.y, catalyst.r, '#f8fffe', '#1a4238', 0.98);
      drawSparks(ctx, sparks);
      drawBar(ctx, 18, 18, 220, integrity / 100, nextEngine.palette.good, 'network connectivity', nextEngine);
    }
  };
}

const REAGENTS = [
  { id: 'diol', label: 'HO', color: '#86efac', matches: ['diacid'], product: 'polyester' },
  { id: 'diacid', label: 'COCl', color: '#fca5a5', matches: ['diol', 'diamine'], product: 'acyl coupling' },
  { id: 'diamine', label: 'NH2', color: '#7dd3fc', matches: ['diacid'], product: 'polyamide' },
  { id: 'epoxide', label: 'epoxy', color: '#fcd34d', matches: ['amine'], product: 'epoxy network' },
  { id: 'amine', label: 'amine', color: '#c4b5fd', matches: ['epoxide'], product: 'amine cure' },
  { id: 'diene', label: 'diene', color: '#fb7185', matches: ['dienophile'], product: 'Diels–Alder' },
  { id: 'dienophile', label: 'ene*', color: '#f59e0b', matches: ['diene'], product: 'Diels–Alder' },
  { id: 'thiol', label: 'thiol', color: '#38bdf8', matches: ['ene'], product: 'thiol–ene' },
  { id: 'ene', label: 'alkene', color: '#34d399', matches: ['thiol'], product: 'thiol–ene' }
];
const REAGENT_MAP = new Map(REAGENTS.map((item) => [item.id, item]));

function createReactionMatchMode(engine) {
  const cols = 5;
  const rows = 4;
  const board = [];
  let selected = null;
  let combo = 0;
  let tileSize = 0;
  let originX = 0;
  let originY = 0;

  const randomTile = () => ({
    reagent: choice(REAGENTS).id,
    pulse: 0,
    flash: 0
  });

  const resizeBoard = (nextEngine) => {
    tileSize = Math.min(118, Math.min((nextEngine.width - 120) / cols, (nextEngine.height - 180) / rows));
    originX = (nextEngine.width - cols * tileSize) * 0.5;
    originY = (nextEngine.height - rows * tileSize) * 0.5 + 10;
  };

  for (let index = 0; index < cols * rows; index += 1) board.push(randomTile());
  resizeBoard(engine);

  const locateTile = (point) => {
    const col = Math.floor((point.x - originX) / tileSize);
    const row = Math.floor((point.y - originY) / tileSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return -1;
    return row * cols + col;
  };

  const areCompatible = (a, b) => {
    const reagentA = REAGENT_MAP.get(a.reagent);
    return reagentA?.matches.includes(b.reagent);
  };

  return {
    resize(nextEngine) {
      resizeBoard(nextEngine);
    },
    pointerDown(point, nextEngine) {
      const tileIndex = locateTile(point);
      if (tileIndex < 0) return;
      if (selected === null) {
        selected = tileIndex;
        board[tileIndex].pulse = 1;
        return;
      }
      if (selected === tileIndex) {
        selected = null;
        return;
      }
      const first = board[selected];
      const second = board[tileIndex];
      if (areCompatible(first, second) || areCompatible(second, first)) {
        combo += 1;
        nextEngine.addScore(16 + combo * 4);
        const product = REAGENT_MAP.get(first.reagent).matches.includes(second.reagent)
          ? REAGENT_MAP.get(first.reagent).product
          : REAGENT_MAP.get(second.reagent).product;
        nextEngine.setMessage(`reaction formed: ${product}`, 1.4);
        board[selected] = randomTile();
        board[tileIndex] = randomTile();
        board[selected].flash = 1;
        board[tileIndex].flash = 1;
      } else {
        combo = 0;
        first.flash = 1;
        second.flash = 1;
        nextEngine.setMessage('Those reagents are not a standard pair here.', 1.1);
      }
      selected = null;
    },
    update(dt, nextEngine) {
      board.forEach((tile) => {
        tile.pulse = Math.max(0, tile.pulse - dt * 2.4);
        tile.flash = Math.max(0, tile.flash - dt * 3.4);
      });
      nextEngine.metricsText = `click two compatible reagents to practice common polymer-forming pairs · combo ${combo}`;
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(244,114,182,0.14)', 'rgba(192,132,252,0.14)');
      ctx.save();
      ctx.fillStyle = nextEngine.palette.ink;
      ctx.font = '600 15px Inter, system-ui, sans-serif';
      ctx.fillText('reaction board', originX, originY - 18);
      ctx.restore();

      board.forEach((tile, index) => {
        const reagent = REAGENT_MAP.get(tile.reagent);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = originX + col * tileSize;
        const y = originY + row * tileSize;
        const active = selected === index;
        const pulse = active ? 1 + Math.sin(nextEngine.time * 0.01) * 0.02 : 1 + tile.pulse * 0.03;
        const inset = 8;
        const size = tileSize - inset * 2;
        ctx.save();
        ctx.translate(x + tileSize * 0.5, y + tileSize * 0.5);
        ctx.scale(pulse, pulse);
        roundRect(ctx, -size * 0.5, -size * 0.5, size, size, 18);
        ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(5, 10, 20, 0.54)';
        ctx.fill();
        ctx.lineWidth = active ? 2.4 : 1.3;
        ctx.strokeStyle = tile.flash > 0 ? nextEngine.palette.warn : 'rgba(255,255,255,0.12)';
        ctx.stroke();
        drawGlow(ctx, 0, 0, size * 0.34, reagent.color, 0.14);
        drawSphere(ctx, 0, -8, size * 0.17, reagent.color, '#132033', 0.98);
        ctx.fillStyle = nextEngine.palette.ink;
        ctx.font = '700 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(reagent.label, 0, 22);
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillStyle = nextEngine.palette.soft;
        ctx.fillText(reagent.id, 0, 38);
        ctx.restore();
      });
    }
  };
}

function createChargeTacticsMode(engine) {
  const cols = 7;
  const rows = 7;
  let cellSize = 0;
  let originX = 0;
  let originY = 0;
  let mobility = 100;
  let board = [];
  let player = { row: 0, col: 0 };

  const resizeBoard = (nextEngine) => {
    cellSize = Math.min(68, Math.min((nextEngine.width - 140) / cols, (nextEngine.height - 180) / rows));
    originX = (nextEngine.width - cols * cellSize) * 0.5;
    originY = (nextEngine.height - rows * cellSize) * 0.5 + 10;
  };

  const generateBoard = () => {
    board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ type: choice(['site', 'site', 'site', 'site', 'trap', 'block', 'dopant']) })));
    let r = Math.floor(rand(0, rows));
    player = { row: r, col: 0 };
    board[r][0].type = 'start';
    for (let c = 1; c < cols; c += 1) {
      r = clamp(r + Math.floor(rand(-1.2, 1.8)), 0, rows - 1);
      board[r][c].type = c === cols - 1 ? 'collector' : (Math.random() < 0.3 ? 'dopant' : 'site');
    }
    mobility = Math.max(mobility, 75);
  };

  const cellAtPoint = (point) => {
    const col = Math.floor((point.x - originX) / cellSize);
    const row = Math.floor((point.y - originY) / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { row, col };
  };

  const attemptMove = (target, nextEngine) => {
    if (!target) return;
    if (target.row < 0 || target.row >= rows || target.col < 0 || target.col >= cols) return;
    const dr = Math.abs(target.row - player.row);
    const dc = Math.abs(target.col - player.col);
    if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return;
    const cell = board[target.row][target.col];
    if (cell.type === 'block') {
      nextEngine.setMessage('Blocked site: no hop allowed.', 1.0);
      return;
    }
    player = target;
    if (cell.type === 'trap') {
      mobility = clamp(mobility - 20, 0, 100);
      nextEngine.addScore(-3);
      nextEngine.setMessage('Trap state entered: mobility reduced.', 1.1);
    } else if (cell.type === 'dopant') {
      mobility = clamp(mobility + 6, 0, 100);
      nextEngine.addScore(6);
    } else if (cell.type === 'collector') {
      nextEngine.addScore(24);
      mobility = clamp(mobility + 14, 0, 100);
      generateBoard();
      nextEngine.setMessage('Collector reached: field rerolled.', 1.2);
      return;
    } else {
      nextEngine.addScore(1);
    }
    mobility = clamp(mobility - 3, 0, 100);
    if (mobility <= 0) {
      mobility = 82;
      generateBoard();
      nextEngine.setMessage('Transport pathway lost; new lattice generated.', 1.3);
    }
  };

  resizeBoard(engine);
  generateBoard();

  return {
    resize(nextEngine) {
      resizeBoard(nextEngine);
    },
    pointerDown(point, nextEngine) {
      attemptMove(cellAtPoint(point), nextEngine);
    },
    keyDown(key, nextEngine) {
      const move = {
        arrowup: { row: player.row - 1, col: player.col },
        w: { row: player.row - 1, col: player.col },
        arrowdown: { row: player.row + 1, col: player.col },
        s: { row: player.row + 1, col: player.col },
        arrowleft: { row: player.row, col: player.col - 1 },
        a: { row: player.row, col: player.col - 1 },
        arrowright: { row: player.row, col: player.col + 1 },
        d: { row: player.row, col: player.col + 1 }
      }[key];
      if (move) attemptMove(move, nextEngine);
    },
    update(dt, nextEngine) {
      mobility = clamp(mobility + dt * 0.8, 0, 100);
      nextEngine.metricsText = 'plan a connected route through conducting, doped, trapped, and blocked sites';
    },
    draw(ctx, nextEngine) {
      drawBackdrop(ctx, nextEngine, 'rgba(125,211,252,0.15)', 'rgba(250,204,21,0.14)');
      ctx.save();
      ctx.fillStyle = nextEngine.palette.ink;
      ctx.font = '600 15px Inter, system-ui, sans-serif';
      ctx.fillText('charge-hopping board', originX, originY - 18);
      ctx.restore();

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const cell = board[row][col];
          const x = originX + col * cellSize;
          const y = originY + row * cellSize;
          const inset = 6;
          const typeStyle = {
            site: { fill: 'rgba(41, 86, 138, 0.45)', label: 'site', dot: nextEngine.palette.accent },
            dopant: { fill: 'rgba(166, 118, 24, 0.44)', label: 'dopant', dot: '#fcd34d' },
            trap: { fill: 'rgba(132, 37, 54, 0.44)', label: 'trap', dot: nextEngine.palette.warn },
            block: { fill: 'rgba(98, 107, 126, 0.42)', label: 'block', dot: '#94a3b8' },
            start: { fill: 'rgba(30, 116, 92, 0.46)', label: 'start', dot: nextEngine.palette.good },
            collector: { fill: 'rgba(76, 106, 192, 0.48)', label: 'sink', dot: '#e9f3ff' }
          }[cell.type];
          roundRect(ctx, x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2, 14);
          ctx.fillStyle = typeStyle.fill;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.stroke();
          drawSphere(ctx, x + cellSize * 0.5, y + cellSize * 0.42, cellSize * 0.14, typeStyle.dot, '#102030', 0.96);
          ctx.fillStyle = nextEngine.palette.soft;
          ctx.font = '11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(typeStyle.label, x + cellSize * 0.5, y + cellSize * 0.78);
        }
      }

      const px = originX + player.col * cellSize + cellSize * 0.5;
      const py = originY + player.row * cellSize + cellSize * 0.42;
      drawGlow(ctx, px, py, cellSize * 0.24, nextEngine.palette.ink, 0.16);
      drawSphere(ctx, px, py, cellSize * 0.14, '#ffffff', '#274c7c', 1);
      drawBar(ctx, 18, 18, 220, mobility / 100, nextEngine.palette.accent, 'mobility', nextEngine);
    }
  };
}

const MODE_FACTORIES = {
  'chain-growth-runner': createChainGrowthMode,
  'brush-channel': createBrushChannelMode,
  'bond-repair': createBondRepairMode,
  'reaction-match': createReactionMatchMode,
  'charge-tactics': createChargeTacticsMode
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
    option.textContent = `${mode.title} · ${mode.subtitle}`;
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
