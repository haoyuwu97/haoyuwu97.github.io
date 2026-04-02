import { clamp, prefersReducedMotion } from './utils.js';

const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function wrap(value, max, margin = 120) {
  if (value < -margin) return max + margin;
  if (value > max + margin) return -margin;
  return value;
}

function rotate(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

function recenter(points) {
  const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const cx = center.x / points.length;
  const cy = center.y / points.length;
  return points.map((point) => ({ ...point, x: point.x - cx, y: point.y - cy }));
}

function persistentWalk(length, step, turn = 0.62) {
  const points = [{ x: 0, y: 0 }];
  let angle = random(0, TAU);
  for (let index = 1; index < length; index += 1) {
    angle += random(-turn, turn);
    const prev = points[index - 1];
    points.push({
      x: prev.x + Math.cos(angle) * step,
      y: prev.y + Math.sin(angle) * step
    });
  }
  return recenter(points);
}

function buildBranch(anchor, count, step) {
  const branch = [{ x: 0, y: 0 }];
  let angle = random(-1.5, 1.5);
  for (let index = 1; index < count; index += 1) {
    angle += random(-0.45, 0.45);
    const prev = branch[index - 1];
    branch.push({
      x: prev.x + Math.cos(angle) * step,
      y: prev.y + Math.sin(angle) * step
    });
  }
  return { anchor, points: branch };
}

function buildChainGeometry(kind) {
  const count = Math.floor(random(10, 18));
  const step = random(16, 24);

  if (kind === 'loop') {
    const rx = random(34, 68);
    const ry = random(24, 46);
    const points = Array.from({ length: count }, (_, index) => {
      const theta = (index / count) * TAU;
      return {
        x: Math.cos(theta) * rx,
        y: Math.sin(theta) * ry
      };
    });
    return { points, branches: [], closed: true };
  }

  if (kind === 'stretched') {
    const points = Array.from({ length: count }, (_, index) => {
      const t = index - (count - 1) / 2;
      return {
        x: t * step,
        y: Math.sin(index * 0.72 + random(0, TAU)) * random(5, 13)
      };
    });
    return { points, branches: [], closed: false };
  }

  if (kind === 'folded') {
    const half = Math.ceil(count / 2);
    const first = Array.from({ length: half }, (_, index) => ({
      x: index * step,
      y: Math.sin(index * 0.82) * random(4, 11)
    }));
    const second = Array.from({ length: count - half }, (_, index) => ({
      x: first.at(-1).x - (index + 1) * step * 0.88,
      y: random(12, 26) + Math.sin(index * 0.9 + 0.6) * random(4, 10)
    }));
    return { points: recenter([...first, ...second]), branches: [], closed: false };
  }

  if (kind === 'branched') {
    const points = persistentWalk(count, step, 0.48);
    const anchor = Math.floor(random(count * 0.3, count * 0.7));
    const branches = [buildBranch(anchor, Math.floor(random(4, 7)), step * 0.66)];
    if (Math.random() > 0.55) {
      branches.push(buildBranch(Math.floor(random(count * 0.2, count * 0.8)), Math.floor(random(3, 5)), step * 0.56));
    }
    return { points, branches, closed: false };
  }

  return { points: persistentWalk(count, step, 0.7), branches: [], closed: false };
}

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  return {
    backdropStart: styles.getPropertyValue('--field-backdrop-1').trim() || 'rgba(12, 18, 34, 0.95)',
    backdropEnd: styles.getPropertyValue('--field-backdrop-2').trim() || 'rgba(6, 10, 20, 0.96)',
    glowA: styles.getPropertyValue('--field-glow-a').trim() || 'rgba(143, 243, 255, 0.08)',
    glowB: styles.getPropertyValue('--field-glow-b').trim() || 'rgba(136, 164, 255, 0.06)',
    bond: styles.getPropertyValue('--field-bond').trim() || 'rgba(126, 231, 255, 0.18)',
    bondSoft: styles.getPropertyValue('--field-bond-soft').trim() || 'rgba(136, 164, 255, 0.08)',
    bead: styles.getPropertyValue('--field-bead').trim() || 'rgba(210, 244, 255, 0.72)',
    beadCore: styles.getPropertyValue('--field-bead-core').trim() || 'rgba(255, 255, 255, 0.92)',
    particle: styles.getPropertyValue('--field-particle').trim() || 'rgba(255, 255, 255, 0.6)',
    particleSoft: styles.getPropertyValue('--field-particle-soft').trim() || 'rgba(143, 243, 255, 0.18)',
    halo: styles.getPropertyValue('--field-halo').trim() || 'rgba(143, 243, 255, 0.16)'
  };
}

function buildChain(state, variant, density, reduced) {
  const kind = pick(['coil', 'coil', 'stretched', 'loop', 'folded', 'branched']);
  const geometry = buildChainGeometry(kind);
  const scale = random(0.8, 1.25) * (variant === 'hero' ? 1 : 0.92);
  const speedScale = reduced ? 0.45 : 1;
  return {
    kind,
    closed: geometry.closed,
    points: geometry.points.map((point, index) => ({
      ...point,
      ampX: random(0.4, 1.8),
      ampY: random(0.3, 1.6),
      phase: random(0, TAU),
      speed: random(0.00022, 0.00055),
      bead: index % 2 === 0 || geometry.closed
    })),
    branches: geometry.branches.map((branch) => ({
      anchor: branch.anchor,
      points: branch.points.map((point) => ({
        ...point,
        ampX: random(0.2, 1.0),
        ampY: random(0.2, 0.9),
        phase: random(0, TAU),
        speed: random(0.00026, 0.0006)
      }))
    })),
    center: {
      x: random(-60, state.width + 60),
      y: random(-40, state.height + 40),
      vx: random(-0.05, 0.05) * speedScale * density,
      vy: random(-0.04, 0.04) * speedScale * density
    },
    rotation: random(0, TAU),
    rotSpeed: random(-0.00014, 0.00014) * speedScale,
    scale,
    breathAmp: random(0.015, 0.045),
    breathSpeed: random(0.00018, 0.00038),
    swayAmp: random(4, 14),
    swaySpeed: random(0.00014, 0.00028),
    phase: random(0, TAU),
    depth: random(0.7, 1.18),
    lineWidth: random(1.05, 1.7)
  };
}

function buildParticle(state, variant, reduced) {
  const band = variant === 'hero' ? 1 : 0.75;
  return {
    x: random(0, state.width),
    y: random(0, state.height),
    vx: random(-0.08, 0.08) * band,
    vy: random(-0.06, 0.06) * band,
    size: random(1.2, 2.9),
    alpha: random(0.14, 0.42),
    phase: random(0, TAU),
    drift: random(0.00018, 0.00048),
    depth: reduced ? random(0.7, 1) : random(0.65, 1.12)
  };
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;

  const variant = options.variant || 'hero';
  const reduced = prefersReducedMotion();
  const density = options.density ?? 1;
  const ctx = canvas.getContext('2d');
  const state = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    pointer: { x: 0, y: 0, active: false, down: false },
    chains: [],
    particles: [],
    rafId: null,
    time: 0,
    running: true,
    palette: readPalette()
  };

  const profile = {
    hero: { chains: reduced ? 8 : 13, particles: reduced ? 22 : 44 },
    page: { chains: reduced ? 5 : 8, particles: reduced ? 16 : 28 }
  }[variant] || { chains: 8, particles: 24 };

  function seed() {
    const chainCount = Math.max(4, Math.round(profile.chains * density));
    const particleCount = Math.max(10, Math.round(profile.particles * density));
    state.chains = Array.from({ length: chainCount }, () => buildChain(state, variant, density, reduced));
    state.particles = Array.from({ length: particleCount }, () => buildParticle(state, variant, reduced));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, Math.floor(rect.width));
    state.height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    seed();
  }

  function transformPoint(chain, point, index, time) {
    const breath = 1 + Math.sin(time * chain.breathSpeed + chain.phase) * chain.breathAmp;
    const wobbleX = Math.sin(time * point.speed + point.phase + index * 0.19) * point.ampX;
    const wobbleY = Math.cos(time * point.speed * 1.1 + point.phase + index * 0.14) * point.ampY;
    const local = rotate((point.x + wobbleX) * chain.scale * breath, (point.y + wobbleY) * chain.scale * breath, chain.rotation);
    const swayX = Math.sin(time * chain.swaySpeed + chain.phase) * chain.swayAmp * 0.18;
    const swayY = Math.cos(time * chain.swaySpeed * 1.16 + chain.phase) * chain.swayAmp * 0.14;
    return {
      x: chain.center.x + local.x + swayX,
      y: chain.center.y + local.y + swayY
    };
  }

  function update(deltaMs) {
    state.time += deltaMs;
    const influenceRadius = state.pointer.down ? 170 : 125;

    state.chains.forEach((chain) => {
      chain.center.x = wrap(chain.center.x + chain.center.vx, state.width, 180);
      chain.center.y = wrap(chain.center.y + chain.center.vy, state.height, 180);
      chain.rotation += chain.rotSpeed * deltaMs;

      if (state.pointer.active) {
        const dx = chain.center.x - state.pointer.x;
        const dy = chain.center.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < influenceRadius) {
          const force = (1 - dist / influenceRadius) * (state.pointer.down ? 0.0011 : 0.00038);
          chain.center.vx += (dx / (dist + 0.001)) * force * deltaMs;
          chain.center.vy += (dy / (dist + 0.001)) * force * deltaMs;
        }
      }

      chain.center.vx = clamp(chain.center.vx + Math.sin(state.time * 0.00008 + chain.phase) * 0.0005, -0.07, 0.07);
      chain.center.vy = clamp(chain.center.vy + Math.cos(state.time * 0.00009 + chain.phase) * 0.0004, -0.06, 0.06);
      chain.center.vx *= 0.998;
      chain.center.vy *= 0.998;
    });

    state.particles.forEach((particle) => {
      particle.x = wrap(particle.x + particle.vx + Math.sin(state.time * particle.drift + particle.phase) * 0.12 * particle.depth, state.width, 80);
      particle.y = wrap(particle.y + particle.vy + Math.cos(state.time * particle.drift * 1.1 + particle.phase) * 0.12 * particle.depth, state.height, 80);

      if (state.pointer.active) {
        const dx = particle.x - state.pointer.x;
        const dy = particle.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 90) {
          const push = (1 - dist / 90) * (state.pointer.down ? 0.55 : 0.18);
          particle.x = wrap(particle.x + (dx / (dist + 0.001)) * push * 2.1, state.width, 80);
          particle.y = wrap(particle.y + (dy / (dist + 0.001)) * push * 2.1, state.height, 80);
        }
      }
    });
  }

  function drawBackground() {
    ctx.clearRect(0, 0, state.width, state.height);

    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, state.palette.backdropStart);
    gradient.addColorStop(1, state.palette.backdropEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowA = ctx.createRadialGradient(state.width * 0.2, state.height * 0.22, 0, state.width * 0.2, state.height * 0.22, Math.max(state.width, state.height) * 0.42);
    glowA.addColorStop(0, state.palette.glowA);
    glowA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowB = ctx.createRadialGradient(state.width * 0.78, state.height * 0.72, 0, state.width * 0.78, state.height * 0.72, Math.max(state.width, state.height) * 0.38);
    glowB.addColorStop(0, state.palette.glowB);
    glowB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawChains() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    state.chains.forEach((chain, chainIndex) => {
      const points = chain.points.map((point, index) => transformPoint(chain, point, index, state.time));
      const branchSets = chain.branches.map((branch) => ({
        anchor: points[branch.anchor],
        points: branch.points.map((point, index) => transformPoint(chain, point, index + 1.5, state.time))
      }));

      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      if (chain.closed && points.length > 2) ctx.closePath();
      ctx.strokeStyle = chainIndex % 2 === 0 ? state.palette.bond : state.palette.bondSoft;
      ctx.lineWidth = chain.lineWidth * chain.depth;
      ctx.stroke();

      branchSets.forEach((branch) => {
        ctx.beginPath();
        ctx.moveTo(branch.anchor.x, branch.anchor.y);
        branch.points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.strokeStyle = state.palette.bondSoft;
        ctx.lineWidth = Math.max(0.9, chain.lineWidth * 0.8);
        ctx.stroke();
      });

      points.forEach((point, index) => {
        const source = chain.points[index];
        if (!source.bead) return;
        const size = (chain.kind === 'loop' ? 2.2 : 1.9) * chain.depth;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size + 0.6, 0, TAU);
        ctx.fillStyle = state.palette.bead;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 0.48, 0, TAU);
        ctx.fillStyle = state.palette.beadCore;
        ctx.fill();
      });

      branchSets.forEach((branch) => {
        branch.points.forEach((point, index) => {
          if (index === 0) return;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.1, 0, TAU);
          ctx.fillStyle = state.palette.bead;
          ctx.fill();
        });
      });
    });
  }

  function drawParticles() {
    state.particles.forEach((particle, index) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.depth, 0, TAU);
      ctx.fillStyle = index % 5 === 0 ? state.palette.particleSoft : state.palette.particle;
      ctx.fill();
    });

    if (state.pointer.active && !reduced) {
      const glow = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, 150);
      glow.addColorStop(0, state.palette.halo);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(state.pointer.x - 160, state.pointer.y - 160, 320, 320);
    }
  }

  let lastTime = performance.now();

  function frame(now) {
    if (!state.running) return;
    const deltaMs = Math.min(40, now - lastTime);
    lastTime = now;
    update(deltaMs);
    drawBackground();
    drawParticles();
    drawChains();
    state.rafId = requestAnimationFrame(frame);
  }

  function refreshPalette() {
    state.palette = readPalette();
  }

  function handleMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.active = true;
  }

  function handleLeave() {
    state.pointer.active = false;
    state.pointer.down = false;
  }

  function handleDown(event) {
    handleMove(event);
    state.pointer.down = true;
  }

  function handleUp() {
    state.pointer.down = false;
  }

  function handleTouch(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    handleMove(touch);
    state.pointer.down = event.type === 'touchstart' || event.type === 'touchmove';
    if (event.type === 'touchend' || event.type === 'touchcancel') {
      state.pointer.down = false;
      state.pointer.active = false;
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('themechange', refreshPalette);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mouseleave', handleLeave);
  canvas.addEventListener('mousedown', handleDown);
  window.addEventListener('mouseup', handleUp);
  canvas.addEventListener('touchstart', handleTouch, { passive: true });
  canvas.addEventListener('touchmove', handleTouch, { passive: true });
  canvas.addEventListener('touchend', handleTouch, { passive: true });
  canvas.addEventListener('touchcancel', handleTouch, { passive: true });

  resize();
  state.rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      state.running = false;
      cancelAnimationFrame(state.rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('themechange', refreshPalette);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouch);
      canvas.removeEventListener('touchcancel', handleTouch);
    }
  };
}
