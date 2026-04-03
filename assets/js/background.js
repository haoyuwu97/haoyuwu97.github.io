import { clamp, prefersReducedMotion } from './utils.js';

const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function wrap(value, max, margin = 180) {
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
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const cx = sum.x / points.length;
  const cy = sum.y / points.length;
  return points.map((point) => ({ ...point, x: point.x - cx, y: point.y - cy }));
}

function walk(count, step, turn = 0.55) {
  const points = [{ x: 0, y: 0 }];
  let angle = random(0, TAU);
  for (let i = 1; i < count; i += 1) {
    angle += random(-turn, turn);
    const prev = points[i - 1];
    points.push({
      x: prev.x + Math.cos(angle) * step,
      y: prev.y + Math.sin(angle) * step
    });
  }
  return recenter(points);
}

function buildShape(kind, count, spacing) {
  if (kind === 'ring') {
    const rx = spacing * random(2.6, 4.4);
    const ry = spacing * random(1.7, 3.1);
    return {
      closed: true,
      points: Array.from({ length: count }, (_, index) => {
        const theta = (index / count) * TAU;
        return { x: Math.cos(theta) * rx, y: Math.sin(theta) * ry };
      }),
      branches: []
    };
  }

  if (kind === 'stretched') {
    const points = Array.from({ length: count }, (_, index) => {
      const t = index - (count - 1) / 2;
      return {
        x: t * spacing,
        y: Math.sin(index * 0.82 + random(0, TAU)) * spacing * 0.22
      };
    });
    return { closed: false, points, branches: [] };
  }

  if (kind === 'hairpin') {
    const split = Math.ceil(count * 0.55);
    const left = Array.from({ length: split }, (_, index) => ({
      x: index * spacing,
      y: Math.sin(index * 0.68) * spacing * 0.18
    }));
    const right = Array.from({ length: count - split }, (_, index) => ({
      x: left.at(-1).x - (index + 1) * spacing * 0.88,
      y: spacing * random(1.2, 2.2) + Math.sin(index * 0.8) * spacing * 0.2
    }));
    return { closed: false, points: recenter([...left, ...right]), branches: [] };
  }

  if (kind === 'brush') {
    const backbone = Array.from({ length: count }, (_, index) => ({
      x: (index - (count - 1) / 2) * spacing,
      y: Math.sin(index * 0.65) * spacing * 0.14
    }));
    const branches = [];
    for (let i = 2; i < count - 2; i += 3) {
      const sign = i % 2 === 0 ? -1 : 1;
      const branchCount = Math.max(3, Math.floor(random(3, 5)));
      branches.push({
        anchor: i,
        points: Array.from({ length: branchCount }, (_, k) => ({
          x: 0,
          y: sign * (k + 1) * spacing * 0.75 + Math.sin(k * 0.6) * spacing * 0.05
        }))
      });
    }
    return { closed: false, points: recenter(backbone), branches };
  }

  if (kind === 'folded') {
    const base = walk(count, spacing, 0.38);
    const points = base.map((point, index) => ({
      x: point.x * 0.86,
      y: point.y * 0.66 + Math.sin(index * 0.75) * spacing * 0.18
    }));
    return { closed: false, points: recenter(points), branches: [] };
  }

  return { closed: false, points: walk(count, spacing, 0.62), branches: [] };
}

function themeName() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function readPalette() {
  const light = themeName() === 'light';
  return {
    backdropStart: light ? 'rgba(248, 251, 255, 0.97)' : 'rgba(4, 8, 18, 0.97)',
    backdropEnd: light ? 'rgba(234, 243, 255, 0.98)' : 'rgba(6, 10, 22, 0.98)',
    glowA: light ? 'rgba(61, 130, 255, 0.10)' : 'rgba(111, 231, 255, 0.08)',
    glowB: light ? 'rgba(0, 190, 165, 0.07)' : 'rgba(177, 120, 255, 0.08)',
    grid: light ? 'rgba(54, 94, 164, 0.055)' : 'rgba(142, 176, 242, 0.045)',
    halo: light ? 'rgba(52, 120, 255, 0.11)' : 'rgba(143, 243, 255, 0.12)',
    shadow: light ? 'rgba(25, 46, 86, 0.18)' : 'rgba(0, 0, 0, 0.34)',
    chainSets: light
      ? [
          { bead: '#4f8bff', highlight: 'rgba(255,255,255,0.92)', bond: 'rgba(79,139,255,0.55)', glow: 'rgba(79,139,255,0.16)' },
          { bead: '#19c2a8', highlight: 'rgba(255,255,255,0.9)', bond: 'rgba(25,194,168,0.52)', glow: 'rgba(25,194,168,0.16)' },
          { bead: '#ff8d6d', highlight: 'rgba(255,255,255,0.92)', bond: 'rgba(255,141,109,0.52)', glow: 'rgba(255,141,109,0.15)' },
          { bead: '#c280ff', highlight: 'rgba(255,255,255,0.9)', bond: 'rgba(194,128,255,0.48)', glow: 'rgba(194,128,255,0.15)' },
          { bead: '#f1b941', highlight: 'rgba(255,255,255,0.92)', bond: 'rgba(241,185,65,0.5)', glow: 'rgba(241,185,65,0.16)' }
        ]
      : [
          { bead: '#89e4ff', highlight: 'rgba(255,255,255,0.96)', bond: 'rgba(137,228,255,0.6)', glow: 'rgba(137,228,255,0.18)' },
          { bead: '#86f5aa', highlight: 'rgba(255,255,255,0.94)', bond: 'rgba(134,245,170,0.56)', glow: 'rgba(134,245,170,0.18)' },
          { bead: '#ff8d80', highlight: 'rgba(255,255,255,0.95)', bond: 'rgba(255,141,128,0.55)', glow: 'rgba(255,141,128,0.18)' },
          { bead: '#c3a2ff', highlight: 'rgba(255,255,255,0.94)', bond: 'rgba(195,162,255,0.52)', glow: 'rgba(195,162,255,0.16)' },
          { bead: '#ffd166', highlight: 'rgba(255,255,255,0.95)', bond: 'rgba(255,209,102,0.52)', glow: 'rgba(255,209,102,0.18)' }
        ],
    particleSets: light
      ? [
          { fill: 'rgba(79,139,255,0.42)', core: 'rgba(255,255,255,0.96)', halo: 'rgba(79,139,255,0.10)' },
          { fill: 'rgba(25,194,168,0.38)', core: 'rgba(255,255,255,0.92)', halo: 'rgba(25,194,168,0.1)' },
          { fill: 'rgba(255,141,109,0.38)', core: 'rgba(255,255,255,0.94)', halo: 'rgba(255,141,109,0.1)' }
        ]
      : [
          { fill: 'rgba(137,228,255,0.48)', core: 'rgba(255,255,255,0.96)', halo: 'rgba(137,228,255,0.12)' },
          { fill: 'rgba(134,245,170,0.42)', core: 'rgba(255,255,255,0.94)', halo: 'rgba(134,245,170,0.12)' },
          { fill: 'rgba(255,141,128,0.44)', core: 'rgba(255,255,255,0.95)', halo: 'rgba(255,141,128,0.12)' }
        ]
  };
}

function buildChain(state, variant, reduced) {
  const spacing = variant === 'hero' ? random(30, 40) : random(24, 32);
  const count = Math.floor(random(9, 15));
  const kind = pick(['coil', 'coil', 'stretched', 'ring', 'hairpin', 'folded', 'brush']);
  const shape = buildShape(kind, count, spacing);
  const colorSet = pick(state.palette.chainSets);
  return {
    kind,
    closed: shape.closed,
    colorSet,
    baseRadius: variant === 'hero' ? random(12.5, 18.5) : random(9.8, 14.4),
    bondWidth: variant === 'hero' ? random(8.4, 13.2) : random(6.8, 10.8),
    points: shape.points.map((point, index) => ({
      ...point,
      ampX: random(0.2, 1.5),
      ampY: random(0.2, 1.4),
      phase: random(0, TAU),
      speed: random(0.00012, 0.00028),
      wobble: index % 2 === 0 ? 1 : 0.78
    })),
    branches: shape.branches.map((branch) => ({
      anchor: branch.anchor,
      points: branch.points.map((point) => ({
        ...point,
        ampX: random(0.1, 0.8),
        ampY: random(0.1, 0.8),
        phase: random(0, TAU),
        speed: random(0.00012, 0.00024)
      }))
    })),
    center: {
      x: random(-60, state.width + 60),
      y: random(-40, state.height + 40),
      vx: random(-0.025, 0.025) * (reduced ? 0.6 : 1),
      vy: random(-0.02, 0.02) * (reduced ? 0.6 : 1)
    },
    rotation: random(0, TAU),
    rotSpeed: random(-0.00006, 0.00006) * (reduced ? 0.5 : 1),
    scale: random(1.02, 1.32) * (variant === 'hero' ? 1.28 : 1.06),
    breathAmp: random(0.008, 0.028),
    breathSpeed: random(0.00008, 0.00016),
    swayAmp: random(4, 10),
    swaySpeed: random(0.00006, 0.00014),
    phase: random(0, TAU),
    depth: random(0.9, 1.12)
  };
}

function buildParticle(state, variant, reduced) {
  const colorSet = pick(state.palette.particleSets);
  return {
    x: random(0, state.width),
    y: random(0, state.height),
    vx: random(-0.035, 0.035) * (reduced ? 0.65 : 1),
    vy: random(-0.028, 0.028) * (reduced ? 0.65 : 1),
    size: (variant === 'hero' ? random(10, 16) : random(7.5, 12.5)) * (reduced ? 0.94 : 1),
    phase: random(0, TAU),
    drift: random(0.00006, 0.00014),
    bob: random(0.6, 2.0),
    depth: random(0.88, 1.15),
    colorSet
  };
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  const variant = options.variant || 'hero';
  const density = options.density ?? 1;
  const state = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    time: 0,
    running: true,
    palette: readPalette(),
    pointer: { x: 0, y: 0, active: false, down: false },
    chains: [],
    particles: [],
    rafId: 0
  };

  const profile = {
    hero: { chains: reduced ? 6 : 8, particles: reduced ? 10 : 14 },
    page: { chains: reduced ? 4 : 5, particles: reduced ? 8 : 10 }
  }[variant] || { chains: 8, particles: 16 };

  function seed() {
    const chainCount = Math.max(4, Math.round(profile.chains * density));
    const particleCount = Math.max(6, Math.round(profile.particles * density));
    state.chains = Array.from({ length: chainCount }, () => buildChain(state, variant, reduced));
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

  function pointFor(chain, point, index, time) {
    const breath = 1 + Math.sin(time * chain.breathSpeed + chain.phase) * chain.breathAmp;
    const wobbleX = Math.sin(time * point.speed + point.phase + index * 0.17) * point.ampX * point.wobble;
    const wobbleY = Math.cos(time * point.speed * 1.16 + point.phase + index * 0.12) * point.ampY * point.wobble;
    const local = rotate((point.x + wobbleX) * chain.scale * breath, (point.y + wobbleY) * chain.scale * breath, chain.rotation);
    const swayX = Math.sin(time * chain.swaySpeed + chain.phase) * chain.swayAmp;
    const swayY = Math.cos(time * chain.swaySpeed * 1.08 + chain.phase) * chain.swayAmp * 0.78;
    return {
      x: chain.center.x + local.x + swayX,
      y: chain.center.y + local.y + swayY
    };
  }

  function update(deltaMs) {
    state.time += deltaMs;
    const pointerRadius = state.pointer.down ? 200 : 150;

    state.chains.forEach((chain) => {
      chain.center.x = wrap(chain.center.x + chain.center.vx, state.width, 200);
      chain.center.y = wrap(chain.center.y + chain.center.vy, state.height, 200);
      chain.rotation += chain.rotSpeed * deltaMs;

      if (state.pointer.active) {
        const dx = chain.center.x - state.pointer.x;
        const dy = chain.center.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pointerRadius) {
          const force = (1 - dist / pointerRadius) * (state.pointer.down ? 0.0007 : 0.00026);
          chain.center.vx += (dx / (dist + 0.001)) * force * deltaMs;
          chain.center.vy += (dy / (dist + 0.001)) * force * deltaMs;
        }
      }

      chain.center.vx = clamp(chain.center.vx + Math.sin(state.time * 0.000025 + chain.phase) * 0.00016, -0.035, 0.035);
      chain.center.vy = clamp(chain.center.vy + Math.cos(state.time * 0.00003 + chain.phase) * 0.00014, -0.03, 0.03);
      chain.center.vx *= 0.997;
      chain.center.vy *= 0.997;
    });

    state.particles.forEach((particle) => {
      particle.x = wrap(particle.x + particle.vx + Math.sin(state.time * particle.drift + particle.phase) * 0.18 * particle.depth, state.width, 120);
      particle.y = wrap(particle.y + particle.vy + Math.cos(state.time * particle.drift * 1.1 + particle.phase) * 0.16 * particle.depth, state.height, 120);
      if (state.pointer.active) {
        const dx = particle.x - state.pointer.x;
        const dy = particle.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
          const push = (1 - dist / 100) * (state.pointer.down ? 0.5 : 0.12);
          particle.x = wrap(particle.x + (dx / (dist + 0.001)) * push, state.width, 120);
          particle.y = wrap(particle.y + (dy / (dist + 0.001)) * push, state.height, 120);
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

    const glowA = ctx.createRadialGradient(state.width * 0.16, state.height * 0.2, 0, state.width * 0.16, state.height * 0.2, Math.max(state.width, state.height) * 0.36);
    glowA.addColorStop(0, state.palette.glowA);
    glowA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowB = ctx.createRadialGradient(state.width * 0.8, state.height * 0.72, 0, state.width * 0.8, state.height * 0.72, Math.max(state.width, state.height) * 0.38);
    glowB.addColorStop(0, state.palette.glowB);
    glowB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    ctx.strokeStyle = state.palette.grid;
    ctx.lineWidth = 1;
    const grid = variant === 'hero' ? 96 : 110;
    const ox = -((state.time * 0.004) % grid);
    const oy = -((state.time * 0.0025) % grid);
    for (let x = ox; x < state.width + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.height);
      ctx.stroke();
    }
    for (let y = oy; y < state.height + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const radius = particle.size * particle.depth;
      const bob = Math.sin(state.time * particle.drift + particle.phase) * particle.bob;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = particle.colorSet.halo;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius * 1.9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = particle.colorSet.fill;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y + bob * 0.12, radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = particle.colorSet.core;
      ctx.beginPath();
      ctx.arc(particle.x - radius * 0.24, particle.y - radius * 0.24, radius * 0.32, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawChainPath(points, color, width, shadow) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (shadow) {
      ctx.strokeStyle = shadow;
      ctx.lineWidth = width + 3.4;
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

  function drawChains() {
    state.chains.forEach((chain) => {
      const points = chain.points.map((point, index) => pointFor(chain, point, index, state.time));
      const branches = chain.branches.map((branch) => ({
        anchor: points[branch.anchor],
        points: branch.points.map((point, index) => pointFor(chain, point, index + 1.4, state.time))
      }));
      const shadow = state.palette.shadow;

      drawChainPath(points, chain.colorSet.bond, chain.bondWidth * chain.depth, shadow);
      if (chain.closed && points.length > 2) {
        drawChainPath([points.at(-1), points[0]], chain.colorSet.bond, chain.bondWidth * chain.depth, shadow);
      }
      branches.forEach((branch) => {
        const branchPoints = [branch.anchor, ...branch.points];
        drawChainPath(branchPoints, chain.colorSet.bond, Math.max(3.4, chain.bondWidth * 0.74), shadow);
      });

      points.forEach((point, index) => {
        const radius = chain.baseRadius * chain.depth * (index === 0 || index === points.length - 1 ? 1.08 : 1);
        ctx.save();
        ctx.fillStyle = chain.colorSet.glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 1.7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = chain.colorSet.bead;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, TAU);
        ctx.fill();
        ctx.fillStyle = chain.colorSet.highlight;
        ctx.beginPath();
        ctx.arc(point.x - radius * 0.24, point.y - radius * 0.26, radius * 0.34, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      branches.forEach((branch) => {
        branch.points.forEach((point) => {
          const radius = Math.max(3.8, chain.baseRadius * 0.55);
          ctx.save();
          ctx.fillStyle = chain.colorSet.glow;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius * 1.5, 0, TAU);
          ctx.fill();
          ctx.fillStyle = chain.colorSet.bead;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, TAU);
          ctx.fill();
          ctx.fillStyle = chain.colorSet.highlight;
          ctx.beginPath();
          ctx.arc(point.x - radius * 0.2, point.y - radius * 0.2, radius * 0.3, 0, TAU);
          ctx.fill();
          ctx.restore();
        });
      });
    });

    if (state.pointer.active && !reduced) {
      const glow = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, 170);
      glow.addColorStop(0, state.palette.halo);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(state.pointer.x - 180, state.pointer.y - 180, 360, 360);
    }
  }

  let lastTime = performance.now();

  function frame(now) {
    if (!state.running) return;
    const deltaMs = Math.min(40, now - lastTime || 16.6);
    lastTime = now;
    update(deltaMs);
    drawBackground();
    drawParticles();
    drawChains();
    state.rafId = requestAnimationFrame(frame);
  }

  function refreshPalette() {
    state.palette = readPalette();
    state.chains.forEach((chain) => {
      chain.colorSet = pick(state.palette.chainSets);
    });
    state.particles.forEach((particle) => {
      particle.colorSet = pick(state.palette.particleSets);
    });
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.active = true;
  }

  function move(event) {
    setPointer(event);
  }

  function leave() {
    state.pointer.active = false;
    state.pointer.down = false;
  }

  function down(event) {
    setPointer(event);
    state.pointer.down = true;
  }

  function up() {
    state.pointer.down = false;
  }

  function touch(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) return;
    setPointer(touch);
    state.pointer.down = event.type === 'touchstart' || event.type === 'touchmove';
    if (event.type === 'touchend' || event.type === 'touchcancel') {
      state.pointer.active = false;
      state.pointer.down = false;
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('themechange', refreshPalette);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseleave', leave);
  canvas.addEventListener('mousedown', down);
  window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', touch, { passive: true });
  canvas.addEventListener('touchmove', touch, { passive: true });
  canvas.addEventListener('touchend', touch, { passive: true });
  canvas.addEventListener('touchcancel', touch, { passive: true });

  resize();
  state.rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      state.running = false;
      cancelAnimationFrame(state.rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('themechange', refreshPalette);
      window.removeEventListener('mouseup', up);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseleave', leave);
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('touchstart', touch);
      canvas.removeEventListener('touchmove', touch);
      canvas.removeEventListener('touchend', touch);
      canvas.removeEventListener('touchcancel', touch);
    }
  };
}
