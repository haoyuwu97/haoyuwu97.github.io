import { leisureModes, pageMeta } from './site-data.js';
import { activateNav, byId, choice, initFooterYear, setMeta, smoothScrollForHashes, prefersReducedMotion, clamp } from './utils.js';

const TAU = Math.PI * 2;
const FRAME = 1000 / 60;

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
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.18, Math.max(width, height) * 0.24, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = palette.accent2;
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.74, Math.max(width, height) * 0.27, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  const grid = 46;
  const ox = -((drift * 0.45) % grid);
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
  const boxWidth = Math.min(width - 36, 340);
  const boxHeight = 112;
  const boxX = (width - boxWidth) * 0.5;
  const boxY = (height - boxHeight) * 0.5;
  ctx.save();
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 22);
  ctx.fillStyle = palette.bg;
  ctx.globalAlpha = 0.88;
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
  ctx.fillText(subtitle, boxX + (boxWidth - subtitleWidth) * 0.5, boxY + 72);
  ctx.restore();
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
    if (tracked.includes(event.code)) {
      event.preventDefault();
    }
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
  let shots = [];
  let enemies = [];
  let enemyBullets = [];
  let particles = [];
  let spawnTimer = 0;
  let score = 0;
  let kills = 0;
  let best = loadBest('bullet-weave');
  let alive = true;
  let restartAt = 0;

  function reset(engine) {
    player = {
      x: engine.width * 0.5,
      y: engine.height * 0.82,
      r: 11,
      hp: 3,
      fire: 0,
      invuln: 0,
      heading: -Math.PI * 0.5
    };
    shots = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    spawnTimer = 380;
    score = 0;
    kills = 0;
    alive = true;
    restartAt = 0;
  }

  function spawnEnemy(engine) {
    const side = Math.random();
    let x = rand(60, engine.width - 60);
    let y = -26;
    let vx = rand(-0.35, 0.35);
    let vy = rand(0.6, 1.1);
    if (side < 0.16) {
      x = -24;
      y = rand(56, engine.height * 0.34);
      vx = rand(0.7, 1.25);
      vy = rand(-0.1, 0.45);
    } else if (side > 0.84) {
      x = engine.width + 24;
      y = rand(56, engine.height * 0.34);
      vx = rand(-1.25, -0.7);
      vy = rand(-0.1, 0.45);
    }
    const kind = pick(['fan', 'fan', 'burst', 'spiral']);
    enemies.push({
      x,
      y,
      vx,
      vy,
      r: kind === 'burst' ? 16 : 14,
      hp: kind === 'burst' ? 6 : kind === 'spiral' ? 5 : 4,
      fire: rand(420, 880),
      kind,
      phase: rand(0, TAU)
    });
  }

  function destroyEnemy(index) {
    const enemy = enemies[index];
    burst(particles, enemy.x, enemy.y, 10, enemy.kind === 'burst' ? '#ffffff' : '#8ff3ff', 3.2);
    enemies.splice(index, 1);
    kills += 1;
    score += 18;
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1500;
    best = saveBest('bullet-weave', Math.floor(score));
    burst(particles, player.x, player.y, 16, '#ffffff', 3.6);
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
      drawBackdrop(ctx, engine, score * 0.45);

      if (alive) {
        score += 0.12 * step;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy(engine);
          const intensity = Math.min(1.2, score / 240);
          spawnTimer = 760 - intensity * 320 + rand(0, 220);
        }

        player.invuln = Math.max(0, player.invuln - dt);

        const keys = inputVector(engine);
        const usePointer = pointerRecent(engine);
        if (usePointer) {
          player.x += (engine.pointer.x - player.x) * 0.16;
          player.y += (engine.pointer.y - player.y) * 0.16;
        } else {
          player.x += keys.x * 5.8 * step;
          player.y += keys.y * 5.8 * step;
        }
        player.x = clamp(player.x, 20, engine.width - 20);
        player.y = clamp(player.y, 26, engine.height - 20);

        player.fire -= dt;
        if (player.fire <= 0) {
          player.fire = Math.max(82, 128 - Math.min(42, kills * 1.8));
          const target = enemies.reduce((bestTarget, enemy) => {
            if (!bestTarget) return enemy;
            return distanceSq(enemy, player) < distanceSq(bestTarget, player) ? enemy : bestTarget;
          }, null);
          const aim = target
            ? normalize(target.x - player.x, target.y - player.y, 0, -1)
            : usePointer
              ? normalize(engine.pointer.x - player.x, engine.pointer.y - player.y, 0, -1)
              : { x: 0, y: -1 };
          player.heading = Math.atan2(aim.y, aim.x);
          const spread = kills > 18 ? [-0.16, 0, 0.16] : [0];
          spread.forEach((offset) => {
            const angle = player.heading + offset;
            shots.push({
              x: player.x + Math.cos(angle) * 14,
              y: player.y + Math.sin(angle) * 14,
              vx: Math.cos(angle) * 8.2,
              vy: Math.sin(angle) * 8.2,
              r: 3.6,
              life: 84
            });
          });
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let index = shots.length - 1; index >= 0; index -= 1) {
        const shot = shots[index];
        shot.x += shot.vx * step;
        shot.y += shot.vy * step;
        shot.life -= 1 * step;
        if (shot.life <= 0 || shot.x < -30 || shot.x > engine.width + 30 || shot.y < -30 || shot.y > engine.height + 30) {
          shots.splice(index, 1);
        }
      }

      for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
        const bullet = enemyBullets[index];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        bullet.life -= 1 * step;
        if (bullet.life <= 0 || bullet.x < -32 || bullet.x > engine.width + 32 || bullet.y < -32 || bullet.y > engine.height + 32) {
          enemyBullets.splice(index, 1);
        }
      }

      for (let index = enemies.length - 1; index >= 0; index -= 1) {
        const enemy = enemies[index];
        let removed = false;
        enemy.x += enemy.vx * step;
        enemy.y += enemy.vy * step;
        enemy.phase += 0.02 * step;
        enemy.fire -= dt;
        if (enemy.fire <= 0) {
          const target = normalize(player.x - enemy.x, player.y - enemy.y, 0, 1);
          const angle = Math.atan2(target.y, target.x);
          if (enemy.kind === 'fan') {
            [-0.38, 0, 0.38].forEach((offset) => {
              const a = angle + offset;
              enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, r: 4.2, life: 120 });
            });
            enemy.fire = rand(800, 1080);
          } else if (enemy.kind === 'burst') {
            const count = 6 + Math.floor(Math.min(6, score / 120));
            for (let k = 0; k < count; k += 1) {
              const a = (k / count) * TAU + enemy.phase;
              enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 2.7, vy: Math.sin(a) * 2.7, r: 4.6, life: 132 });
            }
            enemy.fire = rand(980, 1280);
          } else {
            enemy.phase += 0.44;
            [0, Math.PI].forEach((offset) => {
              const a = enemy.phase + offset;
              enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 3.0, vy: Math.sin(a) * 3.0, r: 4.0, life: 128 });
            });
            enemy.fire = rand(520, 760);
          }
        }

        if (enemy.x < -60 || enemy.x > engine.width + 60 || enemy.y > engine.height + 60 || enemy.y < -60) {
          enemies.splice(index, 1);
          continue;
        }

        for (let shotIndex = shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
          if (circleHit(enemy, shots[shotIndex])) {
            enemy.hp -= 1;
            shots.splice(shotIndex, 1);
            burst(particles, enemy.x, enemy.y, 3, engine.palette.accent, 1.6, Math.PI);
            if (enemy.hp <= 0) {
              destroyEnemy(index);
              removed = true;
            }
            break;
          }
        }

        if (removed) continue;

        if (alive && circleHit(enemy, player, -1)) {
          player.hp = 0;
          lose(engine);
        }
      }

      if (alive && player.invuln <= 0) {
        for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
          if (circleHit(player, enemyBullets[index])) {
            enemyBullets.splice(index, 1);
            player.hp -= 1;
            player.invuln = 900;
            burst(particles, player.x, player.y, 6, engine.palette.warn, 2.4);
            if (player.hp <= 0) lose(engine);
            break;
          }
        }
      }

      updateParticles(particles, step);

      enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.strokeStyle = enemy.kind === 'burst' ? engine.palette.accent2 : engine.palette.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.r, 0, TAU);
        ctx.stroke();
        ctx.rotate(enemy.phase);
        ctx.beginPath();
        ctx.moveTo(-enemy.r - 3, 0);
        ctx.lineTo(enemy.r + 3, 0);
        ctx.stroke();
        if (enemy.kind !== 'fan') {
          ctx.beginPath();
          ctx.moveTo(0, -enemy.r - 3);
          ctx.lineTo(0, enemy.r + 3);
          ctx.stroke();
        }
        ctx.restore();
      });

      shots.forEach((shot) => {
        ctx.save();
        ctx.fillStyle = engine.palette.good;
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, shot.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      enemyBullets.forEach((bullet) => {
        ctx.save();
        ctx.fillStyle = engine.palette.warn;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      drawParticles(ctx, particles);

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.heading + Math.PI * 0.5);
      ctx.globalAlpha = player.invuln > 0 ? 0.55 + Math.sin(engine.now * 0.03) * 0.2 : 1;
      ctx.fillStyle = engine.palette.ink;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = engine.palette.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Bullet Weave',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `HP ${Math.max(0, player.hp)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Run reset', 'Auto-restarting the danmaku lane…');
      }
    }
  };
}

function chainRunnerMode() {
  let player;
  let obstacles = [];
  let particles = [];
  let stripes = [];
  let score = 0;
  let best = loadBest('chain-runner');
  let speed = 6;
  let spawnTimer = 0;
  let groundY = 0;
  let alive = true;
  let restartAt = 0;

  function reset(engine) {
    groundY = engine.height * 0.8;
    player = {
      x: engine.width * 0.18,
      y: groundY,
      vy: 0,
      r: 18,
      jumps: 0
    };
    obstacles = [];
    particles = [];
    stripes = Array.from({ length: 14 }, (_, index) => ({
      x: (index / 14) * engine.width,
      width: rand(60, 180),
      y: engine.height * rand(0.24, 0.72),
      speed: rand(0.35, 1.2)
    }));
    score = 0;
    speed = 6;
    spawnTimer = 56;
    alive = true;
    restartAt = 0;
  }

  function jump() {
    if (!alive) return;
    if (player.jumps < 1) {
      player.vy = -11.2 - speed * 0.08;
      player.jumps += 1;
      burst(particles, player.x - 6, groundY + 2, 5, '#ffffff', 2.2, Math.PI);
    }
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1500;
    best = saveBest('chain-runner', Math.floor(score));
    burst(particles, player.x, player.y, 18, engine.palette.warn, 3.1);
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
      if (isDown && (code === 'Space' || code === 'ArrowUp' || code === 'KeyW')) {
        jump();
      }
    },
    update(engine, ctx, dt) {
      const step = dt / FRAME;
      drawBackdrop(ctx, engine, score * 0.55);

      if (alive) {
        score += speed * 0.16 * step;
        speed += 0.0024 * step;
        spawnTimer -= 1 * step;
        if (spawnTimer <= 0) {
          const width = rand(28, 66);
          const height = rand(34, 92);
          obstacles.push({
            x: engine.width + width + rand(0, 40),
            y: groundY - height,
            w: width,
            h: height
          });
          if (Math.random() > 0.75 && score > 60) {
            obstacles.push({
              x: engine.width + width + rand(100, 170),
              y: groundY - rand(26, 72),
              w: rand(24, 46),
              h: rand(26, 64)
            });
          }
          spawnTimer = Math.max(28, 84 - speed * 4 + rand(-10, 12));
        }

        player.vy += 0.62 * step;
        player.y += player.vy * step;
        if (player.y >= groundY) {
          player.y = groundY;
          player.vy = 0;
          player.jumps = 0;
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      stripes.forEach((stripe) => {
        stripe.x -= stripe.speed * speed * 0.6 * step;
        if (stripe.x + stripe.width < 0) {
          stripe.x = engine.width + rand(10, 140);
          stripe.width = rand(60, 180);
          stripe.y = engine.height * rand(0.24, 0.72);
          stripe.speed = rand(0.35, 1.2);
        }
      });

      for (let index = obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = obstacles[index];
        obstacle.x -= speed * 6.4 * step;
        if (obstacle.x + obstacle.w < -20) {
          obstacles.splice(index, 1);
          continue;
        }
        if (alive && circleRect({ x: player.x, y: player.y - player.r * 0.3, r: player.r * 0.72 }, obstacle)) {
          lose(engine);
        }
      }

      updateParticles(particles, step);

      stripes.forEach((stripe) => {
        ctx.save();
        ctx.globalAlpha = 0.35;
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

      obstacles.forEach((obstacle) => {
        ctx.save();
        roundRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 14);
        ctx.fillStyle = engine.palette.accent2;
        ctx.globalAlpha = 0.14;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = engine.palette.accent;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      });

      drawParticles(ctx, particles);

      const nodes = [
        { x: player.x - 18, y: groundY + 10 },
        { x: player.x - 10, y: player.y + 2 },
        { x: player.x + 2, y: player.y - 2 },
        { x: player.x + 15, y: player.y - 5 }
      ];
      ctx.save();
      ctx.strokeStyle = engine.palette.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      nodes.slice(1).forEach((node) => ctx.lineTo(node.x, node.y));
      ctx.stroke();
      nodes.forEach((node, index) => {
        ctx.beginPath();
        ctx.fillStyle = index === nodes.length - 1 ? engine.palette.ink : engine.palette.good;
        ctx.arc(node.x, node.y, index === nodes.length - 1 ? 10 : 7, 0, TAU);
        ctx.fill();
      });
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Chain Runner',
        `Distance ${Math.floor(score)}`,
        `Best ${best}`,
        `Speed ${speed.toFixed(1)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Run reset', 'Auto-restarting the runner track…');
      }
    }
  };
}

function survivorFieldMode() {
  let player;
  let bullets = [];
  let enemies = [];
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
      hp: 5,
      invuln: 0,
      fire: 0,
      level: 1
    };
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    kills = 0;
    stageTime = 0;
    spawnTimer = 0;
    alive = true;
    restartAt = 0;
  }

  function spawnEnemy(engine) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = rand(0, engine.width);
      y = -24;
    } else if (edge === 1) {
      x = engine.width + 24;
      y = rand(0, engine.height);
    } else if (edge === 2) {
      x = rand(0, engine.width);
      y = engine.height + 24;
    } else {
      x = -24;
      y = rand(0, engine.height);
    }
    const tier = 1 + Math.floor(stageTime / 22000);
    enemies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      r: rand(10, 15) + tier * 0.2,
      hp: 1 + Math.floor(Math.random() * Math.min(3, 1 + tier * 0.5)),
      speed: rand(1.15, 1.9) + tier * 0.08
    });
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1600;
    best = saveBest('survivor-field', Math.floor(score));
    burst(particles, player.x, player.y, 20, '#ffffff', 3.4);
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
        score = stageTime * 0.02 + kills * 10;
        player.level = 1 + Math.min(5, Math.floor(stageTime / 15000));
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy(engine);
          spawnTimer = Math.max(180, 780 - Math.min(440, stageTime * 0.008));
        }

        const keys = inputVector(engine);
        const usePointer = pointerRecent(engine);
        let moveX = keys.x;
        let moveY = keys.y;
        if (usePointer) {
          const dir = normalize(engine.pointer.x - player.x, engine.pointer.y - player.y, 0, 0);
          const dist = length(engine.pointer.x - player.x, engine.pointer.y - player.y);
          if (dist > 12) {
            moveX = dir.x * Math.min(1, dist / 80);
            moveY = dir.y * Math.min(1, dist / 80);
          }
        }

        player.vx += moveX * 0.48 * step;
        player.vy += moveY * 0.48 * step;
        player.vx *= 0.82;
        player.vy *= 0.82;
        player.x = clamp(player.x + player.vx * step * 4.4, 18, engine.width - 18);
        player.y = clamp(player.y + player.vy * step * 4.4, 18, engine.height - 18);
        player.invuln = Math.max(0, player.invuln - dt);

        player.fire -= dt;
        if (player.fire <= 0) {
          player.fire = Math.max(86, 210 - player.level * 22);
          const target = enemies.reduce((bestTarget, enemy) => {
            if (!bestTarget) return enemy;
            return distanceSq(enemy, player) < distanceSq(bestTarget, player) ? enemy : bestTarget;
          }, null);
          if (target) {
            const base = Math.atan2(target.y - player.y, target.x - player.x);
            const count = Math.min(5, player.level);
            const spread = count === 1 ? [0] : Array.from({ length: count }, (_, index) => -0.24 + (index / (count - 1)) * 0.48);
            spread.forEach((offset) => {
              const angle = base + offset;
              bullets.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * (5.8 + player.level * 0.25),
                vy: Math.sin(angle) * (5.8 + player.level * 0.25),
                r: 3.8,
                life: 64
              });
            });
          }
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let index = bullets.length - 1; index >= 0; index -= 1) {
        const bullet = bullets[index];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        bullet.life -= 1 * step;
        if (bullet.life <= 0 || bullet.x < -20 || bullet.x > engine.width + 20 || bullet.y < -20 || bullet.y > engine.height + 20) {
          bullets.splice(index, 1);
        }
      }

      for (let index = enemies.length - 1; index >= 0; index -= 1) {
        const enemy = enemies[index];
        let removed = false;
        const dir = normalize(player.x - enemy.x, player.y - enemy.y, 0, 0);
        enemy.vx = dir.x * enemy.speed;
        enemy.vy = dir.y * enemy.speed;
        enemy.x += enemy.vx * step;
        enemy.y += enemy.vy * step;

        for (let shotIndex = bullets.length - 1; shotIndex >= 0; shotIndex -= 1) {
          if (circleHit(enemy, bullets[shotIndex])) {
            bullets.splice(shotIndex, 1);
            enemy.hp -= 1;
            burst(particles, enemy.x, enemy.y, 4, engine.palette.good, 1.7);
            if (enemy.hp <= 0) {
              burst(particles, enemy.x, enemy.y, 8, engine.palette.accent, 2.4);
              enemies.splice(index, 1);
              kills += 1;
              removed = true;
            }
            break;
          }
        }

        if (removed) continue;

        if (alive && player.invuln <= 0 && circleHit(enemy, player, -1)) {
          player.hp -= 1;
          player.invuln = 860;
          burst(particles, player.x, player.y, 8, engine.palette.warn, 2.5);
          if (player.hp <= 0) lose(engine);
        }
      }

      updateParticles(particles, step);

      enemies.forEach((enemy) => {
        ctx.save();
        ctx.fillStyle = engine.palette.accent2;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = engine.palette.warn;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      bullets.forEach((bullet) => {
        ctx.save();
        ctx.fillStyle = engine.palette.good;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      drawParticles(ctx, particles);

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalAlpha = player.invuln > 0 ? 0.52 + Math.sin(engine.now * 0.04) * 0.22 : 1;
      ctx.strokeStyle = engine.palette.accent;
      ctx.lineWidth = 1.6;
      for (let ring = 0; ring < player.level; ring += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, player.r + ring * 4, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = engine.palette.ink;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, TAU);
      ctx.fill();
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Survivor Field',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `Level ${player.level} · HP ${Math.max(0, player.hp)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Field reset', 'Auto-restarting the survivor arena…');
      }
    }
  };
}

function driftShooterMode() {
  let ship;
  let rocks = [];
  let bullets = [];
  let particles = [];
  let score = 0;
  let best = loadBest('drift-shooter');
  let spawnTimer = 0;
  let alive = true;
  let restartAt = 0;

  function reset(engine) {
    ship = {
      x: engine.width * 0.5,
      y: engine.height * 0.52,
      vx: 0,
      vy: 0,
      r: 13,
      hp: 3,
      invuln: 0,
      fire: 0,
      angle: -Math.PI * 0.5
    };
    rocks = [];
    bullets = [];
    particles = [];
    score = 0;
    spawnTimer = 300;
    alive = true;
    restartAt = 0;
  }

  function spawnRock(engine, radius = rand(18, 34), x = null, y = null, vx = null, vy = null) {
    let px = x;
    let py = y;
    if (px == null || py == null) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        px = rand(0, engine.width);
        py = -radius - 16;
      } else if (edge === 1) {
        px = engine.width + radius + 16;
        py = rand(0, engine.height);
      } else if (edge === 2) {
        px = rand(0, engine.width);
        py = engine.height + radius + 16;
      } else {
        px = -radius - 16;
        py = rand(0, engine.height);
      }
    }
    rocks.push({
      x: px,
      y: py,
      vx: vx ?? rand(-1.1, 1.1),
      vy: vy ?? rand(-1.1, 1.1),
      r: radius,
      spin: rand(-0.04, 0.04),
      angle: rand(0, TAU),
      hp: Math.max(1, Math.ceil(radius / 14))
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
        rock.vx + Math.cos(angle) * rand(0.8, 1.8),
        rock.vy + Math.sin(angle) * rand(0.8, 1.8)
      );
    }
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1500;
    best = saveBest('drift-shooter', Math.floor(score));
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
        score += 0.11 * step;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnRock(engine);
          spawnTimer = Math.max(260, 900 - score * 0.9 + rand(-140, 160));
        }

        const keys = inputVector(engine);
        const usePointer = pointerRecent(engine);
        let accelX = keys.x;
        let accelY = keys.y;
        if (usePointer) {
          const dir = normalize(engine.pointer.x - ship.x, engine.pointer.y - ship.y, 0, 0);
          const dist = length(engine.pointer.x - ship.x, engine.pointer.y - ship.y);
          if (dist > 14) {
            accelX = dir.x * Math.min(1, dist / 100);
            accelY = dir.y * Math.min(1, dist / 100);
          }
        }
        ship.vx += accelX * 0.34 * step;
        ship.vy += accelY * 0.34 * step;
        ship.vx *= 0.992;
        ship.vy *= 0.992;
        ship.x += ship.vx * step * 3.8;
        ship.y += ship.vy * step * 3.8;
        if (ship.x < -20) ship.x = engine.width + 20;
        if (ship.x > engine.width + 20) ship.x = -20;
        if (ship.y < -20) ship.y = engine.height + 20;
        if (ship.y > engine.height + 20) ship.y = -20;
        ship.invuln = Math.max(0, ship.invuln - dt);

        ship.fire -= dt;
        if (ship.fire <= 0) {
          ship.fire = 130;
          const target = usePointer
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
              vx: aim.x * 7.2 + ship.vx * 0.2,
              vy: aim.y * 7.2 + ship.vy * 0.2,
              r: 3.2,
              life: 86
            });
          }
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let index = bullets.length - 1; index >= 0; index -= 1) {
        const bullet = bullets[index];
        bullet.x += bullet.vx * step;
        bullet.y += bullet.vy * step;
        bullet.life -= 1 * step;
        if (bullet.life <= 0) {
          bullets.splice(index, 1);
          continue;
        }
        if (bullet.x < -20) bullet.x = engine.width + 20;
        if (bullet.x > engine.width + 20) bullet.x = -20;
        if (bullet.y < -20) bullet.y = engine.height + 20;
        if (bullet.y > engine.height + 20) bullet.y = -20;
      }

      for (let index = rocks.length - 1; index >= 0; index -= 1) {
        const rock = rocks[index];
        let removed = false;
        rock.x += rock.vx * step;
        rock.y += rock.vy * step;
        rock.angle += rock.spin * step;
        if (rock.x < -rock.r - 36) rock.x = engine.width + rock.r + 36;
        if (rock.x > engine.width + rock.r + 36) rock.x = -rock.r - 36;
        if (rock.y < -rock.r - 36) rock.y = engine.height + rock.r + 36;
        if (rock.y > engine.height + rock.r + 36) rock.y = -rock.r - 36;

        for (let shotIndex = bullets.length - 1; shotIndex >= 0; shotIndex -= 1) {
          if (circleHit(rock, bullets[shotIndex])) {
            bullets.splice(shotIndex, 1);
            rock.hp -= 1;
            burst(particles, bullets[shotIndex]?.x ?? rock.x, bullets[shotIndex]?.y ?? rock.y, 4, engine.palette.accent, 1.8);
            if (rock.hp <= 0) {
              splitRock(rock);
              burst(particles, rock.x, rock.y, 10, engine.palette.good, 2.5);
              score += Math.round(rock.r);
              rocks.splice(index, 1);
              removed = true;
            }
            break;
          }
        }

        if (removed) continue;

        if (alive && ship.invuln <= 0 && circleHit(ship, rock, -2)) {
          ship.hp -= 1;
          ship.invuln = 850;
          burst(particles, ship.x, ship.y, 8, engine.palette.warn, 2.6);
          if (ship.hp <= 0) lose(engine);
        }
      }

      updateParticles(particles, step);

      rocks.forEach((rock) => {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.angle);
        ctx.strokeStyle = engine.palette.accent2;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 7; i += 1) {
          const angle = (i / 7) * TAU;
          const radius = rock.r * (0.82 + Math.sin(angle * 3 + rock.angle) * 0.18);
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      bullets.forEach((bullet) => {
        ctx.save();
        ctx.fillStyle = engine.palette.good;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      drawParticles(ctx, particles);

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
        'Drift Shooter',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `HP ${Math.max(0, ship.hp)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Field reset', 'Auto-restarting the drift combat…');
      }
    }
  };
}

function waveGliderMode() {
  let player;
  let gates = [];
  let particles = [];
  let score = 0;
  let best = loadBest('wave-glider');
  let speed = 4.6;
  let spawnTimer = 0;
  let alive = true;
  let restartAt = 0;
  let phase = 0;

  function reset(engine) {
    player = {
      x: engine.width * 0.28,
      y: engine.height * 0.5,
      vy: 0,
      r: 12,
      trail: []
    };
    gates = [];
    particles = [];
    score = 0;
    speed = 4.6;
    spawnTimer = 0;
    alive = true;
    restartAt = 0;
    phase = 0;
  }

  function spawnGate(engine) {
    const gap = clamp(engine.height * 0.28 - score * 0.2, 118, 188);
    const center = rand(gap * 0.6, engine.height - gap * 0.6);
    gates.push({
      x: engine.width + 60,
      w: 42,
      gapY: center,
      gapH: gap,
      passed: false
    });
  }

  function lose(engine) {
    if (!alive) return;
    alive = false;
    restartAt = engine.now + 1450;
    best = saveBest('wave-glider', Math.floor(score));
    burst(particles, player.x, player.y, 16, '#ffffff', 3.2);
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
        speed += 0.0013 * step;
        spawnTimer -= 1 * step;
        if (spawnTimer <= 0) {
          spawnGate(engine);
          spawnTimer = Math.max(32, 82 - score * 0.08);
        }

        const lift = engine.pointer.down || engine.keys.has('Space') || engine.keys.has('ArrowUp') || engine.keys.has('KeyW');
        player.vy += (lift ? -0.56 : 0.34) * step;
        player.vy = clamp(player.vy, -7.2, 7.2);
        player.y += player.vy * step;
        score += 0.08 * step;

        if (player.y < 10 || player.y > engine.height - 10) {
          lose(engine);
        }
      } else if (engine.now >= restartAt) {
        reset(engine);
      }

      for (let index = gates.length - 1; index >= 0; index -= 1) {
        const gate = gates[index];
        gate.x -= speed * 4.8 * step;
        if (!gate.passed && gate.x + gate.w < player.x) {
          gate.passed = true;
          score += 12;
          burst(particles, player.x, player.y, 8, engine.palette.good, 2.4);
        }
        if (alive && player.x + player.r > gate.x && player.x - player.r < gate.x + gate.w) {
          const top = gate.gapY - gate.gapH * 0.5;
          const bottom = gate.gapY + gate.gapH * 0.5;
          if (player.y - player.r < top || player.y + player.r > bottom) {
            lose(engine);
          }
        }
        if (gate.x + gate.w < -60) gates.splice(index, 1);
      }

      updateParticles(particles, step);

      ctx.save();
      ctx.strokeStyle = engine.palette.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= engine.width; x += 18) {
        const y = engine.height * 0.78 + Math.sin(phase + x * 0.012) * 9;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      gates.forEach((gate) => {
        const topH = gate.gapY - gate.gapH * 0.5;
        const bottomY = gate.gapY + gate.gapH * 0.5;
        const bottomH = engine.height - bottomY;
        ctx.save();
        roundRect(ctx, gate.x, 0, gate.w, topH, 18);
        ctx.fillStyle = engine.palette.accent2;
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = engine.palette.accent;
        ctx.stroke();
        roundRect(ctx, gate.x, bottomY, gate.w, bottomH, 18);
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.restore();
      });

      drawParticles(ctx, particles);

      player.trail.unshift({ x: player.x, y: player.y });
      if (player.trail.length > 16) player.trail.pop();
      ctx.save();
      ctx.strokeStyle = engine.palette.good;
      ctx.lineWidth = 3;
      ctx.beginPath();
      player.trail.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = engine.palette.ink;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = engine.palette.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      drawTextPanel(ctx, engine, [
        'Wave Glider',
        `Score ${Math.floor(score)}`,
        `Best ${best}`,
        `Speed ${speed.toFixed(1)}`
      ], 14, 14);

      if (!alive) {
        drawOverlay(ctx, engine, 'Flight reset', 'Auto-restarting the glider lane…');
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
