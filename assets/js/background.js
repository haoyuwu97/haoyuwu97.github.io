import { prefersReducedMotion } from './utils.js';

const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function themeName() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function paletteForTheme() {
  const light = themeName() === 'light';
  return {
    backgroundA: light ? 'rgba(248, 251, 255, 0.98)' : 'rgba(4, 8, 18, 0.98)',
    backgroundB: light ? 'rgba(236, 244, 255, 0.99)' : 'rgba(7, 11, 22, 0.99)',
    hazeA: light ? 'rgba(71, 121, 255, 0.10)' : 'rgba(143, 243, 255, 0.09)',
    hazeB: light ? 'rgba(14, 184, 166, 0.08)' : 'rgba(167, 139, 250, 0.08)',
    grid: light ? 'rgba(44, 82, 156, 0.05)' : 'rgba(135, 164, 222, 0.05)',
    chainSets: light
      ? [
          { beads: ['#4f8bff', '#7cc4ff', '#d7ebff'], bond: 'rgba(79,139,255,0.34)', glow: 'rgba(79,139,255,0.12)' },
          { beads: ['#14b8a6', '#6ee7d7', '#d5fffb'], bond: 'rgba(20,184,166,0.34)', glow: 'rgba(20,184,166,0.11)' },
          { beads: ['#fb923c', '#fdba74', '#ffedd5'], bond: 'rgba(251,146,60,0.34)', glow: 'rgba(251,146,60,0.11)' },
          { beads: ['#a855f7', '#d8b4fe', '#f3e8ff'], bond: 'rgba(168,85,247,0.32)', glow: 'rgba(168,85,247,0.10)' },
          { beads: ['#f59e0b', '#fcd34d', '#fef3c7'], bond: 'rgba(245,158,11,0.32)', glow: 'rgba(245,158,11,0.10)' }
        ]
      : [
          { beads: ['#8ff3ff', '#5cbcff', '#e8fdff'], bond: 'rgba(143,243,255,0.40)', glow: 'rgba(143,243,255,0.14)' },
          { beads: ['#86efac', '#4ade80', '#e6ffe8'], bond: 'rgba(134,239,172,0.38)', glow: 'rgba(134,239,172,0.13)' },
          { beads: ['#fdba74', '#fb7185', '#ffe4e8'], bond: 'rgba(251,113,133,0.36)', glow: 'rgba(251,113,133,0.13)' },
          { beads: ['#c4b5fd', '#818cf8', '#ede9fe'], bond: 'rgba(196,181,253,0.36)', glow: 'rgba(196,181,253,0.13)' },
          { beads: ['#fcd34d', '#fde68a', '#fef9c3'], bond: 'rgba(252,211,77,0.35)', glow: 'rgba(252,211,77,0.12)' }
        ],
    particles: light
      ? [
          { fill: 'rgba(79,139,255,0.42)', halo: 'rgba(79,139,255,0.10)' },
          { fill: 'rgba(20,184,166,0.38)', halo: 'rgba(20,184,166,0.10)' },
          { fill: 'rgba(251,146,60,0.36)', halo: 'rgba(251,146,60,0.10)' }
        ]
      : [
          { fill: 'rgba(143,243,255,0.44)', halo: 'rgba(143,243,255,0.12)' },
          { fill: 'rgba(134,239,172,0.40)', halo: 'rgba(134,239,172,0.12)' },
          { fill: 'rgba(251,113,133,0.38)', halo: 'rgba(251,113,133,0.12)' }
        ]
  };
}

function normalize(x, y) {
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}

function recenter(points) {
  const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const cx = center.x / points.length;
  const cy = center.y / points.length;
  return points.map((point) => ({ x: point.x - cx, y: point.y - cy }));
}

function walkPoints(count, spacing, turn = 0.36, bias = 0) {
  const points = [{ x: 0, y: 0 }];
  let angle = random(-0.45, 0.45) + bias;
  let x = 0;
  let y = 0;
  for (let index = 1; index < count; index += 1) {
    angle += random(-turn, turn);
    x += Math.cos(angle) * spacing;
    y += Math.sin(angle) * spacing;
    points.push({ x, y });
  }
  return recenter(points);
}

function makeLinear(count, spacing) {
  return { points: walkPoints(count, spacing, 0.30, random(-0.12, 0.12)), paths: [Array.from({ length: count }, (_, i) => i)] };
}

function makeStretched(count, spacing) {
  return { points: walkPoints(count, spacing, 0.12, random(-0.08, 0.08)), paths: [Array.from({ length: count }, (_, i) => i)] };
}

function makeHairpin(count, spacing) {
  const headCount = Math.max(4, Math.floor(count * 0.55));
  const tailCount = count - headCount + 1;
  const head = walkPoints(headCount, spacing, 0.1, random(-0.14, 0.14));
  const tip = head[head.length - 1];
  const tail = [];
  let x = tip.x;
  let y = tip.y + spacing * 0.9;
  let angle = Math.PI + random(-0.18, 0.18);
  tail.push({ x, y });
  for (let index = 1; index < tailCount; index += 1) {
    angle += random(-0.18, 0.18);
    x += Math.cos(angle) * spacing;
    y += Math.sin(angle) * spacing;
    tail.push({ x, y });
  }
  const merged = recenter([...head, ...tail]);
  return { points: merged, paths: [Array.from({ length: merged.length }, (_, i) => i)] };
}

function makeFolded(count, spacing) {
  const base = walkPoints(count, spacing, 0.24, random(-0.1, 0.1));
  const points = base.map((point, index) => ({
    x: point.x * 0.86,
    y: point.y * 0.68 + Math.sin(index * 0.74) * spacing * 0.42
  }));
  return { points: recenter(points), paths: [Array.from({ length: points.length }, (_, i) => i)] };
}

function makeRing(count, spacing) {
  const radius = (count * spacing) / TAU;
  const rx = radius * random(0.9, 1.12);
  const ry = radius * random(0.72, 0.96);
  const phase = random(0, TAU);
  const points = Array.from({ length: count }, (_, index) => {
    const theta = phase + (index / count) * TAU;
    return {
      x: Math.cos(theta) * rx,
      y: Math.sin(theta) * ry
    };
  });
  return { points, paths: [Array.from({ length: count + 1 }, (_, i) => i % count)] };
}

function makeBrush(backboneCount, spacing) {
  const backbone = walkPoints(backboneCount, spacing, 0.16, random(-0.08, 0.08));
  const points = [...backbone];
  const paths = [Array.from({ length: backbone.length }, (_, i) => i)];
  for (let index = 1; index < backbone.length - 1; index += 2) {
    const prev = backbone[index - 1];
    const curr = backbone[index];
    const next = backbone[index + 1];
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const normal = { x: -tangent.y, y: tangent.x };
    const branchLength = Math.random() < 0.5 ? 2 : 3;
    for (const side of [-1, 1]) {
      const path = [index];
      let bx = curr.x;
      let by = curr.y;
      for (let bead = 0; bead < branchLength; bead += 1) {
        bx += normal.x * spacing * 0.9 * side;
        by += normal.y * spacing * 0.9 * side;
        points.push({ x: bx, y: by });
        path.push(points.length - 1);
      }
      paths.push(path);
    }
  }
  return { points: recenter(points), paths };
}

function buildChain(state, variant, palette) {
  const hero = variant === 'hero';
  const spacing = hero ? random(22, 30) : random(18, 24);
  const radius = hero ? random(9.5, 13.2) : random(7.2, 10.2);
  const kinds = ['linear', 'stretched', 'hairpin', 'folded', 'ring', 'brush'];
  const kind = choice(kinds);
  const count = Math.floor(random(kind === 'ring' ? 11 : 10, kind === 'brush' ? 15 : 17));

  let base;
  if (kind === 'linear') base = makeLinear(count, spacing);
  else if (kind === 'stretched') base = makeStretched(count, spacing);
  else if (kind === 'hairpin') base = makeHairpin(count, spacing);
  else if (kind === 'folded') base = makeFolded(count, spacing);
  else if (kind === 'ring') base = makeRing(count, spacing);
  else base = makeBrush(Math.max(7, count - 2), spacing * 0.95);

  const margin = hero ? 120 : 88;
  const anchor = {
    x: random(margin, Math.max(margin + 1, state.width - margin)),
    y: random(margin, Math.max(margin + 1, state.height - margin))
  };

  const beads = base.points.map((point, index) => ({
    x: anchor.x + point.x,
    y: anchor.y + point.y,
    vx: 0,
    vy: 0,
    r: radius * random(0.92, 1.08),
    phase: random(0, TAU),
    amp: random(hero ? 1.6 : 1.2, hero ? 4.8 : 3.4),
    color: palette.beads[index % palette.beads.length]
  }));

  return {
    kind,
    anchor,
    basePoints: base.points,
    paths: base.paths,
    beads,
    palette,
    drift: {
      ax: random(2.5, hero ? 8.5 : 5.5),
      ay: random(2.5, hero ? 7.5 : 5),
      fx: random(0.00012, 0.00022),
      fy: random(0.00010, 0.00018),
      phaseX: random(0, TAU),
      phaseY: random(0, TAU)
    },
    freqA: random(0.0012, 0.0021),
    freqB: random(0.0007, 0.0015),
    stiffness: kind === 'stretched' ? 0.16 : kind === 'ring' ? 0.18 : 0.14,
    drag: 0.84,
    depth: random(0.92, 1.08),
    bondWidth: radius * random(0.82, 1.0)
  };
}

function buildParticle(state, variant, palette) {
  const hero = variant === 'hero';
  return {
    x: random(0, state.width),
    y: random(0, state.height),
    vx: random(-0.08, 0.08),
    vy: random(-0.08, 0.08),
    r: random(hero ? 4.2 : 3.4, hero ? 8.8 : 6.4),
    wobble: random(0, TAU),
    wobbleFreq: random(0.001, 0.002),
    style: palette,
    alpha: random(0.6, 0.95)
  };
}

function makeState(canvas, variant, density) {
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const palette = paletteForTheme();
  const baseChains = variant === 'hero' ? 6 : 4;
  const chainCount = Math.max(3, Math.round(baseChains * density));
  const baseParticles = variant === 'hero' ? 18 : 12;
  const particleCount = Math.max(8, Math.round(baseParticles * density));

  return {
    canvas,
    ctx,
    ratio,
    width,
    height,
    variant,
    density,
    palette,
    chains: Array.from({ length: chainCount }, () => buildChain({ width, height }, variant, choice(palette.chainSets))),
    particles: Array.from({ length: particleCount }, () => buildParticle({ width, height }, variant, choice(palette.particles))),
    time: 0,
    raf: 0,
    reduceMotion: prefersReducedMotion()
  };
}

function resizeState(state) {
  const width = state.canvas.clientWidth || window.innerWidth;
  const height = state.canvas.clientHeight || window.innerHeight;
  state.width = width;
  state.height = height;
  state.canvas.width = Math.floor(width * state.ratio);
  state.canvas.height = Math.floor(height * state.ratio);
  state.ctx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
  state.palette = paletteForTheme();
  state.chains = state.chains.map(() => buildChain(state, state.variant, choice(state.palette.chainSets)));
  state.particles = state.particles.map(() => buildParticle(state, state.variant, choice(state.palette.particles)));
}

function drawBackdrop(ctx, state) {
  const { width, height, palette, time } = state;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.backgroundA);
  gradient.addColorStop(1, palette.backgroundB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.hazeA;
  ctx.beginPath();
  ctx.arc(width * 0.16 + Math.sin(time * 0.0001) * 18, height * 0.22, Math.max(width, height) * 0.28, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.hazeB;
  ctx.beginPath();
  ctx.arc(width * 0.82 + Math.cos(time * 0.00008) * 16, height * 0.76, Math.max(width, height) * 0.30, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  const grid = 52;
  const ox = -((time * 0.005) % grid);
  const oy = -((time * 0.002) % grid);
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

function updateParticles(state, step) {
  state.particles.forEach((particle) => {
    particle.wobble += particle.wobbleFreq * step * 16.6;
    particle.x += (particle.vx + Math.cos(particle.wobble) * 0.02) * step;
    particle.y += (particle.vy + Math.sin(particle.wobble * 1.3) * 0.02) * step;

    if (particle.x < -20) particle.x = state.width + 20;
    if (particle.x > state.width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = state.height + 20;
    if (particle.y > state.height + 20) particle.y = -20;
  });
}

function updateChains(state, step) {
  const time = state.time;
  state.chains.forEach((chain) => {
    const cx = chain.anchor.x + Math.sin(time * chain.drift.fx + chain.drift.phaseX) * chain.drift.ax;
    const cy = chain.anchor.y + Math.sin(time * chain.drift.fy + chain.drift.phaseY) * chain.drift.ay;

    chain.beads.forEach((bead, index) => {
      const base = chain.basePoints[index];
      const prev = chain.basePoints[Math.max(0, index - 1)];
      const next = chain.basePoints[Math.min(chain.basePoints.length - 1, index + 1)];
      const tangent = normalize(next.x - prev.x, next.y - prev.y);
      const normal = { x: -tangent.y, y: tangent.x };
      const lateral = Math.sin(time * chain.freqA + bead.phase + index * 0.42) * bead.amp;
      const axial = Math.cos(time * chain.freqB + bead.phase * 0.7 + index * 0.24) * bead.amp * 0.18;
      const tx = cx + base.x + normal.x * lateral + tangent.x * axial;
      const ty = cy + base.y + normal.y * lateral + tangent.y * axial;

      bead.vx = bead.vx * chain.drag + (tx - bead.x) * chain.stiffness;
      bead.vy = bead.vy * chain.drag + (ty - bead.y) * chain.stiffness;
      bead.x += bead.vx * step;
      bead.y += bead.vy * step;
    });
  });
}

function drawChain(ctx, chain) {
  chain.paths.forEach((path) => {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = chain.palette.glow;
    ctx.lineWidth = chain.bondWidth * 1.85;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((index, pointIndex) => {
      const bead = chain.beads[index];
      if (pointIndex === 0) ctx.moveTo(bead.x, bead.y);
      else ctx.lineTo(bead.x, bead.y);
    });
    ctx.stroke();

    ctx.strokeStyle = chain.palette.bond;
    ctx.lineWidth = chain.bondWidth;
    ctx.beginPath();
    path.forEach((index, pointIndex) => {
      const bead = chain.beads[index];
      if (pointIndex === 0) ctx.moveTo(bead.x, bead.y);
      else ctx.lineTo(bead.x, bead.y);
    });
    ctx.stroke();
    ctx.restore();
  });

  chain.beads.forEach((bead) => {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(bead.x, bead.y, bead.r * 1.7, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(bead.x, bead.y, bead.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(bead.x - bead.r * 0.2, bead.y - bead.r * 0.22, Math.max(1.6, bead.r * 0.33), 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function drawParticles(ctx, state) {
  state.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = particle.alpha * 0.22;
    ctx.fillStyle = particle.style.halo;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r * 1.9, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.style.fill;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(particle.x - particle.r * 0.18, particle.y - particle.r * 0.18, Math.max(1.4, particle.r * 0.28), 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function render(state) {
  const { ctx } = state;
  drawBackdrop(ctx, state);
  state.chains.forEach((chain) => drawChain(ctx, chain));
  drawParticles(ctx, state);
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;
  const variant = options.variant || 'hero';
  const density = Math.max(0.35, Math.min(1.2, Number(options.density) || 0.8));
  const state = makeState(canvas, variant, density);

  const renderOnce = () => {
    state.palette = paletteForTheme();
    state.chains.forEach((chain, index) => {
      chain.palette = state.palette.chainSets[index % state.palette.chainSets.length];
    });
    state.particles.forEach((particle, index) => {
      particle.style = state.palette.particles[index % state.palette.particles.length];
    });
    render(state);
  };

  const onResize = () => resizeState(state);
  window.addEventListener('resize', onResize);

  const observer = new MutationObserver(() => {
    state.palette = paletteForTheme();
    state.chains.forEach((chain, index) => {
      chain.palette = state.palette.chainSets[index % state.palette.chainSets.length];
    });
    state.particles.forEach((particle, index) => {
      particle.style = state.palette.particles[index % state.palette.particles.length];
    });
    render(state);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] });

  if (state.reduceMotion) {
    renderOnce();
    return {
      destroy() {
        window.removeEventListener('resize', onResize);
        observer.disconnect();
      }
    };
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(32, now - last || 16.6);
    last = now;
    state.time = now;
    const step = dt / 16.666;
    updateChains(state, step);
    updateParticles(state, step);
    render(state);
    state.raf = requestAnimationFrame(frame);
  }
  state.raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  };
}
