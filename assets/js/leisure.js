import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, choice, initFooterYear, setMeta, smoothScrollForHashes, clamp } from './utils.js';

const TAU = Math.PI * 2;
const FRAME = 1000 / 60;
const BEAD_COLORS = ['#7dd3fc', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#fb7185'];
const WARM_COLORS = ['#fbbf24', '#fb7185', '#f97316', '#fca5a5'];
const COOL_COLORS = ['#7dd3fc', '#38bdf8', '#22d3ee', '#5eead4', '#86efac'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function length(x, y) {
  return Math.hypot(x, y);
}

function normalize(x, y, fallbackX = 0, fallbackY = -1) {
  const mag = Math.hypot(x, y);
  if (mag < 0.0001) return { x: fallbackX, y: fallbackY };
  return { x: x / mag, y: y / mag };
}

function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function circleHit(a, b, extra = 0) {
  const r = a.r + b.r + extra;
  return distanceSq(a, b) <= r * r;
}

function circleRect(circle, rect) {
  const x = clamp(circle.x, rect.x, rect.x + rect.w);
  const y = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - x;
  const dy = circle.y - y;
  return dx * dx + dy * dy <= circle.r * circle.r;
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

function readGamePalette() {
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

function inputVector(engine) {
  const left = engine.keys.has('ArrowLeft') || engine.keys.has('KeyA');
  const right = engine.keys.has('ArrowRight') || engine.keys.has('KeyD');
  const up = engine.keys.has('ArrowUp') || engine.keys.has('KeyW');
  const down = engine.keys.has('ArrowDown') || engine.keys.has('KeyS');
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  return normalize(x, y, 0, 0);
}

function pointerRecent(engine, ttl = 2200) {
  return engine.pointer.active && engine.now - engine.pointer.movedAt < ttl;
}

function loadBest(modeId) {
  try {
    return Number(localStorage.getItem(`haoyu-rest-best:${modeId}`) || 0);
  } catch {
    return 0;
  }
}

function saveBest(modeId, value) {
  try {
    const best = Math.max(loadBest(modeId), value);
    localStorage.setItem(`haoyu-rest-best:${modeId}`, `${best}`);
    return best;
  } catch {
    return Math.max(loadBest(modeId), value);
  }
}

function finalizeRun(modeId, score) {
  const value = Math.max(0, Math.floor(score));
  return saveBest(modeId, value);
}

function burst(list, x, y, count, color, speed = 2.3, spread = TAU) {
  for (let index = 0; index < count; index += 1) {
    const angle = spread === TAU
      ? (index / count) * TAU + rand(-0.2, 0.2)
      : -spread * 0.5 + (index / Math.max(1, count - 1)) * spread + rand(-0.08, 0.08);
    const velocity = rand(speed * 0.55, speed * 1.15);
    list.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 16 + Math.random() * 18,
      maxLife: 28,
      size: 1.4 + Math.random() * 2.8,
      color
    });
  }
}

function updateParticles(particles, step) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.life -= 1 * step;
    if (particle.life <= 0) particles.splice(index, 1);
  }
}

function drawParticles(ctx, particles) {
  particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function drawBackdrop(ctx, engine, drift = 0) {
  const { width, height, palette } = engine;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.18, Math.max(width, height) * 0.25, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = palette.accent2;
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.76, Math.max(width, height) * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  const grid = 46;
  const ox = -((drift * 0.42) % grid);
  const oy = -((drift * 0.18) % grid);
  for (let x = ox; x < width + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = oy; y < height + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTextPanel(ctx, engine, lines, x, y, align = 'left') {
  const { palette } = engine;
  ctx.save();
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  const width = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0) + 24;
  const height = lines.length * 18 + 18;
  const boxX = align === 'left' ? x : x - width;
  roundRect(ctx, boxX, y, width, height, 16);
  ctx.globalAlpha = 0.74;
  ctx.fillStyle = palette.bg;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.grid;
  ctx.stroke();
  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? palette.ink : palette.soft;
    ctx.fillText(line, boxX + 12, y + 18 + index * 18);
  });
  ctx.restore();
}

function drawOverlay(ctx, engine, title, subtitle) {
  const { width, height, palette } = engine;
  const boxWidth = Math.min(width - 36, 360);
  const boxHeight = 118;
  const boxX = (width - boxWidth) * 0.5;
  const boxY = (height - boxHeight) * 0.5;
  ctx.save();
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 22);
  ctx.fillStyle = palette.bg;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.grid;
  ctx.stroke();

  ctx.fillStyle = palette.ink;
  ctx.font = '700 24px Inter, system-ui, sans-serif';
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, boxX + (boxWidth - titleWidth) * 0.5, boxY + 42);

  ctx.fillStyle = palette.soft;
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  const subtitleWidth = ctx.measureText(subtitle).width;
  ctx.fillText(subtitle, boxX + (boxWidth - subtitleWidth) * 0.5, boxY + 74);
  ctx.restore();
}

function drawBead(ctx, x, y, r, fill, options = {}) {
  const { outline = null, highlight = 'rgba(255,255,255,0.94)', haloAlpha = 0.18, alpha = 1 } = options;
  ctx.save();
  ctx.globalAlpha = alpha * haloAlpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.7, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.24, Math.max(1.8, r * 0.34), 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPolyline(ctx, points, color, width, shadow = null) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.strokeStyle = shadow;
    ctx.lineWidth = width + 2.6;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

function makeFollowerChain(count, x, y, radius = 7) {
  return Array.from({ length: count }, (_, index) => ({
    x: x - index * (radius * 2.2),
    y,
    vx: 0,
    vy: 0,
    r: radius
  }));
}

function relaxFollowerChain(segments, anchor, step, spacing = 18, stiffness = 0.24, damping = 0.76) {
  let targetX = anchor.x;
  let targetY = anchor.y;
  segments.forEach((segment) => {
    const dx = targetX - segment.x;
    const dy = targetY - segment.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desiredX = targetX - (dx / dist) * spacing;
    const desiredY = targetY - (dy / dist) * spacing;
    segment.vx = (segment.vx + (desiredX - segment.x) * stiffness * step) * damping;
    segment.vy = (segment.vy + (desiredY - segment.y) * stiffness * step) * damping;
    segment.x += segment.vx * step;
    segment.y += segment.vy * step;
    targetX = segment.x;
    targetY = segment.y;
  });
}

function drawPolymerChain(ctx, engine, head, segments, options = {}) {
  const colors = options.colors || BEAD_COLORS;
  const lineColor = options.lineColor || engine.palette.accent;
  const shadow = options.shadow || 'rgba(0,0,0,0.18)';
  const lineWidth = options.lineWidth || 4.6;
  const headColor = options.headColor || engine.palette.ink;
  const outline = options.outline || engine.palette.accent;
  const points = [head, ...segments];
  drawPolyline(ctx, points, lineColor, lineWidth, shadow);
  points.forEach((point, index) => {
    const color = index === 0 ? headColor : colors[(index - 1) % colors.length];
    const radius = index === 0 ? point.r : point.r ?? 6.6;
    drawBead(ctx, point.x, point.y, radius, color, {
      outline: index === 0 ? outline : null,
      haloAlpha: index === 0 ? 0.22 : 0.15
    });
  });
}

function spawnEdgePoint(engine, margin = 24) {
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) return { x: rand(0, engine.width), y: -margin };
  if (edge === 1) return { x: engine.width + margin, y: rand(0, engine.height) };
  if (edge === 2) return { x: rand(0, engine.width), y: engine.height + margin };
  return { x: -margin, y: rand(0, engine.height) };
}

function buildEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const engine = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    now: performance.now(),
    lastTime: performance.now(),
    palette: readGamePalette(),
    pointer: { x: 0, y: 0, px: 0, py: 0, down: false, active: false, movedAt: 0 },
    keys: new Set(),
    raf: 0,
    mode: null,
    modeApi: null,
    modeId: null
  };

  function size() {
    const rect = canvas.getBoundingClientRect();
    engine.width = Math.max(1, Math.floor(rect.width));
    engine.height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(engine.width * engine.dpr);
    canvas.height = Math.floor(engine.height * engine.dpr);
    ctx.setTransform(engine.dpr, 0, 0, engine.dpr, 0, 0);
    engine.palette = readGamePalette();
    engine.modeApi?.resize?.(engine);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    const source = touch || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  }

  function movePointer(event) {
    const { x, y } = pointFromEvent(event);
    engine.pointer.px = engine.pointer.x;
    engine.pointer.py = engine.pointer.y;
    engine.pointer.x = x;
    engine.pointer.y = y;
    engine.pointer.active = true;
    engine.pointer.movedAt = performance.now();
    engine.modeApi?.move?.(engine, x, y, engine.pointer.down);
  }

  function downPointer(event) {
    movePointer(event);
    engine.pointer.down = true;
    engine.modeApi?.down?.(engine, engine.pointer.x, engine.pointer.y);
  }

  function upPointer(event) {
    if (event) movePointer(event);
    engine.pointer.down = false;
    engine.modeApi?.up?.(engine, engine.pointer.x, engine.pointer.y);
  }

  function leavePointer() {
    engine.pointer.down = false;
    engine.pointer.active = false;
  }

  function handleKey(event, isDown) {
    const tracked = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
    if (tracked.includes(event.code)) event.preventDefault();
    if (isDown) {
      if (engine.keys.has(event.code)) return;
      engine.keys.add(event.code);
    } else {
      engine.keys.delete(event.code);
    }
    engine.modeApi?.key?.(engine, event.code, isDown);
  }

  function frame(now) {
    engine.now = now;
    const dt = Math.min(34, now - engine.lastTime || FRAME);
    engine.lastTime = now;
    engine.palette = readGamePalette();
    engine.modeApi?.update?.(engine, ctx, dt, now);
    engine.raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('mousemove', movePointer);
  canvas.addEventListener('mousedown', downPointer);
  canvas.addEventListener('mouseleave', leavePointer);
  canvas.addEventListener('touchstart', downPointer, { passive: true });
  canvas.addEventListener('touchmove', movePointer, { passive: true });
  canvas.addEventListener('touchend', upPointer, { passive: true });
  canvas.addEventListener('touchcancel', leavePointer, { passive: true });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('mouseup', upPointer);
  window.addEventListener('keydown', (event) => handleKey(event, true));
  window.addEventListener('keyup', (event) => handleKey(event, false));
  window.addEventListener('blur', () => {
    engine.keys.clear();
    engine.pointer.down = false;
  });
  window.addEventListener('resize', size);

  size();
  engine.raf = requestAnimationFrame(frame);

  return {
    engine,
    setMode(id, factory) {
      engine.modeApi?.destroy?.(engine, ctx);
      engine.mode = leisureModes.find((entry) => entry.id === id) || leisureModes[0];
      engine.modeId = engine.mode.id;
      engine.lastTime = performance.now();
      engine.modeApi = factory();
      engine.modeApi?.init?.(engine, ctx);
    },
    destroy() {
      cancelAnimationFrame(engine.raf);
      engine.modeApi?.destroy?.(engine, ctx);
      window.removeEventListener('resize', size);
      window.removeEventListener('mouseup', upPointer);
      canvas.removeEventListener('mousemove', movePointer);
      canvas.removeEventListener('mousedown', downPointer);
      canvas.removeEventListener('mouseleave', leavePointer);
      canvas.removeEventListener('touchstart', downPointer);
      canvas.removeEventListener('touchmove', movePointer);
      canvas.removeEventListener('touchend', upPointer);
      canvas.removeEventListener('touchcancel', leavePointer);
    }
  };
}

function bulletWeaveMode() {
  let player;
  let tail = [];
  let emitters = [];
  let bullets = [];
  let shots = [];
  let pickups = [];
  let particles = [];
  let score = 0;
  let best = loadBest('bullet-weave');
  let spawnTimer = 1080;
  let alive = true;
  let restartAt = 0;
  let pulse = 0;

  function reset(engine) {
    player = {
      x: engine.width * 0.5,
      y: engine.height * 0.68,
      vx: 0,
      vy: 0,
      r: 10.5,
      fire: 0
    };
    tail = makeFollowerChain(4, player.x - 18, player.y, 6.4);
    emitters = [];
    bullets = [];
    shots = [];
    pickups = [];
    particles = [];
    score = 0;
    spawnTimer = 1080;
    alive = true;
    restartAt = 0;
    pulse = 0;
  }

  function spawnEmitter(engine) {
    const point = spawnEdgePoint(engine, 34);
    emitters.push({
      x: point.x,
      y: point.y,
      r: rand(14, 18),
      hp: 4 + Math.floor(score / 120),
      fire: rand(900, 1300),
      angle: rand(0, TAU),
      spin: rand(-0.016, 0.016),
      driftX: rand(-0.2, 0.2),
      driftY: rand(-0.2, 0.2),
      pattern: Math.random() > 0.45 ? 'ring' : 'fan',
      tint: pick(WARM_COLORS)
    });
  }

  function addTailBead() {
    const last = tail.at(-1) || { x: player.x - 16, y: player.y, r: 6.4 };
    tail.push({ x: last.x, y: last.y, vx: 0, vy: 0, r: Math.min(7.2, last.r + 0.04) });
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1500;
    best = finalizeRun('bullet-weave', score);
    burst(particles, player.x, player.y, 22, engine.palette.warn, 3.1);
  }

  return {
    init(engine) {
      reset(engine);
    },
    resize(engine) {
      reset(engine);
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      pulse += 0.03 * step;
      drawBackdrop(ctx, engine, score * 0.3);

      if (alive) {
        score += 0.08 * step + Math.max(0, tail.length - 4) * 0.012 * step;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEmitter(engine);
          spawnTimer = Math.max(720, 1520 - score * 0.95 + rand(-120, 140));
        }

        const keys = inputVector(engine);
        if (pointerRecent(engine)) {
          player.vx += (engine.pointer.x - player.x) * 0.02 * step;
          player.vy += (engine.pointer.y - player.y) * 0.02 * step;
        } else {
          player.vx += keys.x * 0.55 * step;
          player.vy += keys.y * 0.55 * step;
        }
        player.vx *= 0.78;
        player.vy *= 0.78;
        player.x = clamp(player.x + player.vx * step * 3.8, 20, engine.width - 20);
        player.y = clamp(player.y + player.vy * step * 3.8, 20, engine.height - 20);
        relaxFollowerChain(tail, { x: player.x - 4, y: player.y }, step, 15, 0.28, 0.73);

        player.fire -= dt;
        if (player.fire <= 0 && emitters.length) {
          player.fire = Math.max(120, 185 - tail.length * 4);
          const target = emitters.reduce((bestTarget, emitter) => {
            if (!bestTarget) return emitter;
            return distanceSq(emitter, player) < distanceSq(bestTarget, player) ? emitter : bestTarget;
          }, null);
          if (target) {
            const aim = normalize(target.x - player.x, target.y - player.y, 0, -1);
            shots.push({
              x: player.x + aim.x * 12,
              y: player.y + aim.y * 12,
              vx: aim.x * 6.4,
              vy: aim.y * 6.4,
              r: 3.6,
              life: 80
            });
          }
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      emitters.forEach((emitter) => {
        emitter.x += emitter.driftX * step;
        emitter.y += emitter.driftY * step;
        emitter.angle += emitter.spin * step;
        emitter.fire -= dt;
        if (!alive) return;
        if (emitter.fire <= 0) {
          const density = Math.min(10, 6 + Math.floor(score / 120));
          const bulletSpeed = 1.82 + score * 0.0022;
          if (emitter.pattern === 'ring') {
            for (let i = 0; i < density; i += 1) {
              const angle = emitter.angle + (i / density) * TAU;
              bullets.push({
                x: emitter.x,
                y: emitter.y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                r: 4.4,
                color: emitter.tint
              });
            }
          } else {
            const aim = Math.atan2(player.y - emitter.y, player.x - emitter.x);
            const count = 5 + Math.floor(score / 180);
            for (let i = 0; i < count; i += 1) {
              const angle = aim - 0.6 + (i / Math.max(1, count - 1)) * 1.2 + emitter.spin * 12;
              bullets.push({
                x: emitter.x,
                y: emitter.y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                r: 4.2,
                color: emitter.tint
              });
            }
          }
          emitter.fire = Math.max(760, 1360 - score * 0.9 + rand(-80, 80));
        }
      });

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        const shot = shots[i];
        shot.x += shot.vx * step;
        shot.y += shot.vy * step;
        shot.life -= 1 * step;
        let removed = false;
        for (let j = emitters.length - 1; j >= 0; j -= 1) {
          if (circleHit(shot, emitters[j], -2)) {
            emitters[j].hp -= 1;
            burst(particles, shot.x, shot.y, 4, engine.palette.good, 1.8);
            shots.splice(i, 1);
            removed = true;
            if (emitters[j].hp <= 0) {
              score += 18;
              burst(particles, emitters[j].x, emitters[j].y, 10, engine.palette.accent, 2.6);
              const pickupCount = Math.random() > 0.72 ? 2 : 1;
              for (let k = 0; k < pickupCount; k += 1) {
                pickups.push({
                  x: emitters[j].x + rand(-12, 12),
                  y: emitters[j].y + rand(-12, 12),
                  vx: rand(-0.8, 0.8),
                  vy: rand(-0.8, 0.8),
                  r: 6.8,
                  color: pick(COOL_COLORS),
                  life: 1400
                });
              }
              emitters.splice(j, 1);
            }
            break;
          }
        }
        if (removed) continue;
        if (shot.life <= 0 || shot.x < -20 || shot.x > engine.width + 20 || shot.y < -20 || shot.y > engine.height + 20) {
          shots.splice(i, 1);
        }
      }

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        if (bullet.x < -24 || bullet.x > engine.width + 24 || bullet.y < -24 || bullet.y > engine.height + 24) {
          bullets.splice(i, 1);
          continue;
        }

        let absorbed = false;
        for (let j = tail.length - 1; j >= 3; j -= 1) {
          if (circleHit(bullet, tail[j], -1.5)) {
            bullets.splice(i, 1);
            absorbed = true;
            tail.splice(j, 1);
            burst(particles, bullet.x, bullet.y, 5, engine.palette.accent2, 1.8);
            break;
          }
        }
        if (absorbed) continue;
        if (alive && circleHit(bullet, player, -2)) {
          bullets.splice(i, 1);
          lose(engine);
          continue;
        }
      }

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i];
        pickup.x += pickup.vx * step;
        pickup.y += pickup.vy * step;
        pickup.vx *= 0.992;
        pickup.vy *= 0.992;
        pickup.life -= dt;
        if (pickup.life <= 0) {
          pickups.splice(i, 1);
          continue;
        }
        if (alive && circleHit(pickup, player, -2)) {
          pickups.splice(i, 1);
          if (tail.length < 14) addTailBead();
          score += 8;
          burst(particles, pickup.x, pickup.y, 7, pickup.color, 2.1);
        }
      }

      for (let i = emitters.length - 1; i >= 0; i -= 1) {
        if (alive && circleHit(emitters[i], player, -4)) {
          lose(engine);
        }
      }

      updateParticles(particles, step);

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = engine.palette.grid;
      for (let x = 24; x < engine.width; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(pulse + x * 0.03) * 20, engine.height);
        ctx.stroke();
      }
      ctx.restore();

      pickups.forEach((pickup) => {
        drawBead(ctx, pickup.x, pickup.y, pickup.r, pickup.color, { outline: engine.palette.accent2, haloAlpha: 0.22 });
      });

      emitters.forEach((emitter) => {
        ctx.save();
        ctx.translate(emitter.x, emitter.y);
        ctx.rotate(emitter.angle);
        ctx.strokeStyle = emitter.tint;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * TAU;
          ctx.moveTo(Math.cos(angle) * (emitter.r + 3), Math.sin(angle) * (emitter.r + 3));
          ctx.lineTo(Math.cos(angle) * (emitter.r + 9), Math.sin(angle) * (emitter.r + 9));
        }
        ctx.stroke();
        ctx.restore();
        drawBead(ctx, emitter.x, emitter.y, emitter.r, emitter.tint, { outline: engine.palette.ink, haloAlpha: 0.18 });
      });

      bullets.forEach((bullet) => {
        drawBead(ctx, bullet.x, bullet.y, bullet.r, bullet.color, { haloAlpha: 0.2 });
      });

      shots.forEach((shot) => {
        ctx.save();
        ctx.strokeStyle = engine.palette.good;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(shot.x - shot.vx * 0.6, shot.y - shot.vy * 0.6);
        ctx.lineTo(shot.x, shot.y);
        ctx.stroke();
        ctx.restore();
        drawBead(ctx, shot.x, shot.y, shot.r, engine.palette.good, { haloAlpha: 0.18 });
      });

      drawParticles(ctx, particles);
      drawPolymerChain(ctx, engine, player, tail, {
        colors: BEAD_COLORS,
        lineColor: 'rgba(143, 243, 255, 0.34)',
        headColor: engine.palette.ink,
        outline: engine.palette.accent,
        lineWidth: 5.3
      });

      drawTextPanel(ctx, engine, [
        'Reactive Barrage',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `Chain ${tail.length}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Reaction reset', 'Catalyst field auto-restarting…');
      }
    }
  };
}

function chainRunnerMode() {
  let head;
  let chain = [];
  let obstacles = [];
  let pickups = [];
  let particles = [];
  let score = 0;
  let speed = 2.7;
  let best = loadBest('chain-runner');
  let groundY = 0;
  let obstacleTimer = 1000;
  let pickupTimer = 620;
  let alive = true;
  let restartAt = 0;
  let stripes = [];

  function reset(engine) {
    groundY = engine.height * 0.74;
    head = {
      x: engine.width * 0.24,
      y: groundY,
      vy: 0,
      r: 11,
      jumps: 0
    };
    chain = makeFollowerChain(3, head.x - 18, head.y, 6.8);
    obstacles = [];
    pickups = [];
    particles = [];
    score = 0;
    speed = 2.7;
    obstacleTimer = 1020;
    pickupTimer = 620;
    alive = true;
    restartAt = 0;
    stripes = Array.from({ length: 14 }, (_, index) => ({
      x: (index / 14) * engine.width,
      width: rand(80, 180),
      y: engine.height * rand(0.24, 0.68),
      speed: rand(0.24, 0.72)
    }));
  }

  function addMonomer() {
    const last = chain.at(-1) || { x: head.x - 18, y: head.y, r: 6.8 };
    chain.push({ x: last.x, y: last.y, vx: 0, vy: 0, r: 6.8 });
  }

  function jump() {
    if (!alive) return;
    if (head.jumps < 1) {
      head.vy = -9.8 - speed * 0.1;
      head.jumps += 1;
      burst(particles, head.x - 6, groundY + 6, 5, '#ffffff', 2.2, Math.PI);
    }
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1600;
    best = finalizeRun('chain-runner', score);
    burst(particles, head.x, head.y, 18, engine.palette.warn, 3.1);
  }

  return {
    init(engine) {
      reset(engine);
    },
    resize(engine) {
      reset(engine);
    },
    down() {
      jump();
    },
    key(engine, code, isDown) {
      if (isDown && (code === 'Space' || code === 'ArrowUp' || code === 'KeyW')) jump();
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      drawBackdrop(ctx, engine, score * 0.55);

      if (alive) {
        score += speed * 0.18 * step + chain.length * 0.02 * step;
        speed += 0.00042 * step;
        obstacleTimer -= dt;
        pickupTimer -= dt;

        if (obstacleTimer <= 0) {
          const width = rand(28, 54);
          const height = rand(36, 96);
          obstacles.push({
            x: engine.width + width + rand(0, 40),
            y: groundY - height,
            w: width,
            h: height,
            color: pick(WARM_COLORS)
          });
          obstacleTimer = Math.max(820, 1380 - speed * 56 + rand(-100, 120));
        }

        if (pickupTimer <= 0) {
          pickups.push({
            x: engine.width + 40,
            y: groundY - rand(0, 95),
            r: 7,
            color: pick(COOL_COLORS)
          });
          pickupTimer = Math.max(430, 900 - chain.length * 18 + rand(-80, 120));
        }

        head.vy += 0.58 * step;
        head.y += head.vy * step;
        if (head.y >= groundY) {
          head.y = groundY;
          head.vy = 0;
          head.jumps = 0;
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      relaxFollowerChain(chain, { x: head.x - head.r * 0.8, y: head.y }, step, 17, 0.25, 0.76);

      stripes.forEach((stripe) => {
        stripe.x -= stripe.speed * speed * step;
        if (stripe.x + stripe.width < 0) {
          stripe.x = engine.width + rand(10, 140);
          stripe.width = rand(80, 180);
          stripe.y = engine.height * rand(0.24, 0.68);
          stripe.speed = rand(0.24, 0.72);
        }
      });

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i];
        pickup.x -= speed * 4.0 * step;
        if (pickup.x + pickup.r < -20) {
          pickups.splice(i, 1);
          continue;
        }
        if (alive && circleHit(head, pickup, -2)) {
          pickups.splice(i, 1);
          addMonomer();
          score += 12;
          burst(particles, pickup.x, pickup.y, 8, pickup.color, 2.3);
        }
      }

      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = obstacles[i];
        obstacle.x -= speed * 4.2 * step;
        if (obstacle.x + obstacle.w < -20) {
          obstacles.splice(i, 1);
          continue;
        }
        if (alive && circleRect(head, obstacle)) {
          lose(engine);
          continue;
        }
        if (alive) {
          for (let j = 0; j < chain.length; j += 1) {
            if (circleRect(chain[j], obstacle)) {
              lose(engine);
              break;
            }
          }
        }
      }

      updateParticles(particles, step);

      stripes.forEach((stripe) => {
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = engine.palette.grid;
        ctx.beginPath();
        ctx.moveTo(stripe.x, stripe.y);
        ctx.lineTo(stripe.x + stripe.width, stripe.y);
        ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      ctx.strokeStyle = engine.palette.soft;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 18);
      ctx.lineTo(engine.width, groundY + 18);
      ctx.stroke();
      ctx.restore();

      pickups.forEach((pickup) => drawBead(ctx, pickup.x, pickup.y, pickup.r, pickup.color, { outline: engine.palette.accent2, haloAlpha: 0.22 }));

      obstacles.forEach((obstacle) => {
        ctx.save();
        roundRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 12);
        ctx.fillStyle = obstacle.color;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = obstacle.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.w * 0.25, obstacle.y + 8);
        ctx.lineTo(obstacle.x + obstacle.w * 0.75, obstacle.y + obstacle.h - 8);
        ctx.moveTo(obstacle.x + obstacle.w * 0.75, obstacle.y + 8);
        ctx.lineTo(obstacle.x + obstacle.w * 0.25, obstacle.y + obstacle.h - 8);
        ctx.stroke();
        ctx.restore();
      });

      drawParticles(ctx, particles);
      drawPolymerChain(ctx, engine, head, chain, {
        colors: BEAD_COLORS,
        lineColor: 'rgba(143, 243, 255, 0.32)',
        headColor: engine.palette.ink,
        outline: engine.palette.accent,
        lineWidth: 5.2
      });

      drawTextPanel(ctx, engine, [
        'Chain-Growth Runner',
        `Distance ${Math.floor(score)}`,
        `Best ${best}`,
        `Length ${chain.length + 1}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Chain snapped', 'Auto-restarting the polymerization lane…');
      }
    }
  };
}

function survivorFieldMode() {
  let player;
  let orbitals = [];
  let bullets = [];
  let enemies = [];
  let pickups = [];
  let particles = [];
  let score = 0;
  let kills = 0;
  let stageTime = 0;
  let best = loadBest('survivor-field');
  let spawnTimer = 0;
  let alive = true;
  let restartAt = 0;

  function reset(engine) {
    player = {
      x: engine.width * 0.5,
      y: engine.height * 0.54,
      vx: 0,
      vy: 0,
      r: 12,
      hp: 4,
      invuln: 0,
      fire: 0
    };
    orbitals = Array.from({ length: 3 }, (_, index) => ({ radius: 24 + index * 10, angle: index * (TAU / 3) }));
    bullets = [];
    enemies = [];
    pickups = [];
    particles = [];
    score = 0;
    kills = 0;
    stageTime = 0;
    spawnTimer = 0;
    alive = true;
    restartAt = 0;
  }

  function spawnEnemy(engine) {
    const point = spawnEdgePoint(engine, 28);
    const type = pick([
      { color: '#fb7185', speed: rand(0.9, 1.25), hp: 1, r: rand(10, 14), label: 'quencher' },
      { color: '#f59e0b', speed: rand(0.8, 1.1), hp: 2, r: rand(12, 16), label: 'entangler' },
      { color: '#60a5fa', speed: rand(1.0, 1.4), hp: 1, r: rand(9, 13), label: 'radical' }
    ]);
    enemies.push({
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      ...type
    });
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1700;
    best = finalizeRun('survivor-field', score);
    burst(particles, player.x, player.y, 24, '#ffffff', 3.4);
  }

  return {
    init(engine) {
      reset(engine);
    },
    resize(engine) {
      reset(engine);
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      drawBackdrop(ctx, engine, stageTime * 0.03);

      if (alive) {
        stageTime += dt;
        score = stageTime * 0.017 + kills * 8 + orbitals.length * 3;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy(engine);
          spawnTimer = Math.max(260, 860 - Math.min(420, stageTime * 0.01));
        }

        const keys = inputVector(engine);
        let moveX = keys.x;
        let moveY = keys.y;
        if (pointerRecent(engine)) {
          const dir = normalize(engine.pointer.x - player.x, engine.pointer.y - player.y, 0, 0);
          const dist = length(engine.pointer.x - player.x, engine.pointer.y - player.y);
          if (dist > 12) {
            moveX = dir.x * Math.min(1, dist / 90);
            moveY = dir.y * Math.min(1, dist / 90);
          }
        }
        player.vx += moveX * 0.42 * step;
        player.vy += moveY * 0.42 * step;
        player.vx *= 0.82;
        player.vy *= 0.82;
        player.x = clamp(player.x + player.vx * step * 4.2, 18, engine.width - 18);
        player.y = clamp(player.y + player.vy * step * 4.2, 18, engine.height - 18);
        player.invuln = Math.max(0, player.invuln - dt);

        player.fire -= dt;
        if (player.fire <= 0) {
          player.fire = Math.max(90, 220 - orbitals.length * 9);
          const target = enemies.reduce((bestTarget, enemy) => {
            if (!bestTarget) return enemy;
            return distanceSq(enemy, player) < distanceSq(bestTarget, player) ? enemy : bestTarget;
          }, null);
          if (target) {
            const count = Math.min(5, 1 + Math.floor((orbitals.length - 1) / 2));
            const spread = count === 1 ? [0] : Array.from({ length: count }, (_, index) => -0.22 + (index / (count - 1)) * 0.44);
            const originPoints = [{ x: player.x, y: player.y }, ...orbitals.slice(0, count - 1).map((orb) => ({ x: player.x + Math.cos(orb.angle) * orb.radius, y: player.y + Math.sin(orb.angle) * orb.radius }))];
            spread.forEach((offset, index) => {
              const origin = originPoints[index] || originPoints[0];
              const base = Math.atan2(target.y - origin.y, target.x - origin.x) + offset;
              bullets.push({
                x: origin.x,
                y: origin.y,
                vx: Math.cos(base) * 6.2,
                vy: Math.sin(base) * 6.2,
                r: 3.6,
                color: pick(COOL_COLORS),
                life: 76
              });
            });
          }
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      orbitals.forEach((orbital, index) => {
        orbital.angle += (0.026 + index * 0.0028) * step * (index % 2 === 0 ? 1 : -1);
      });

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        bullet.life -= 1 * step;
        if (bullet.life <= 0 || bullet.x < -24 || bullet.x > engine.width + 24 || bullet.y < -24 || bullet.y > engine.height + 24) {
          bullets.splice(i, 1);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        const dir = normalize(player.x - enemy.x, player.y - enemy.y, 0, 0);
        enemy.vx = dir.x * enemy.speed;
        enemy.vy = dir.y * enemy.speed;
        enemy.x += enemy.vx * step;
        enemy.y += enemy.vy * step;

        let removed = false;
        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          if (circleHit(enemy, bullets[j])) {
            const bullet = bullets[j];
            bullets.splice(j, 1);
            enemy.hp -= 1;
            burst(particles, bullet.x, bullet.y, 4, bullet.color, 1.8);
            if (enemy.hp <= 0) {
              kills += 1;
              burst(particles, enemy.x, enemy.y, 10, enemy.color, 2.5);
              if (Math.random() > 0.62) {
                pickups.push({ x: enemy.x, y: enemy.y, r: 7.2, color: pick(COOL_COLORS), life: 2000 });
              }
              enemies.splice(i, 1);
              removed = true;
            }
            break;
          }
        }
        if (removed) continue;

        if (alive && player.invuln <= 0 && circleHit(enemy, player, -1.5)) {
          player.hp -= 1;
          player.invuln = 900;
          burst(particles, player.x, player.y, 10, engine.palette.warn, 2.5);
          if (player.hp <= 0) lose(engine);
        }
      }

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i];
        pickup.life -= dt;
        if (pickup.life <= 0) {
          pickups.splice(i, 1);
          continue;
        }
        if (alive && circleHit(player, pickup, -2)) {
          pickups.splice(i, 1);
          if (orbitals.length < 10) orbitals.push({ radius: 24 + orbitals.length * 8.5, angle: rand(0, TAU) });
          score += 14;
          if (player.hp < 4 && Math.random() > 0.55) player.hp += 1;
          burst(particles, pickup.x, pickup.y, 9, pickup.color, 2.3);
        }
      }

      updateParticles(particles, step);

      enemies.forEach((enemy) => {
        drawBead(ctx, enemy.x, enemy.y, enemy.r, enemy.color, { outline: engine.palette.ink, haloAlpha: 0.2 });
        ctx.save();
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
        ctx.stroke();
        ctx.restore();
      });

      bullets.forEach((bullet) => {
        ctx.save();
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(bullet.x - bullet.vx * 0.55, bullet.y - bullet.vy * 0.55);
        ctx.lineTo(bullet.x, bullet.y);
        ctx.stroke();
        ctx.restore();
      });

      pickups.forEach((pickup) => drawBead(ctx, pickup.x, pickup.y, pickup.r, pickup.color, { outline: engine.palette.accent2, haloAlpha: 0.22 }));
      drawParticles(ctx, particles);

      const orbitalPoints = orbitals.map((orbital) => ({
        x: player.x + Math.cos(orbital.angle) * orbital.radius,
        y: player.y + Math.sin(orbital.angle) * orbital.radius,
        r: 6.4
      }));
      drawPolymerChain(ctx, engine, player, orbitalPoints, {
        colors: BEAD_COLORS,
        lineColor: 'rgba(143, 243, 255, 0.22)',
        headColor: engine.palette.ink,
        outline: engine.palette.accent,
        lineWidth: 3.8,
        shadow: 'rgba(0,0,0,0.14)'
      });

      ctx.save();
      ctx.globalAlpha = player.invuln > 0 ? 0.5 + Math.sin(engine.now * 0.04) * 0.22 : 1;
      drawBead(ctx, player.x, player.y, player.r, engine.palette.ink, { outline: engine.palette.accent, haloAlpha: 0.26 });
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Conformation Survivor',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `Shell ${orbitals.length + 1} · HP ${Math.max(0, player.hp)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Field collapsed', 'Auto-restarting the conformation shell…');
      }
    }
  };
}

function driftShooterMode() {
  let ship;
  let tail = [];
  let rocks = [];
  let bullets = [];
  let particles = [];
  let score = 0;
  let best = loadBest('drift-shooter');
  let spawnTimer = 300;
  let alive = true;
  let restartAt = 0;

  function shapeFor(radius) {
    return Array.from({ length: 7 }, (_, index) => {
      const angle = (index / 7) * TAU;
      return { angle, scale: rand(0.8, 1.12) };
    });
  }

  function reset(engine) {
    ship = {
      x: engine.width * 0.5,
      y: engine.height * 0.52,
      vx: 0,
      vy: 0,
      r: 12,
      hp: 3,
      invuln: 0,
      fire: 0,
      angle: -Math.PI * 0.5
    };
    tail = makeFollowerChain(4, ship.x - 14, ship.y, 5.8);
    rocks = [];
    bullets = [];
    particles = [];
    score = 0;
    spawnTimer = 520;
    alive = true;
    restartAt = 0;
  }

  function spawnRock(engine, radius = rand(18, 32), x = null, y = null, vx = null, vy = null) {
    let px = x;
    let py = y;
    if (px == null || py == null) {
      const point = spawnEdgePoint(engine, radius + 18);
      px = point.x;
      py = point.y;
    }
    rocks.push({
      x: px,
      y: py,
      vx: vx ?? rand(-0.9, 0.9),
      vy: vy ?? rand(-0.9, 0.9),
      r: radius,
      spin: rand(-0.03, 0.03),
      angle: rand(0, TAU),
      hp: Math.max(1, Math.ceil(radius / 14)),
      shape: shapeFor(radius),
      color: pick(['#93c5fd', '#fca5a5', '#fcd34d', '#86efac'])
    });
  }

  function splitRock(rock) {
    if (rock.r < 20) return;
    for (let k = 0; k < 2; k += 1) {
      const angle = rand(0, TAU);
      spawnRock(
        { width: 0, height: 0 },
        rock.r * 0.58,
        rock.x + Math.cos(angle) * 6,
        rock.y + Math.sin(angle) * 6,
        rock.vx + Math.cos(angle) * rand(0.6, 1.4),
        rock.vy + Math.sin(angle) * rand(0.6, 1.4)
      );
    }
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1600;
    best = finalizeRun('drift-shooter', score);
    burst(particles, ship.x, ship.y, 22, '#ffffff', 3.4);
  }

  return {
    init(engine) {
      reset(engine);
    },
    resize(engine) {
      reset(engine);
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      drawBackdrop(ctx, engine, score * 0.3);

      if (alive) {
        score += 0.1 * step;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnRock(engine);
          spawnTimer = Math.max(360, 980 - score * 0.8 + rand(-120, 120));
        }

        const keys = inputVector(engine);
        let accelX = keys.x;
        let accelY = keys.y;
        if (pointerRecent(engine)) {
          const dir = normalize(engine.pointer.x - ship.x, engine.pointer.y - ship.y, 0, 0);
          const dist = length(engine.pointer.x - ship.x, engine.pointer.y - ship.y);
          if (dist > 14) {
            accelX = dir.x * Math.min(1, dist / 110);
            accelY = dir.y * Math.min(1, dist / 110);
          }
        }
        ship.vx += accelX * 0.28 * step;
        ship.vy += accelY * 0.28 * step;
        ship.vx *= 0.992;
        ship.vy *= 0.992;
        ship.x += ship.vx * step * 3.6;
        ship.y += ship.vy * step * 3.6;
        if (ship.x < -20) ship.x = engine.width + 20;
        if (ship.x > engine.width + 20) ship.x = -20;
        if (ship.y < -20) ship.y = engine.height + 20;
        if (ship.y > engine.height + 20) ship.y = -20;
        ship.invuln = Math.max(0, ship.invuln - dt);
        relaxFollowerChain(tail, { x: ship.x - 2, y: ship.y }, step, 15, 0.24, 0.74);

        ship.fire -= dt;
        if (ship.fire <= 0) {
          ship.fire = 150;
          const target = pointerRecent(engine)
            ? { x: engine.pointer.x, y: engine.pointer.y }
            : rocks.reduce((bestTarget, rock) => {
                if (!bestTarget) return rock;
                return distanceSq(rock, ship) < distanceSq(bestTarget, ship) ? rock : bestTarget;
              }, null);
          if (target) {
            const aim = normalize(target.x - ship.x, target.y - ship.y, 0, -1);
            ship.angle = Math.atan2(aim.y, aim.x);
            bullets.push({
              x: ship.x + aim.x * 14,
              y: ship.y + aim.y * 14,
              vx: aim.x * 7.0 + ship.vx * 0.18,
              vy: aim.y * 7.0 + ship.vy * 0.18,
              r: 3.2,
              life: 92,
              color: pick(COOL_COLORS)
            });
          }
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        bullet.life -= 1 * step;
        if (bullet.life <= 0) {
          bullets.splice(i, 1);
          continue;
        }
        if (bullet.x < -20) bullet.x = engine.width + 20;
        if (bullet.x > engine.width + 20) bullet.x = -20;
        if (bullet.y < -20) bullet.y = engine.height + 20;
        if (bullet.y > engine.height + 20) bullet.y = -20;
      }

      for (let i = rocks.length - 1; i >= 0; i -= 1) {
        const rock = rocks[i];
        let removed = false;
        rock.x += rock.vx * step;
        rock.y += rock.vy * step;
        rock.angle += rock.spin * step;
        if (rock.x < -rock.r - 36) rock.x = engine.width + rock.r + 36;
        if (rock.x > engine.width + rock.r + 36) rock.x = -rock.r - 36;
        if (rock.y < -rock.r - 36) rock.y = engine.height + rock.r + 36;
        if (rock.y > engine.height + rock.r + 36) rock.y = -rock.r - 36;

        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          if (circleHit(rock, bullets[j])) {
            const bullet = bullets[j];
            bullets.splice(j, 1);
            rock.hp -= 1;
            burst(particles, bullet.x, bullet.y, 4, bullet.color, 1.8);
            if (rock.hp <= 0) {
              splitRock(rock);
              burst(particles, rock.x, rock.y, 10, rock.color, 2.5);
              score += Math.round(rock.r);
              if (Math.random() > 0.7 && tail.length < 9) {
                const last = tail.at(-1) || { x: ship.x - 18, y: ship.y, r: 5.8 };
                tail.push({ x: last.x, y: last.y, vx: 0, vy: 0, r: 5.8 });
              }
              rocks.splice(i, 1);
              removed = true;
            }
            break;
          }
        }
        if (removed) continue;

        if (alive && ship.invuln <= 0 && circleHit(ship, rock, -2)) {
          ship.hp -= 1;
          ship.invuln = 900;
          burst(particles, ship.x, ship.y, 10, engine.palette.warn, 2.6);
          if (ship.hp <= 0) lose(engine);
        }
      }

      updateParticles(particles, step);

      rocks.forEach((rock) => {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.angle);
        ctx.fillStyle = rock.color;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        rock.shape.forEach((node, index) => {
          const radius = rock.r * node.scale;
          const px = Math.cos(node.angle) * radius;
          const py = Math.sin(node.angle) * radius;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rock.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        drawBead(ctx, rock.x, rock.y, Math.max(4.5, rock.r * 0.28), rock.color, { haloAlpha: 0.12 });
      });

      bullets.forEach((bullet) => {
        ctx.save();
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bullet.x - bullet.vx * 0.55, bullet.y - bullet.vy * 0.55);
        ctx.lineTo(bullet.x, bullet.y);
        ctx.stroke();
        ctx.restore();
      });

      drawParticles(ctx, particles);
      drawPolymerChain(ctx, engine, ship, tail, {
        colors: ['#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#c084fc'],
        lineColor: 'rgba(143, 243, 255, 0.28)',
        headColor: engine.palette.ink,
        outline: engine.palette.accent,
        lineWidth: 4.4
      });

      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle + Math.PI * 0.5);
      ctx.globalAlpha = ship.invuln > 0 ? 0.52 + Math.sin(engine.now * 0.04) * 0.22 : 1;
      ctx.strokeStyle = engine.palette.accent;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = engine.palette.ink;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Crosslink Drift',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `HP ${Math.max(0, ship.hp)} · Tail ${tail.length + 1}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Melt reset', 'Auto-restarting the crosslink drift…');
      }
    }
  };
}

function waveGliderMode() {
  let player;
  let brushes = [];
  let particles = [];
  let score = 0;
  let best = loadBest('wave-glider');
  let speed = 2.55;
  let spawnTimer = 940;
  let alive = true;
  let restartAt = 0;
  let phase = 0;

  function reset(engine) {
    player = {
      x: engine.width * 0.28,
      y: engine.height * 0.5,
      vy: 0,
      r: 11,
      trail: []
    };
    brushes = [];
    particles = [];
    score = 0;
    speed = 2.55;
    spawnTimer = 940;
    alive = true;
    restartAt = 0;
    phase = 0;
  }

  function spawnBrush(engine) {
    const gap = clamp(engine.height * 0.33 - score * 0.14, 148, 220);
    const center = rand(gap * 0.62, engine.height - gap * 0.62);
    brushes.push({
      x: engine.width + 70,
      w: 52,
      gapY: center,
      gapH: gap,
      phase: rand(0, TAU),
      sway: rand(0.55, 1.1),
      passed: false,
      activeSite: {
        y: center + rand(-gap * 0.2, gap * 0.2),
        taken: false,
        color: pick(COOL_COLORS)
      }
    });
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1500;
    best = finalizeRun('wave-glider', score);
    burst(particles, player.x, player.y, 18, '#ffffff', 3.2);
  }

  function drawBrushGate(ctx, engine, brush) {
    const topH = brush.gapY - brush.gapH * 0.5;
    const bottomY = brush.gapY + brush.gapH * 0.5;
    const bottomH = engine.height - bottomY;
    const columns = 5;
    const colors = ['#7dd3fc', '#34d399', '#fbbf24', '#c084fc', '#fb7185'];
    for (let column = 0; column < columns; column += 1) {
      const columnX = brush.x + 8 + column * ((brush.w - 16) / Math.max(1, columns - 1));
      const topCount = Math.max(4, Math.floor(topH / 24));
      const bottomCount = Math.max(4, Math.floor(bottomH / 24));
      const color = colors[column % colors.length];
      const topPoints = Array.from({ length: topCount }, (_, index) => ({
        x: columnX + Math.sin(brush.phase + phase * 0.8 + index * 0.28 + column) * 6 * brush.sway,
        y: index * (topH / Math.max(1, topCount - 1)),
        r: 5.4
      }));
      const bottomPoints = Array.from({ length: bottomCount }, (_, index) => ({
        x: columnX + Math.sin(brush.phase + phase * 0.8 + index * 0.28 + column + 1.4) * 6 * brush.sway,
        y: bottomY + index * (bottomH / Math.max(1, bottomCount - 1)),
        r: 5.4
      }));
      drawPolyline(ctx, topPoints, color, 3.2, 'rgba(0,0,0,0.12)');
      drawPolyline(ctx, bottomPoints, color, 3.2, 'rgba(0,0,0,0.12)');
      topPoints.forEach((point) => drawBead(ctx, point.x, point.y, point.r, color, { haloAlpha: 0.12 }));
      bottomPoints.forEach((point) => drawBead(ctx, point.x, point.y, point.r, color, { haloAlpha: 0.12 }));
    }

    if (!brush.activeSite.taken) {
      drawBead(ctx, brush.x + brush.w * 0.5, brush.activeSite.y, 7.2, brush.activeSite.color, { outline: engine.palette.accent2, haloAlpha: 0.22 });
    }
  }

  return {
    init(engine) {
      reset(engine);
    },
    resize(engine) {
      reset(engine);
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      phase += 0.02 * step;
      drawBackdrop(ctx, engine, score * 0.35);

      if (alive) {
        speed += 0.00035 * step;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnBrush(engine);
          spawnTimer = Math.max(760, 1280 - score * 0.52 + rand(-80, 100));
        }

        const lift = engine.pointer.down || engine.keys.has('Space') || engine.keys.has('ArrowUp') || engine.keys.has('KeyW');
        player.vy += (lift ? -0.39 : 0.22) * step;
        player.vy = clamp(player.vy, -5.3, 5.3);
        player.y += player.vy * step;
        score += 0.06 * step;

        if (player.y < 10 || player.y > engine.height - 10) lose(engine);
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let i = brushes.length - 1; i >= 0; i -= 1) {
        const brush = brushes[i];
        brush.x -= speed * 3.65 * step;
        if (!brush.passed && brush.x + brush.w < player.x) {
          brush.passed = true;
          score += 12;
          burst(particles, player.x, player.y, 8, engine.palette.good, 2.4);
        }
        if (!brush.activeSite.taken && Math.hypot(player.x - (brush.x + brush.w * 0.5), player.y - brush.activeSite.y) < player.r + 7.2) {
          brush.activeSite.taken = true;
          score += 10;
          burst(particles, brush.x + brush.w * 0.5, brush.activeSite.y, 8, brush.activeSite.color, 2.3);
        }
        if (alive && player.x + player.r > brush.x && player.x - player.r < brush.x + brush.w) {
          const top = brush.gapY - brush.gapH * 0.5;
          const bottom = brush.gapY + brush.gapH * 0.5;
          if (player.y - player.r < top || player.y + player.r > bottom) {
            lose(engine);
          }
        }
        if (brush.x + brush.w < -80) brushes.splice(i, 1);
      }

      updateParticles(particles, step);

      ctx.save();
      ctx.strokeStyle = engine.palette.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= engine.width; x += 18) {
        const y = engine.height * 0.8 + Math.sin(phase + x * 0.012) * 9;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      brushes.forEach((brush) => drawBrushGate(ctx, engine, brush));
      drawParticles(ctx, particles);

      player.trail.unshift({ x: player.x, y: player.y, r: 5.4 });
      if (player.trail.length > 14) player.trail.pop();
      if (player.trail.length > 1) drawPolyline(ctx, player.trail, 'rgba(110, 224, 198, 0.42)', 3.4, 'rgba(0,0,0,0.12)');
      player.trail.forEach((point, index) => drawBead(ctx, point.x, point.y, index === 0 ? 5.6 : 4.4, BEAD_COLORS[index % BEAD_COLORS.length], { haloAlpha: 0.12 }));
      drawBead(ctx, player.x, player.y, player.r, engine.palette.ink, { outline: engine.palette.accent, haloAlpha: 0.24 });

      drawTextPanel(ctx, engine, [
        'Brush Reactor Glide',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `Speed ${speed.toFixed(1)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Brush collision', 'Auto-restarting the catalyst glide…');
      }
    }
  };
}

const factories = {
  'bullet-weave': bulletWeaveMode,
  'chain-runner': chainRunnerMode,
  'survivor-field': survivorFieldMode,
  'drift-shooter': driftShooterMode,
  'wave-glider': waveGliderMode
};

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.leisure);
  activateNav('leisure');
  initFooterYear();
  smoothScrollForHashes();


  const canvas = byId('playground');
  const uiTitle = byId('mode-title');
  const uiSubtitle = byId('mode-subtitle');
  const uiDescription = byId('mode-description');
  const uiInstruction = byId('mode-instruction');
  const uiConcept = byId('mode-concept');
  const uiLearning = byId('mode-learning');
  const selector = byId('mode-selector');
  const reroll = byId('mode-reroll');
  const engine = buildEngine(canvas);

  leisureModes.forEach((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = mode.title;
    selector.appendChild(option);
  });

  function applyMode(id) {
    const mode = leisureModes.find((entry) => entry.id === id) || leisureModes[0];
    selector.value = mode.id;
    uiTitle.textContent = mode.title;
    uiSubtitle.textContent = mode.subtitle;
    uiDescription.textContent = mode.description;
    uiInstruction.textContent = mode.instruction;
    if (uiConcept) uiConcept.textContent = mode.concept || '';
    if (uiLearning) {
      uiLearning.innerHTML = '';
      (mode.learning || []).forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        uiLearning.appendChild(li);
      });
    }
    engine.setMode(mode.id, factories[mode.id]);
  }

  reroll.addEventListener('click', () => {
    const remaining = leisureModes.filter((mode) => mode.id !== selector.value);
    applyMode(choice(remaining).id);
  });

  selector.addEventListener('change', () => {
    applyMode(selector.value);
  });

  applyMode(choice(leisureModes).id);
});
