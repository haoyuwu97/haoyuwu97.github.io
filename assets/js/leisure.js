import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, choice, clamp, setMeta, smoothScrollForHashes } from './utils.js';

const TAU = Math.PI * 2;
const FRAME = 1000 / 60;
const POLYMER_COLORS = ['#7dd3fc', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#fb7185'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalize(x, y, fallbackX = 0, fallbackY = 0) {
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

function pointSegmentDistance(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / ((abx * abx + aby * aby) || 1), 0, 1);
  const x = a.x + abx * t;
  const y = a.y + aby * t;
  return Math.hypot(point.x - x, point.y - y);
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

function loadBest(modeId) {
  try {
    return Number(localStorage.getItem(`haoyu-rest-best:${modeId}`) || 0);
  } catch {
    return 0;
  }
}

function saveBest(modeId, score) {
  const value = Math.max(0, Math.floor(score));
  try {
    const best = Math.max(loadBest(modeId), value);
    localStorage.setItem(`haoyu-rest-best:${modeId}`, `${best}`);
    return best;
  } catch {
    return Math.max(loadBest(modeId), value);
  }
}

function burst(list, x, y, count, color, speed = 2.4) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU + rand(-0.12, 0.12);
    const velocity = rand(speed * 0.55, speed * 1.12);
    list.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 18 + Math.random() * 16,
      maxLife: 28,
      size: 1.5 + Math.random() * 2.6,
      color
    });
  }
}

function updateParticles(particles, step) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.vx *= 0.986;
    particle.vy *= 0.986;
    particle.life -= step;
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

function drawBackdrop(ctx, engine, drift = 0, glowShift = 0) {
  const { width, height, palette } = engine;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(width * (0.18 + glowShift * 0.02), height * 0.2, Math.max(width, height) * 0.28, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = palette.accent2;
  ctx.beginPath();
  ctx.arc(width * (0.82 - glowShift * 0.02), height * 0.76, Math.max(width, height) * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  const grid = 48;
  const ox = -((drift * 0.4) % grid);
  const oy = -((drift * 0.16) % grid);
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

function drawBead(ctx, x, y, r, fill, options = {}) {
  const { outline = null, highlight = 'rgba(255,255,255,0.94)', haloAlpha = 0.18, alpha = 1 } = options;
  ctx.save();
  ctx.globalAlpha = alpha * haloAlpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.68, 0, TAU);
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
    x: x - index * (radius * 2.15),
    y,
    vx: 0,
    vy: 0,
    r: radius
  }));
}

function relaxFollowerChain(segments, anchor, step, spacing = 18, stiffness = 0.24, damping = 0.78, external = null) {
  let targetX = anchor.x;
  let targetY = anchor.y;
  segments.forEach((segment, index) => {
    if (external) external(segment, index);
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

function polymerPoints(head, segments) {
  return [head, ...segments];
}

function drawPolymerChain(ctx, engine, head, segments, options = {}) {
  const colors = options.colors || POLYMER_COLORS;
  const lineColor = options.lineColor || engine.palette.accent;
  const shadow = options.shadow || 'rgba(0,0,0,0.18)';
  const lineWidth = options.lineWidth || 8;
  const points = polymerPoints(head, segments);
  drawPolyline(ctx, points, lineColor, lineWidth, shadow);
  points.forEach((segment, index) => {
    const fill = colors[index % colors.length];
    const scale = index === 0 ? 1.08 : 1;
    drawBead(ctx, segment.x, segment.y, segment.r * scale, fill, {
      outline: 'rgba(255,255,255,0.08)',
      highlight: 'rgba(255,255,255,0.94)',
      haloAlpha: index === 0 ? 0.24 : 0.16
    });
  });
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

function drawCanvasChip(ctx, engine, lines, x, y, align = 'left') {
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

function movementInput(engine, origin = null) {
  const left = engine.keys.has('ArrowLeft') || engine.keys.has('KeyA');
  const right = engine.keys.has('ArrowRight') || engine.keys.has('KeyD');
  const up = engine.keys.has('ArrowUp') || engine.keys.has('KeyW');
  const down = engine.keys.has('ArrowDown') || engine.keys.has('KeyS');
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) return normalize(x, y, 0, 0);
  if (origin && engine.pointer.active && engine.now - engine.pointer.movedAt < 2600) {
    return normalize(engine.pointer.x - origin.x, engine.pointer.y - origin.y, 0, 0);
  }
  return { x: 0, y: 0 };
}

function consumeAction(engine) {
  if (engine.actionQueued) {
    engine.actionQueued = false;
    return true;
  }
  return false;
}

function actionHeld(engine) {
  return engine.pointer.down || engine.keys.has('Space') || engine.keys.has('KeyW') || engine.keys.has('ArrowUp');
}

function updateHUD(engine) {
  engine.scoreNode.textContent = `${Math.max(0, Math.floor(engine.score))}`;
  engine.bestNode.textContent = `${Math.max(engine.best, Math.floor(engine.score))}`;
}

function setModeCopy(engine, mode) {
  engine.titleNode.textContent = mode.title;
  engine.subtitleNode.textContent = mode.subtitle;
  engine.descriptionNode.textContent = mode.description;
  engine.instructionNode.textContent = mode.instruction;
  engine.conceptNode.textContent = mode.concept;
}

function fillSelector(selector) {
  selector.innerHTML = '';
  leisureModes.forEach((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = mode.title;
    selector.appendChild(option);
  });
}

function chainGrowthRunner() {
  let player;
  let chain;
  let monomers;
  let obstacles;
  let particles;
  let ground;
  let speed;
  let monomerTimer;
  let obstacleTimer;
  let alive;
  let restartLock;

  function reset(engine) {
    ground = engine.height * 0.78;
    player = { x: engine.width * 0.24, y: ground - 16, vy: 0, r: 12 };
    chain = makeFollowerChain(4, player.x - 20, player.y, 7.2);
    monomers = [];
    obstacles = [];
    particles = [];
    speed = 5.0;
    monomerTimer = 720;
    obstacleTimer = 1080;
    alive = true;
    restartLock = 0;
    engine.score = 0;
  }

  function spawnMonomer(engine) {
    const lane = choice([ground - 40, ground - 96, ground - 150]);
    monomers.push({ x: engine.width + 40, y: lane + rand(-10, 10), r: 8, bob: rand(0, TAU), color: choice(POLYMER_COLORS) });
  }

  function spawnObstacle(engine) {
    const tall = Math.random() < 0.55;
    if (tall) {
      const height = rand(70, 150);
      obstacles.push({ x: engine.width + 70, y: ground - height, w: rand(28, 44), h: height, top: false });
    } else {
      const height = rand(42, 78);
      const y = ground - rand(150, 220);
      obstacles.push({ x: engine.width + 70, y, w: rand(44, 70), h: height, top: true });
    }
  }

  return {
    init(engine) {
      reset(engine);
    },
    update(engine, dt) {
      const step = dt / FRAME;
      if (alive) {
        speed = Math.min(9.6, speed + 0.0011 * dt);
        if (consumeAction(engine) && player.y >= ground - player.r - 1) {
          player.vy = -9.2;
          burst(particles, player.x, player.y + player.r * 0.9, 7, engine.palette.accent2, 2.0);
        }
        player.vy += 0.58 * step;
        player.y += player.vy * step;
        if (player.y > ground - player.r) {
          player.y = ground - player.r;
          player.vy = 0;
        }

        monomerTimer -= dt;
        obstacleTimer -= dt;
        if (monomerTimer <= 0) {
          spawnMonomer(engine);
          monomerTimer = rand(540, 860);
        }
        if (obstacleTimer <= 0) {
          spawnObstacle(engine);
          obstacleTimer = rand(980, 1320) - engine.score * 0.5;
        }

        monomers.forEach((item) => {
          item.x -= speed * step * 7.6;
          item.y += Math.sin(engine.now * 0.003 + item.bob) * 0.26;
        });
        obstacles.forEach((item) => {
          item.x -= speed * step * 7.6;
        });
        monomers = monomers.filter((item) => item.x > -40);
        obstacles = obstacles.filter((item) => item.x + item.w > -60);

        monomers.forEach((item) => {
          if (circleHit(player, item, 1)) {
            item.hit = true;
            const tail = chain.at(-1) || player;
            chain.push({ x: tail.x, y: tail.y, vx: 0, vy: 0, r: rand(6.2, 7.8) });
            engine.score += 28;
            burst(particles, item.x, item.y, 9, item.color, 2.6);
          }
        });
        monomers = monomers.filter((item) => !item.hit);

        relaxFollowerChain(chain, player, step, 18, 0.24, 0.78);

        const allBeads = [player, ...chain];
        obstacles.forEach((obstacle) => {
          allBeads.forEach((bead) => {
            if (!alive) return;
            if (circleRect(bead, obstacle)) {
              alive = false;
              engine.best = saveBest('chain-growth-runner', engine.score);
              burst(particles, bead.x, bead.y, 18, engine.palette.warn, 3.4);
              restartLock = 380;
            }
          });
        });

        engine.score += speed * 0.16 * step + chain.length * 0.012 * step;
      } else {
        restartLock -= dt;
        if (restartLock <= 0 && consumeAction(engine)) reset(engine);
      }

      updateParticles(particles, step);
    },
    draw(engine, ctx) {
      drawBackdrop(ctx, engine, engine.now * 0.08, 0.2);
      ctx.save();
      ctx.strokeStyle = engine.palette.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground + 0.5);
      ctx.lineTo(engine.width, ground + 0.5);
      ctx.stroke();
      ctx.restore();

      monomers.forEach((item) => {
        drawBead(ctx, item.x, item.y, item.r, item.color, { haloAlpha: 0.22 });
      });

      obstacles.forEach((item) => {
        ctx.save();
        roundRect(ctx, item.x, item.y, item.w, item.h, Math.min(16, item.w * 0.35));
        ctx.fillStyle = 'rgba(255, 126, 154, 0.82)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();
        ctx.restore();
      });

      drawPolymerChain(ctx, engine, player, chain, {
        colors: POLYMER_COLORS,
        lineColor: 'rgba(143,243,255,0.42)',
        lineWidth: 8
      });
      drawBead(ctx, player.x, player.y, player.r + 1.5, engine.palette.good, { haloAlpha: 0.28 });

      drawParticles(ctx, particles);
      drawCanvasChip(ctx, engine, [`degree of polymerization ${chain.length + 1}`, 'collect monomers · avoid termination'], 20, engine.height - 70);
      if (!alive) drawOverlay(ctx, engine, 'Termination event', 'Tap / click / Space to start a new growth run');
    }
  };
}

function brushChannelMode() {
  let player;
  let gates;
  let particles;
  let speed;
  let spawnTimer;
  let alive;
  let restartLock;

  function reset(engine) {
    player = { x: engine.width * 0.26, y: engine.height * 0.5, vy: 0, r: 11.5 };
    gates = [];
    particles = [];
    speed = 4.6;
    spawnTimer = 880;
    alive = true;
    restartLock = 0;
    engine.score = 0;
  }

  function spawnGate(engine) {
    const gapH = clamp(190 - engine.score * 0.18, 120, 190);
    gates.push({
      x: engine.width + 90,
      w: rand(112, 138),
      gapY: rand(engine.height * 0.28, engine.height * 0.72),
      gapH,
      sway: rand(14, 34),
      phase: rand(0, TAU),
      tokenY: rand(-gapH * 0.22, gapH * 0.22),
      passed: false,
      tokenTaken: false
    });
  }

  function brushExtent(gate, now) {
    return gate.gapY + Math.sin(now * 0.0022 + gate.phase) * gate.sway;
  }

  return {
    init(engine) {
      reset(engine);
    },
    update(engine, dt) {
      const step = dt / FRAME;
      if (alive) {
        speed = Math.min(7.4, speed + 0.00065 * dt);
        if (actionHeld(engine)) player.vy -= 0.52 * step;
        else player.vy += 0.43 * step;
        player.vy = clamp(player.vy, -7.2, 7.2);
        player.y += player.vy * step * 1.8;

        if (player.y < 22 || player.y > engine.height - 22) {
          alive = false;
          engine.best = saveBest('brush-channel', engine.score);
          burst(particles, player.x, player.y, 16, engine.palette.warn, 3.2);
          restartLock = 320;
        }

        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnGate(engine);
          spawnTimer = rand(980, 1260);
        }
        gates.forEach((gate) => {
          gate.x -= speed * step * 7.2;
          const gap = brushExtent(gate, engine.now);
          if (!gate.tokenTaken) {
            const token = { x: gate.x + gate.w * 0.5, y: gap + gate.tokenY, r: 8 };
            if (circleHit(player, token, 2)) {
              gate.tokenTaken = true;
              engine.score += 18;
              burst(particles, token.x, token.y, 8, engine.palette.good, 2.6);
            }
          }
          const withinX = player.x + player.r > gate.x && player.x - player.r < gate.x + gate.w;
          if (withinX) {
            const top = gap - gate.gapH * 0.5;
            const bottom = gap + gate.gapH * 0.5;
            if (player.y - player.r < top || player.y + player.r > bottom) {
              alive = false;
              engine.best = saveBest('brush-channel', engine.score);
              burst(particles, player.x, player.y, 16, engine.palette.warn, 3.2);
              restartLock = 320;
            }
          }
          if (!gate.passed && gate.x + gate.w < player.x) {
            gate.passed = true;
            engine.score += 36;
          }
        });
        gates = gates.filter((gate) => gate.x + gate.w > -80);
        engine.score += 0.05 * step;
      } else {
        restartLock -= dt;
        if (restartLock <= 0 && consumeAction(engine)) reset(engine);
      }
      updateParticles(particles, step);
    },
    draw(engine, ctx) {
      drawBackdrop(ctx, engine, engine.now * 0.12, -0.2);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(engine.width, 20);
      ctx.moveTo(0, engine.height - 20);
      ctx.lineTo(engine.width, engine.height - 20);
      ctx.stroke();
      ctx.restore();

      gates.forEach((gate) => {
        const gap = brushExtent(gate, engine.now);
        const top = gap - gate.gapH * 0.5;
        const bottom = gap + gate.gapH * 0.5;
        const strandCount = 11;
        for (let index = 0; index < strandCount; index += 1) {
          const x = gate.x + (index / (strandCount - 1)) * gate.w;
          const sway = Math.sin(engine.now * 0.003 + gate.phase + index * 0.6) * 10;
          const topPoints = [
            { x, y: 20 },
            { x: x + sway * 0.3, y: top * 0.35 },
            { x: x + sway * 0.6, y: top * 0.68 },
            { x: x + sway, y: top }
          ];
          const bottomPoints = [
            { x, y: engine.height - 20 },
            { x: x - sway * 0.3, y: engine.height - (engine.height - bottom) * 0.35 },
            { x: x - sway * 0.6, y: engine.height - (engine.height - bottom) * 0.68 },
            { x: x - sway, y: bottom }
          ];
          drawPolyline(ctx, topPoints, 'rgba(143,243,255,0.34)', 5, 'rgba(0,0,0,0.18)');
          drawPolyline(ctx, bottomPoints, 'rgba(136,164,255,0.28)', 5, 'rgba(0,0,0,0.18)');
          topPoints.forEach((p, beadIndex) => drawBead(ctx, p.x, p.y, beadIndex === topPoints.length - 1 ? 7.4 : 5.8, beadIndex % 2 ? '#7dd3fc' : '#c4b5fd', { haloAlpha: 0.14 }));
          bottomPoints.forEach((p, beadIndex) => drawBead(ctx, p.x, p.y, beadIndex === bottomPoints.length - 1 ? 7.4 : 5.8, beadIndex % 2 ? '#86efac' : '#7dd3fc', { haloAlpha: 0.14 }));
        }
        if (!gate.tokenTaken) {
          drawBead(ctx, gate.x + gate.w * 0.5, gap + gate.tokenY, 8, '#fcd34d', { haloAlpha: 0.24 });
        }
      });

      drawBead(ctx, player.x, player.y, player.r + 1.2, engine.palette.good, { haloAlpha: 0.28 });
      drawParticles(ctx, particles);
      drawCanvasChip(ctx, engine, ['steric gate transport', 'follow the fluctuating free-volume window'], 20, engine.height - 70);
      if (!alive) drawOverlay(ctx, engine, 'Channel blocked', 'Tap / click / Space to re-enter the reactor channel');
    }
  };
}

function chargeHoppingMode() {
  let player;
  let segments;
  let particles;
  let sites;
  let links;
  let speed;
  let spawnTimer;
  let energy;
  let alive;
  let restartLock;

  function reset(engine) {
    player = { x: engine.width * 0.28, y: engine.height * 0.5, vx: 0, vy: 0, r: 11 };
    segments = makeFollowerChain(3, player.x - 16, player.y, 5.6);
    particles = [];
    sites = [];
    links = [];
    speed = 3.3;
    spawnTimer = 520;
    energy = 100;
    alive = true;
    restartLock = 0;
    engine.score = 0;
  }

  function spawnCluster(engine) {
    const baseX = engine.width + 80;
    const baseY = rand(engine.height * 0.16, engine.height * 0.84);
    const cluster = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index += 1) {
      const site = {
        id: `${engine.now}-${index}`,
        x: baseX + rand(-18, 28) + index * rand(34, 52),
        y: baseY + rand(-86, 86),
        r: 13,
        kind: Math.random() < 0.18 ? 'dopant' : 'site',
        used: false
      };
      cluster.push(site);
      sites.push(site);
    }
    for (let index = 0; index < cluster.length - 1; index += 1) {
      links.push({ a: cluster[index], b: cluster[index + 1] });
    }
    if (Math.random() < 0.85) {
      sites.push({ x: baseX + rand(40, 120), y: baseY + rand(-110, 110), r: 14, kind: 'trap' });
    }
  }

  return {
    init(engine) {
      reset(engine);
    },
    update(engine, dt) {
      const step = dt / FRAME;
      if (alive) {
        speed = Math.min(5.4, speed + 0.0004 * dt);
        const move = movementInput(engine, player);
        player.vx = player.vx * 0.84 + move.x * 0.9;
        player.vy = player.vy * 0.84 + move.y * 0.9;
        player.x = clamp(player.x + player.vx * step * 7, 26, engine.width - 26);
        player.y = clamp(player.y + player.vy * step * 7, 26, engine.height - 26);

        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnCluster(engine);
          spawnTimer = rand(560, 840);
        }

        sites.forEach((site) => {
          site.x -= speed * step * 6.4;
          if (site.kind === 'trap') site.y += Math.sin(engine.now * 0.002 + site.x * 0.01) * 0.12;
        });
        links.forEach((link) => {
          link.a.x -= 0; // links follow referenced sites
        });
        sites = sites.filter((site) => site.x > -80);
        links = links.filter((link) => link.a.x > -80 && link.b.x > -80);

        let onConductiveSite = false;
        sites.forEach((site) => {
          if (site.kind === 'trap' && circleHit(player, site, 2)) {
            alive = false;
            engine.best = saveBest('charge-hopping', engine.score);
            burst(particles, player.x, player.y, 18, engine.palette.warn, 3.1);
            restartLock = 360;
          }
          if (site.kind !== 'trap' && circleHit(player, site, 4)) {
            onConductiveSite = true;
            if (site.kind === 'dopant' && !site.used) {
              site.used = true;
              energy = Math.min(100, energy + 18);
              engine.score += 24;
              burst(particles, site.x, site.y, 10, engine.palette.good, 2.8);
            }
          }
        });
        sites = sites.filter((site) => !(site.kind === 'dopant' && site.used));

        if (onConductiveSite) {
          energy = Math.min(100, energy + 0.82 * step);
          engine.score += 0.32 * step;
        } else {
          energy -= 0.34 * step;
          engine.score += 0.07 * step;
        }
        if (energy <= 0) {
          alive = false;
          engine.best = saveBest('charge-hopping', engine.score);
          burst(particles, player.x, player.y, 18, engine.palette.warn, 3.1);
          restartLock = 360;
        }

        relaxFollowerChain(segments, player, step, 16, 0.22, 0.78);
      } else {
        restartLock -= dt;
        if (restartLock <= 0 && consumeAction(engine)) reset(engine);
      }

      updateParticles(particles, step);
    },
    draw(engine, ctx) {
      drawBackdrop(ctx, engine, engine.now * 0.06, 0.08);
      links.forEach((link) => {
        drawPolyline(ctx, [link.a, link.b], 'rgba(143,243,255,0.18)', 3, null);
      });
      sites.forEach((site) => {
        if (site.kind === 'site') drawBead(ctx, site.x, site.y, site.r, '#7dd3fc', { haloAlpha: 0.22 });
        else if (site.kind === 'dopant') drawBead(ctx, site.x, site.y, site.r + 0.4, '#86efac', { haloAlpha: 0.26 });
        else drawBead(ctx, site.x, site.y, site.r, '#fb7185', { haloAlpha: 0.24 });
      });
      drawPolymerChain(ctx, engine, player, segments, {
        colors: ['#fcd34d', '#7dd3fc', '#86efac', '#c4b5fd'],
        lineColor: 'rgba(136,164,255,0.36)',
        lineWidth: 6
      });
      drawBead(ctx, player.x, player.y, player.r + 1.2, '#fcd34d', { haloAlpha: 0.28 });
      drawParticles(ctx, particles);
      drawCanvasChip(ctx, engine, [`transport energy ${Math.round(energy)}%`, 'stay on connected low-energy pathways'], engine.width - 20, engine.height - 70, 'right');
      if (!alive) drawOverlay(ctx, engine, 'Transport collapsed', 'Tap / click / Space to seed a new hopping field');
    }
  };
}

function vitrimerHealingMode() {
  let player;
  let particles;
  let pairs;
  let frozen;
  let damage;
  let spawnTimer;
  let frozenTimer;
  let alive;
  let restartLock;

  function reset(engine) {
    player = { x: engine.width * 0.3, y: engine.height * 0.5, vx: 0, vy: 0, r: 11.5 };
    particles = [];
    pairs = [];
    frozen = [];
    damage = 0;
    spawnTimer = 420;
    frozenTimer = 1200;
    alive = true;
    restartLock = 0;
    engine.score = 0;
  }

  function spawnPair(engine) {
    const cx = engine.width + 70;
    const cy = rand(engine.height * 0.14, engine.height * 0.86);
    const angle = rand(0, TAU);
    const half = rand(20, 42);
    pairs.push({
      ax: cx + Math.cos(angle) * half,
      ay: cy + Math.sin(angle) * half,
      bx: cx - Math.cos(angle) * half,
      by: cy - Math.sin(angle) * half,
      vx: -rand(2.8, 4.4),
      vy: rand(-0.2, 0.2),
      life: 6400,
      healed: false,
      flash: 0,
      r: 9.5
    });
  }

  function spawnFrozen(engine) {
    frozen.push({ x: engine.width + 60, y: rand(60, engine.height - 60), r: rand(20, 34), vx: -rand(3.2, 4.8), wobble: rand(0, TAU) });
  }

  return {
    init(engine) {
      reset(engine);
    },
    update(engine, dt) {
      const step = dt / FRAME;
      if (alive) {
        const move = movementInput(engine, player);
        player.vx = player.vx * 0.84 + move.x * 0.9;
        player.vy = player.vy * 0.84 + move.y * 0.9;
        player.x = clamp(player.x + player.vx * step * 7, 22, engine.width - 22);
        player.y = clamp(player.y + player.vy * step * 7, 22, engine.height - 22);

        spawnTimer -= dt;
        frozenTimer -= dt;
        if (spawnTimer <= 0) {
          spawnPair(engine);
          spawnTimer = rand(620, 980);
        }
        if (frozenTimer <= 0) {
          spawnFrozen(engine);
          frozenTimer = rand(1500, 2200);
        }

        pairs.forEach((pair) => {
          pair.ax += pair.vx * step;
          pair.ay += pair.vy * step;
          pair.bx += pair.vx * step;
          pair.by += pair.vy * step;
          pair.life -= dt;
          if (!pair.healed) {
            const dist = pointSegmentDistance(player, { x: pair.ax, y: pair.ay }, { x: pair.bx, y: pair.by });
            if (dist < player.r + 10) {
              pair.healed = true;
              pair.flash = 440;
              engine.score += 34;
              burst(particles, (pair.ax + pair.bx) * 0.5, (pair.ay + pair.by) * 0.5, 10, engine.palette.good, 2.8);
            }
          } else {
            pair.flash -= dt;
          }
          if (pair.life <= 0 && !pair.healed) {
            pair.expired = true;
            damage = Math.min(100, damage + 18);
            burst(particles, (pair.ax + pair.bx) * 0.5, (pair.ay + pair.by) * 0.5, 8, engine.palette.warn, 2.2);
          }
          if (pair.flash <= 0 && pair.healed) pair.expired = true;
        });
        pairs = pairs.filter((pair) => !pair.expired && pair.ax > -80 && pair.bx > -80);

        frozen.forEach((item) => {
          item.x += item.vx * step;
          item.y += Math.sin(engine.now * 0.002 + item.wobble) * 0.22;
          if (circleHit(player, item, 3)) {
            alive = false;
            engine.best = saveBest('vitrimer-healing', engine.score);
            burst(particles, player.x, player.y, 18, engine.palette.warn, 3.1);
            restartLock = 360;
          }
        });
        frozen = frozen.filter((item) => item.x + item.r > -80);

        if (damage >= 100) {
          alive = false;
          engine.best = saveBest('vitrimer-healing', engine.score);
          burst(particles, player.x, player.y, 18, engine.palette.warn, 3.1);
          restartLock = 360;
        }
        engine.score += 0.08 * step;
      } else {
        restartLock -= dt;
        if (restartLock <= 0 && consumeAction(engine)) reset(engine);
      }

      updateParticles(particles, step);
    },
    draw(engine, ctx) {
      drawBackdrop(ctx, engine, engine.now * 0.07, -0.1);
      frozen.forEach((item) => {
        ctx.save();
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = 'rgba(255, 142, 164, 0.34)';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r * 1.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 142, 164, 0.8)';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
      pairs.forEach((pair) => {
        const a = { x: pair.ax, y: pair.ay };
        const b = { x: pair.bx, y: pair.by };
        const healed = pair.healed;
        ctx.save();
        ctx.setLineDash(healed ? [] : [10, 10]);
        ctx.strokeStyle = healed ? 'rgba(110,224,198,0.74)' : 'rgba(255,255,255,0.32)';
        ctx.lineWidth = healed ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
        drawBead(ctx, a.x, a.y, pair.r, healed ? '#86efac' : '#fca5a5', { haloAlpha: healed ? 0.22 : 0.16 });
        drawBead(ctx, b.x, b.y, pair.r, healed ? '#86efac' : '#fca5a5', { haloAlpha: healed ? 0.22 : 0.16 });
      });
      drawBead(ctx, player.x, player.y, player.r + 1.5, '#fcd34d', { haloAlpha: 0.26 });
      drawParticles(ctx, particles);
      drawCanvasChip(ctx, engine, [`network damage ${Math.round(damage)}%`, 'heal broken pairs before mobility is lost'], engine.width - 20, engine.height - 70, 'right');
      if (!alive) drawOverlay(ctx, engine, 'Exchange arrested', 'Tap / click / Space to restart the healing sweep');
    }
  };
}

function wormlikeDriftMode() {
  let head;
  let chain;
  let particles;
  let obstacles;
  let markers;
  let spawnTimer;
  let markerTimer;
  let speed;
  let alive;
  let restartLock;

  function reset(engine) {
    head = { x: engine.width * 0.3, y: engine.height * 0.5, vx: 0, vy: 0, r: 11.5 };
    chain = makeFollowerChain(10, head.x - 18, head.y, 7.1);
    particles = [];
    obstacles = [];
    markers = [];
    spawnTimer = 620;
    markerTimer = 540;
    speed = 3.6;
    alive = true;
    restartLock = 0;
    engine.score = 0;
  }

  function spawnObstacle(engine) {
    const circular = Math.random() < 0.72;
    if (circular) {
      obstacles.push({ kind: 'circle', x: engine.width + 60, y: rand(50, engine.height - 50), r: rand(18, 34) });
    } else {
      const h = rand(80, 180);
      obstacles.push({ kind: 'slab', x: engine.width + 70, y: rand(32, engine.height - h - 32), w: rand(22, 32), h });
    }
  }

  function spawnMarker(engine) {
    markers.push({ x: engine.width + 50, y: rand(60, engine.height - 60), r: 8, color: choice(['#86efac', '#fcd34d', '#7dd3fc']) });
  }

  function shearVelocity(engine, y) {
    return ((y - engine.height * 0.5) / engine.height) * 1.2;
  }

  return {
    init(engine) {
      reset(engine);
    },
    update(engine, dt) {
      const step = dt / FRAME;
      if (alive) {
        speed = Math.min(6.6, speed + 0.00045 * dt);
        const move = movementInput(engine, head);
        head.vx = head.vx * 0.84 + move.x * 0.82;
        head.vy = head.vy * 0.84 + move.y * 0.82;
        head.x = clamp(head.x + (head.vx + shearVelocity(engine, head.y) * 0.28) * step * 7, 34, engine.width * 0.62);
        head.y = clamp(head.y + head.vy * step * 7, 34, engine.height - 34);

        spawnTimer -= dt;
        markerTimer -= dt;
        if (spawnTimer <= 0) {
          spawnObstacle(engine);
          spawnTimer = rand(660, 980);
        }
        if (markerTimer <= 0) {
          spawnMarker(engine);
          markerTimer = rand(520, 880);
        }

        obstacles.forEach((item) => {
          item.x -= speed * step * 6.8;
          if (item.kind === 'circle') item.y += Math.sin(engine.now * 0.0018 + item.x * 0.02) * 0.18;
        });
        markers.forEach((item) => {
          item.x -= speed * step * 6.8;
          item.y += Math.sin(engine.now * 0.0026 + item.x * 0.03) * 0.18;
          if (circleHit(head, item, 2)) {
            item.hit = true;
            engine.score += 18;
            burst(particles, item.x, item.y, 8, item.color, 2.6);
          }
        });
        markers = markers.filter((item) => item.x > -40 && !item.hit);
        obstacles = obstacles.filter((item) => item.x + (item.r || item.w) > -80);

        relaxFollowerChain(chain, head, step, 17, 0.2, 0.78, (segment) => {
          segment.x -= speed * step * 0.18;
          segment.x += shearVelocity(engine, segment.y) * step * 0.34;
        });

        const allBeads = [head, ...chain];
        obstacles.forEach((obstacle) => {
          allBeads.forEach((bead) => {
            if (!alive) return;
            const hit = obstacle.kind === 'circle' ? circleHit(bead, obstacle, 1) : circleRect(bead, obstacle);
            if (hit) {
              alive = false;
              engine.best = saveBest('wormlike-drift', engine.score);
              burst(particles, bead.x, bead.y, 18, engine.palette.warn, 3.1);
              restartLock = 360;
            }
          });
        });
        engine.score += 0.11 * step + chain.length * 0.003 * step;
      } else {
        restartLock -= dt;
        if (restartLock <= 0 && consumeAction(engine)) reset(engine);
      }

      updateParticles(particles, step);
    },
    draw(engine, ctx) {
      drawBackdrop(ctx, engine, engine.now * 0.1, 0.12);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let y = 50; y < engine.height; y += 90) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(engine.now * 0.0015 + y) * 6);
        for (let x = 0; x <= engine.width; x += 40) {
          ctx.lineTo(x, y + Math.sin(engine.now * 0.0015 + y + x * 0.02) * 6);
        }
        ctx.stroke();
      }
      ctx.restore();

      obstacles.forEach((item) => {
        if (item.kind === 'circle') drawBead(ctx, item.x, item.y, item.r, '#fb7185', { haloAlpha: 0.22 });
        else {
          ctx.save();
          roundRect(ctx, item.x, item.y, item.w, item.h, 16);
          ctx.fillStyle = 'rgba(251,113,133,0.78)';
          ctx.fill();
          ctx.restore();
        }
      });
      markers.forEach((item) => drawBead(ctx, item.x, item.y, item.r, item.color, { haloAlpha: 0.24 }));
      drawPolymerChain(ctx, engine, head, chain, {
        colors: ['#7dd3fc', '#c4b5fd', '#86efac', '#fcd34d'],
        lineColor: 'rgba(143,243,255,0.42)',
        lineWidth: 7.5
      });
      drawBead(ctx, head.x, head.y, head.r + 1.5, '#7dd3fc', { haloAlpha: 0.28 });
      drawParticles(ctx, particles);
      drawCanvasChip(ctx, engine, ['wormlike relaxation', 'steer the head · protect the full conformation'], 20, engine.height - 70);
      if (!alive) drawOverlay(ctx, engine, 'Conformation jammed', 'Tap / click / Space to seed a new chain');
    }
  };
}

const modeFactories = {
  'chain-growth-runner': chainGrowthRunner,
  'brush-channel': brushChannelMode,
  'charge-hopping': chargeHoppingMode,
  'vitrimer-healing': vitrimerHealingMode,
  'wormlike-drift': wormlikeDriftMode
};

function createEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const engine = {
    canvas,
    ctx,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    now: 0,
    lastTime: performance.now(),
    raf: 0,
    keys: new Set(),
    actionQueued: false,
    pointer: { x: 0, y: 0, active: false, down: false, movedAt: 0 },
    palette: readGamePalette(),
    score: 0,
    best: 0,
    mode: null,
    modeId: leisureModes[0]?.id,
    api: null,
    selector: byId('mode-selector'),
    titleNode: byId('mode-title'),
    subtitleNode: byId('mode-subtitle'),
    descriptionNode: byId('mode-description'),
    instructionNode: byId('mode-instruction'),
    conceptNode: byId('mode-concept'),
    scoreNode: byId('hud-score'),
    bestNode: byId('hud-best')
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    engine.width = Math.max(1, Math.floor(rect.width));
    engine.height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(engine.width * engine.dpr);
    canvas.height = Math.floor(engine.height * engine.dpr);
    ctx.setTransform(engine.dpr, 0, 0, engine.dpr, 0, 0);
    engine.api?.resize?.(engine);
  }

  function setMode(id) {
    const mode = leisureModes.find((item) => item.id === id) || leisureModes[0];
    engine.mode = mode;
    engine.modeId = mode.id;
    engine.best = loadBest(mode.id);
    setModeCopy(engine, mode);
    if (engine.selector.value !== mode.id) engine.selector.value = mode.id;
    try {
      localStorage.setItem('haoyu-rest-mode', mode.id);
    } catch {}
    engine.api?.destroy?.(engine, ctx);
    const factory = modeFactories[mode.id] || modeFactories['chain-growth-runner'];
    engine.api = factory();
    engine.api.init(engine, ctx);
    updateHUD(engine);
  }

  function randomMode(currentId = null) {
    const options = leisureModes.filter((mode) => mode.id !== currentId);
    return choice(options.length ? options : leisureModes).id;
  }

  function keydown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!engine.keys.has(event.code)) engine.actionQueued = engine.actionQueued || ['Space', 'ArrowUp', 'KeyW'].includes(event.code);
    engine.keys.add(event.code);
  }

  function keyup(event) {
    engine.keys.delete(event.code);
  }

  function updatePointerPosition(point) {
    const rect = canvas.getBoundingClientRect();
    engine.pointer.x = point.clientX - rect.left;
    engine.pointer.y = point.clientY - rect.top;
    engine.pointer.active = true;
    engine.pointer.movedAt = performance.now();
  }

  function pointerDown(event) {
    updatePointerPosition(event.touches?.[0] || event);
    engine.pointer.down = true;
    engine.actionQueued = true;
  }

  function pointerMove(event) {
    updatePointerPosition(event.touches?.[0] || event);
  }

  function pointerUp() {
    engine.pointer.down = false;
  }

  function pointerLeave() {
    engine.pointer.down = false;
    engine.pointer.active = false;
  }

  function frame(now) {
    engine.now = now;
    engine.palette = readGamePalette();
    const dt = Math.min(42, now - engine.lastTime || FRAME);
    engine.lastTime = now;
    engine.api?.update?.(engine, dt, ctx);
    engine.api?.draw?.(engine, ctx);
    updateHUD(engine);
    engine.raf = requestAnimationFrame(frame);
  }

  fillSelector(engine.selector);
  engine.selector.addEventListener('change', (event) => setMode(event.target.value));
  byId('mode-reroll').addEventListener('click', () => setMode(randomMode(engine.modeId)));

  window.addEventListener('keydown', keydown, { passive: false });
  window.addEventListener('keyup', keyup);
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousedown', pointerDown);
  canvas.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  canvas.addEventListener('mouseleave', pointerLeave);
  canvas.addEventListener('touchstart', pointerDown, { passive: true });
  canvas.addEventListener('touchmove', pointerMove, { passive: true });
  window.addEventListener('touchend', pointerUp, { passive: true });
  canvas.addEventListener('touchcancel', pointerLeave, { passive: true });

  resize();
  let initialMode = leisureModes[0]?.id;
  try {
    initialMode = localStorage.getItem('haoyu-rest-mode') || initialMode;
  } catch {}
  setMode(initialMode);
  engine.raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(engine.raf);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mouseup', pointerUp);
      window.removeEventListener('touchend', pointerUp);
      canvas.removeEventListener('mousedown', pointerDown);
      canvas.removeEventListener('mousemove', pointerMove);
      canvas.removeEventListener('mouseleave', pointerLeave);
      canvas.removeEventListener('touchstart', pointerDown);
      canvas.removeEventListener('touchmove', pointerMove);
      canvas.removeEventListener('touchcancel', pointerLeave);
      engine.api?.destroy?.(engine, ctx);
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.leisure);
  activateNav('leisure');
  smoothScrollForHashes();
  createEngine(byId('playground'));
});
