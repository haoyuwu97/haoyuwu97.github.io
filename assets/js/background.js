import { clamp, prefersReducedMotion } from './utils.js';

const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function themeName() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function readPalette() {
  const light = themeName() === 'light';
  return {
    backdropStart: light ? 'rgba(248, 251, 255, 0.98)' : 'rgba(4, 8, 18, 0.98)',
    backdropEnd: light ? 'rgba(236, 244, 255, 0.99)' : 'rgba(7, 11, 22, 0.99)',
    glowA: light ? 'rgba(56, 127, 255, 0.11)' : 'rgba(111, 231, 255, 0.09)',
    glowB: light ? 'rgba(0, 190, 165, 0.08)' : 'rgba(177, 120, 255, 0.08)',
    grid: light ? 'rgba(54, 94, 164, 0.055)' : 'rgba(142, 176, 242, 0.05)',
    halo: light ? 'rgba(52, 120, 255, 0.11)' : 'rgba(143, 243, 255, 0.12)',
    shadow: light ? 'rgba(22, 42, 78, 0.18)' : 'rgba(0, 0, 0, 0.34)',
    chainSets: light
      ? [
          {
            beads: ['#4f8bff', '#7cc4ff', '#b4e1ff'],
            bond: 'rgba(79,139,255,0.42)',
            glow: 'rgba(79,139,255,0.13)',
            highlight: 'rgba(255,255,255,0.94)'
          },
          {
            beads: ['#19c2a8', '#7be2c4', '#d8fff4'],
            bond: 'rgba(25,194,168,0.42)',
            glow: 'rgba(25,194,168,0.13)',
            highlight: 'rgba(255,255,255,0.94)'
          },
          {
            beads: ['#ff8d6d', '#ffc091', '#ffe2cb'],
            bond: 'rgba(255,141,109,0.42)',
            glow: 'rgba(255,141,109,0.13)',
            highlight: 'rgba(255,255,255,0.94)'
          },
          {
            beads: ['#c280ff', '#dfb3ff', '#f2ddff'],
            bond: 'rgba(194,128,255,0.42)',
            glow: 'rgba(194,128,255,0.13)',
            highlight: 'rgba(255,255,255,0.94)'
          },
          {
            beads: ['#f1b941', '#ffd870', '#fff0c1'],
            bond: 'rgba(241,185,65,0.42)',
            glow: 'rgba(241,185,65,0.13)',
            highlight: 'rgba(255,255,255,0.94)'
          }
        ]
      : [
          {
            beads: ['#89e4ff', '#57baff', '#d9fcff'],
            bond: 'rgba(137,228,255,0.48)',
            glow: 'rgba(137,228,255,0.16)',
            highlight: 'rgba(255,255,255,0.96)'
          },
          {
            beads: ['#86f5aa', '#43df8a', '#d9ffdf'],
            bond: 'rgba(134,245,170,0.45)',
            glow: 'rgba(134,245,170,0.16)',
            highlight: 'rgba(255,255,255,0.96)'
          },
          {
            beads: ['#ff8d80', '#ffb18d', '#ffe1db'],
            bond: 'rgba(255,141,128,0.45)',
            glow: 'rgba(255,141,128,0.15)',
            highlight: 'rgba(255,255,255,0.96)'
          },
          {
            beads: ['#c3a2ff', '#9fa4ff', '#ece3ff'],
            bond: 'rgba(195,162,255,0.44)',
            glow: 'rgba(195,162,255,0.15)',
            highlight: 'rgba(255,255,255,0.96)'
          },
          {
            beads: ['#ffd166', '#ffef9c', '#fff6d8'],
            bond: 'rgba(255,209,102,0.44)',
            glow: 'rgba(255,209,102,0.15)',
            highlight: 'rgba(255,255,255,0.96)'
          }
        ],
    particleSets: light
      ? [
          { fill: 'rgba(79,139,255,0.46)', core: 'rgba(255,255,255,0.96)', halo: 'rgba(79,139,255,0.10)' },
          { fill: 'rgba(25,194,168,0.42)', core: 'rgba(255,255,255,0.94)', halo: 'rgba(25,194,168,0.10)' },
          { fill: 'rgba(255,141,109,0.42)', core: 'rgba(255,255,255,0.94)', halo: 'rgba(255,141,109,0.10)' }
        ]
      : [
          { fill: 'rgba(137,228,255,0.50)', core: 'rgba(255,255,255,0.96)', halo: 'rgba(137,228,255,0.12)' },
          { fill: 'rgba(134,245,170,0.45)', core: 'rgba(255,255,255,0.94)', halo: 'rgba(134,245,170,0.12)' },
          { fill: 'rgba(255,141,128,0.46)', core: 'rgba(255,255,255,0.95)', halo: 'rgba(255,141,128,0.12)' }
        ]
  };
}

function makeWalk(centerX, centerY, count, spacing, turn = 0.42, bias = null) {
  const points = [];
  let angle = random(0, TAU);
  let x = centerX;
  let y = centerY;
  points.push({ x, y });
  for (let index = 1; index < count; index += 1) {
    const targetAngle = bias == null ? angle : angle * 0.65 + bias * 0.35;
    angle = targetAngle + random(-turn, turn);
    x += Math.cos(angle) * spacing;
    y += Math.sin(angle) * spacing;
    points.push({ x, y });
  }
  return points;
}

function centerOf(points) {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function translate(points, dx, dy) {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

function normalize(x, y) {
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}

function wrapChain(chain, width, height, margin = 180) {
  const com = centerOf(chain.beads);
  let dx = 0;
  let dy = 0;
  if (com.x < -margin) dx = width + margin * 2;
  if (com.x > width + margin) dx = -(width + margin * 2);
  if (com.y < -margin) dy = height + margin * 2;
  if (com.y > height + margin) dy = -(height + margin * 2);
  if (!dx && !dy) return;
  chain.beads.forEach((bead) => {
    bead.x += dx;
    bead.y += dy;
  });
  chain.target.x += dx;
  chain.target.y += dy;
  if (chain.anchor) {
    chain.anchor.x += dx;
    chain.anchor.y += dy;
  }
}

function bead(index, point, radius, colors) {
  return {
    x: point.x,
    y: point.y,
    ox: point.x,
    oy: point.y,
    vx: random(-0.14, 0.14),
    vy: random(-0.14, 0.14),
    r: radius * random(0.92, 1.08),
    color: colors[index % colors.length],
    pinned: false
  };
}

function buildLinearChain(state, variant, palette, kind = 'coil') {
  const spacing = variant === 'hero' ? random(24, 30) : random(20, 26);
  const radius = variant === 'hero' ? random(10.5, 15.5) : random(8.5, 12.5);
  const count = Math.floor(random(kind === 'stretched' ? 12 : 10, kind === 'stretched' ? 18 : 16));
  const centerX = random(state.width * 0.08, state.width * 0.92);
  const centerY = random(state.height * 0.10, state.height * 0.90);
  const bias = kind === 'stretched' ? random(-0.25, 0.25) : null;
  let points = makeWalk(centerX, centerY, count, spacing, kind === 'coil' ? 0.52 : 0.24, bias);
  if (kind === 'hairpin') {
    const split = Math.floor(count * 0.56);
    const head = makeWalk(centerX - spacing * 2.4, centerY, split, spacing, 0.2, random(-0.2, 0.2));
    const tailStart = head.at(-1);
    const tail = [];
    let angle = random(Math.PI * 0.75, Math.PI * 1.25);
    let x = tailStart.x;
    let y = tailStart.y + spacing * random(0.8, 1.4);
    for (let index = 0; index < count - split; index += 1) {
      angle += random(-0.18, 0.18);
      x += Math.cos(angle) * spacing * 0.95;
      y += Math.sin(angle) * spacing * 0.95;
      tail.push({ x, y });
    }
    points = [...head, ...tail];
  } else if (kind === 'folded') {
    const walk = makeWalk(centerX, centerY, count, spacing, 0.34);
    const com = centerOf(walk);
    points = walk.map((point, index) => ({
      x: com.x + (point.x - com.x) * 0.88,
      y: com.y + (point.y - com.y) * 0.68 + Math.sin(index * 0.78) * spacing * 0.18
    }));
  }
  const beads = points.map((point, index) => bead(index, point, radius, palette.beads));
  const bonds = [];
  for (let index = 0; index < beads.length - 1; index += 1) {
    bonds.push({ a: index, b: index + 1, rest: spacing });
  }
  return {
    kind,
    closed: false,
    beads,
    paths: [beads.map((_, index) => index)],
    bonds,
    target: {
      x: centerX,
      y: centerY,
      vx: random(-0.11, 0.11),
      vy: random(-0.10, 0.10)
    },
    anchor: null,
    palette,
    thermal: variant === 'hero' ? 0.055 : 0.045,
    drag: 0.976,
    bend: kind === 'stretched' ? 0.19 : 0.12,
    homePull: 0.009,
    depth: random(0.92, 1.08),
    branchScale: 0.78,
    bondWidth: radius * random(0.9, 1.12),
    maxSpeed: variant === 'hero' ? 3.2 : 2.8
  };
}

function buildRingChain(state, variant, palette) {
  const radius = variant === 'hero' ? random(9.5, 13.5) : random(8, 11.5);
  const count = Math.floor(random(12, 18));
  const rx = random(88, 150);
  const ry = rx * random(0.62, 0.88);
  const centerX = random(state.width * 0.12, state.width * 0.88);
  const centerY = random(state.height * 0.16, state.height * 0.84);
  const phase = random(0, TAU);
  const points = Array.from({ length: count }, (_, index) => {
    const theta = phase + (index / count) * TAU;
    const ripple = 1 + Math.sin(index * 1.6 + phase) * 0.08;
    return {
      x: centerX + Math.cos(theta) * rx * ripple,
      y: centerY + Math.sin(theta) * ry * ripple
    };
  });
  const beads = points.map((point, index) => bead(index, point, radius, palette.beads));
  const bonds = [];
  for (let index = 0; index < beads.length; index += 1) {
    bonds.push({ a: index, b: (index + 1) % beads.length, rest: ((rx + ry) / 2) * TAU / count * 0.94 });
  }
  return {
    kind: 'ring',
    closed: true,
    beads,
    paths: [beads.map((_, index) => index)],
    bonds,
    target: { x: centerX, y: centerY, vx: random(-0.09, 0.09), vy: random(-0.08, 0.08) },
    anchor: null,
    palette,
    thermal: variant === 'hero' ? 0.048 : 0.042,
    drag: 0.978,
    bend: 0.22,
    homePull: 0.01,
    depth: random(0.92, 1.05),
    branchScale: 0.75,
    bondWidth: radius * random(0.84, 1.0),
    maxSpeed: variant === 'hero' ? 3.0 : 2.5
  };
}

function buildBrushChain(state, variant, palette) {
  const backboneCount = Math.floor(random(8, 12));
  const spacing = variant === 'hero' ? random(23, 28) : random(18, 23);
  const radius = variant === 'hero' ? random(9.5, 12.5) : random(7.5, 10.5);
  const anchorX = random(state.width * 0.08, state.width * 0.9);
  const anchorY = random(state.height * 0.18, state.height * 0.82);
  const backbone = Array.from({ length: backboneCount }, (_, index) => ({
    x: anchorX + (index - (backboneCount - 1) * 0.5) * spacing,
    y: anchorY + Math.sin(index * 0.78) * spacing * 0.22
  }));

  const points = [...backbone];
  const paths = [backbone.map((_, index) => index)];
  const bonds = [];
  for (let index = 0; index < backboneCount - 1; index += 1) {
    bonds.push({ a: index, b: index + 1, rest: spacing });
  }

  for (let index = 1; index < backboneCount - 1; index += 2) {
    const branchLength = 2 + Math.floor(random(1, 3));
    const sign = index % 4 === 1 ? -1 : 1;
    const branchIndices = [index];
    let prev = index;
    for (let step = 0; step < branchLength; step += 1) {
      const point = {
        x: backbone[index].x + Math.sin(step * 0.4) * spacing * 0.1,
        y: backbone[index].y + sign * spacing * (step + 1) * 0.82
      };
      points.push(point);
      const current = points.length - 1;
      bonds.push({ a: prev, b: current, rest: spacing * 0.82 });
      branchIndices.push(current);
      prev = current;
    }
    paths.push(branchIndices);
  }

  const beads = points.map((point, index) => bead(index, point, radius * (index < backboneCount ? 1 : 0.78), palette.beads));
  const anchor = { x: anchorX, y: anchorY, vx: random(-0.06, 0.06), vy: random(-0.04, 0.04) };
  beads[0].pinned = true;

  return {
    kind: 'brush',
    closed: false,
    beads,
    paths,
    bonds,
    target: { x: anchorX, y: anchorY, vx: random(-0.08, 0.08), vy: random(-0.06, 0.06) },
    anchor,
    palette,
    thermal: variant === 'hero' ? 0.044 : 0.038,
    drag: 0.975,
    bend: 0.16,
    homePull: 0.009,
    depth: random(0.92, 1.04),
    branchScale: 0.72,
    bondWidth: radius * random(0.82, 1.0),
    maxSpeed: variant === 'hero' ? 2.6 : 2.2
  };
}

function buildChain(state, variant, reduced) {
  const palette = pick(state.palette.chainSets);
  const kind = pick(['coil', 'coil', 'folded', 'stretched', 'ring', 'hairpin', 'brush']);
  let chain;
  if (kind === 'ring') chain = buildRingChain(state, variant, palette);
  else if (kind === 'brush') chain = buildBrushChain(state, variant, palette);
  else chain = buildLinearChain(state, variant, palette, kind);
  if (reduced) {
    chain.thermal *= 0.7;
    chain.target.vx *= 0.6;
    chain.target.vy *= 0.6;
    chain.maxSpeed *= 0.8;
  }
  return chain;
}

function buildParticle(state, variant, reduced) {
  const colorSet = pick(state.palette.particleSets);
  return {
    x: random(0, state.width),
    y: random(0, state.height),
    vx: random(-0.18, 0.18) * (reduced ? 0.7 : 1),
    vy: random(-0.16, 0.16) * (reduced ? 0.7 : 1),
    size: (variant === 'hero' ? random(5.5, 9.5) : random(4.5, 7.5)) * (reduced ? 0.95 : 1),
    bob: random(0.2, 0.8),
    phase: random(0, TAU),
    drift: random(0.0004, 0.0012),
    depth: random(0.9, 1.12),
    colorSet
  };
}

function bondNeighbors(chain) {
  const map = new Map();
  chain.bonds.forEach((bond) => {
    const keyA = `${Math.min(bond.a, bond.b)}:${Math.max(bond.a, bond.b)}`;
    map.set(keyA, true);
  });
  return map;
}

function updateTarget(target, width, height, step, reduced) {
  target.vx = clamp(target.vx + random(-0.012, 0.012) * step, -0.22, 0.22);
  target.vy = clamp(target.vy + random(-0.010, 0.010) * step, -0.18, 0.18);
  const margin = 140;
  if (target.x < margin) target.vx += 0.02 * step;
  if (target.x > width - margin) target.vx -= 0.02 * step;
  if (target.y < margin) target.vy += 0.018 * step;
  if (target.y > height - margin) target.vy -= 0.018 * step;
  target.vx *= reduced ? 0.985 : 0.992;
  target.vy *= reduced ? 0.985 : 0.992;
  target.x += target.vx * step * 6;
  target.y += target.vy * step * 6;
}

function updateAnchor(anchor, width, height, step, reduced) {
  if (!anchor) return;
  anchor.vx = clamp(anchor.vx + random(-0.006, 0.006) * step, -0.12, 0.12);
  anchor.vy = clamp(anchor.vy + random(-0.004, 0.004) * step, -0.08, 0.08);
  const margin = 120;
  if (anchor.x < margin) anchor.vx += 0.016 * step;
  if (anchor.x > width - margin) anchor.vx -= 0.016 * step;
  if (anchor.y < margin) anchor.vy += 0.014 * step;
  if (anchor.y > height - margin) anchor.vy -= 0.014 * step;
  anchor.vx *= reduced ? 0.986 : 0.993;
  anchor.vy *= reduced ? 0.986 : 0.993;
  anchor.x += anchor.vx * step * 5.5;
  anchor.y += anchor.vy * step * 5.5;
}

function applyPointerField(chain, pointer, step, reduced) {
  if (!pointer.active) return;
  const radius = pointer.down ? 150 : 110;
  const strength = pointer.down ? (reduced ? 0.34 : 0.46) : (reduced ? 0.16 : 0.24);
  chain.beads.forEach((bead) => {
    if (bead.pinned) return;
    const dx = bead.x - pointer.x;
    const dy = bead.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius || dist < 0.001) return;
    const factor = (1 - dist / radius) * strength * step;
    bead.x += (dx / dist) * factor * 4.5;
    bead.y += (dy / dist) * factor * 4.5;
  });
}

function updateChain(chain, state, deltaMs, reduced) {
  const step = Math.min(2.2, deltaMs / 16.6667);
  const substeps = reduced ? 1 : 2;
  const neighbors = chain.neighbors || bondNeighbors(chain);
  chain.neighbors = neighbors;

  for (let substep = 0; substep < substeps; substep += 1) {
    updateTarget(chain.target, state.width, state.height, step / substeps, reduced);
    updateAnchor(chain.anchor, state.width, state.height, step / substeps, reduced);

    const com = centerOf(chain.beads);
    const pullX = (chain.target.x - com.x) * chain.homePull * (step / substeps);
    const pullY = (chain.target.y - com.y) * chain.homePull * (step / substeps);

    chain.beads.forEach((bead) => {
      bead.ox = bead.x;
      bead.oy = bead.y;
      if (bead.pinned && chain.anchor) {
        bead.x += (chain.anchor.x - bead.x) * 0.26 * (step / substeps);
        bead.y += (chain.anchor.y - bead.y) * 0.26 * (step / substeps);
        bead.vx = 0;
        bead.vy = 0;
        return;
      }
      bead.vx = clamp((bead.vx + pullX + random(-chain.thermal, chain.thermal) * (step / substeps)) * chain.drag, -chain.maxSpeed, chain.maxSpeed);
      bead.vy = clamp((bead.vy + pullY + random(-chain.thermal, chain.thermal) * (step / substeps)) * chain.drag, -chain.maxSpeed, chain.maxSpeed);
      bead.x += bead.vx * (step / substeps) * 2.8;
      bead.y += bead.vy * (step / substeps) * 2.8;
    });

    applyPointerField(chain, state.pointer, step / substeps, reduced);

    const iterations = reduced ? 2 : 3;
    for (let iter = 0; iter < iterations; iter += 1) {
      chain.bonds.forEach((bond) => {
        const a = chain.beads[bond.a];
        const b = chain.beads[bond.b];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - bond.rest) / dist;
        const push = diff * 0.5;
        dx *= push;
        dy *= push;
        if (!a.pinned) {
          a.x += dx;
          a.y += dy;
        }
        if (!b.pinned) {
          b.x -= dx;
          b.y -= dy;
        }
      });

      chain.paths.forEach((path) => {
        if (path.length < 3) return;
        for (let index = 1; index < path.length - 1; index += 1) {
          const prev = chain.beads[path[index - 1]];
          const mid = chain.beads[path[index]];
          const next = chain.beads[path[index + 1]];
          if (mid.pinned) continue;
          const targetX = (prev.x + next.x) * 0.5;
          const targetY = (prev.y + next.y) * 0.5;
          mid.x += (targetX - mid.x) * chain.bend;
          mid.y += (targetY - mid.y) * chain.bend;
        }
      });

      if (chain.closed && chain.paths[0].length > 3) {
        const path = chain.paths[0];
        const first = chain.beads[path[0]];
        const second = chain.beads[path[1]];
        const last = chain.beads[path.at(-1)];
        const beforeLast = chain.beads[path.at(-2)];
        if (!first.pinned) {
          first.x += ((second.x + last.x) * 0.5 - first.x) * chain.bend * 0.82;
          first.y += ((second.y + last.y) * 0.5 - first.y) * chain.bend * 0.82;
        }
        if (!last.pinned) {
          last.x += ((beforeLast.x + first.x) * 0.5 - last.x) * chain.bend * 0.82;
          last.y += ((beforeLast.y + first.y) * 0.5 - last.y) * chain.bend * 0.82;
        }
      }

      for (let i = 0; i < chain.beads.length; i += 1) {
        for (let j = i + 1; j < chain.beads.length; j += 1) {
          if (neighbors.has(`${i}:${j}`)) continue;
          const a = chain.beads[i];
          const b = chain.beads[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const minDist = (a.r + b.r) * 0.86;
          if (dist >= minDist) continue;
          const push = (minDist - dist) / dist * 0.36;
          dx *= push;
          dy *= push;
          if (!a.pinned) {
            a.x -= dx;
            a.y -= dy;
          }
          if (!b.pinned) {
            b.x += dx;
            b.y += dy;
          }
        }
      }
    }

    chain.beads.forEach((bead) => {
      if (bead.pinned && chain.anchor) {
        bead.x = chain.anchor.x;
        bead.y = chain.anchor.y;
        bead.vx = 0;
        bead.vy = 0;
        return;
      }
      bead.vx = clamp((bead.x - bead.ox) / Math.max(0.5, step) * 0.88, -chain.maxSpeed, chain.maxSpeed);
      bead.vy = clamp((bead.y - bead.oy) / Math.max(0.5, step) * 0.88, -chain.maxSpeed, chain.maxSpeed);
    });
  }

  wrapChain(chain, state.width, state.height, variantMargin(state.variant));
}

function variantMargin(variant) {
  return variant === 'hero' ? 220 : 180;
}

function updateParticle(particle, state, deltaMs, reduced) {
  const step = Math.min(2.2, deltaMs / 16.6667);
  particle.vx = clamp((particle.vx + random(-0.01, 0.01) * step) * 0.995, -0.26, 0.26);
  particle.vy = clamp((particle.vy + random(-0.01, 0.01) * step) * 0.995, -0.22, 0.22);
  particle.x += particle.vx * step * 4.6 + Math.cos(state.time * particle.drift + particle.phase) * particle.bob * 0.35;
  particle.y += particle.vy * step * 4.6 + Math.sin(state.time * particle.drift * 1.08 + particle.phase) * particle.bob * 0.32;
  const margin = 100;
  if (particle.x < -margin) particle.x = state.width + margin;
  if (particle.x > state.width + margin) particle.x = -margin;
  if (particle.y < -margin) particle.y = state.height + margin;
  if (particle.y > state.height + margin) particle.y = -margin;

  if (state.pointer.active) {
    const dx = particle.x - state.pointer.x;
    const dy = particle.y - state.pointer.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 86 && dist > 0.001) {
      const push = (1 - dist / 86) * (state.pointer.down ? (reduced ? 0.5 : 0.9) : 0.32);
      particle.x += (dx / dist) * push * 6;
      particle.y += (dy / dist) * push * 6;
    }
  }
}

function drawBackdrop(ctx, state) {
  ctx.clearRect(0, 0, state.width, state.height);
  const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
  gradient.addColorStop(0, state.palette.backdropStart);
  gradient.addColorStop(1, state.palette.backdropEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const glowA = ctx.createRadialGradient(state.width * 0.18, state.height * 0.2, 0, state.width * 0.18, state.height * 0.2, Math.max(state.width, state.height) * 0.36);
  glowA.addColorStop(0, state.palette.glowA);
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, state.width, state.height);

  const glowB = ctx.createRadialGradient(state.width * 0.82, state.height * 0.74, 0, state.width * 0.82, state.height * 0.74, Math.max(state.width, state.height) * 0.4);
  glowB.addColorStop(0, state.palette.glowB);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.strokeStyle = state.palette.grid;
  ctx.lineWidth = 1;
  const grid = state.variant === 'hero' ? 102 : 112;
  const ox = -((state.time * 0.012) % grid);
  const oy = -((state.time * 0.008) % grid);
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

function drawParticles(ctx, state) {
  state.particles.forEach((particle) => {
    const radius = particle.size * particle.depth;
    ctx.save();
    ctx.fillStyle = particle.colorSet.halo;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * 1.95, 0, TAU);
    ctx.fill();
    ctx.fillStyle = particle.colorSet.fill;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = particle.colorSet.core;
    ctx.beginPath();
    ctx.arc(particle.x - radius * 0.24, particle.y - radius * 0.22, radius * 0.32, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function drawBond(ctx, a, b, color, width, shadow) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.strokeStyle = shadow;
    ctx.lineWidth = width + 3.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawBead(ctx, bead, palette, scale = 1) {
  const r = bead.r * scale;
  ctx.save();
  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.arc(bead.x, bead.y, r * 1.72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = bead.color;
  ctx.beginPath();
  ctx.arc(bead.x, bead.y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.highlight;
  ctx.beginPath();
  ctx.arc(bead.x - r * 0.25, bead.y - r * 0.27, r * 0.34, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawChains(ctx, state) {
  state.chains.forEach((chain) => {
    const width = chain.bondWidth * chain.depth;
    chain.bonds.forEach((bond, index) => {
      const a = chain.beads[bond.a];
      const b = chain.beads[bond.b];
      drawBond(ctx, a, b, chain.palette.bond, width * (index % 5 === 0 ? 1.02 : 1), state.palette.shadow);
    });

    chain.beads.forEach((bead, index) => {
      const pathHead = chain.paths.some((path) => path[0] === index || path.at(-1) === index);
      const scale = pathHead ? 1.05 : 1;
      drawBead(ctx, bead, chain.palette, scale * (index === 0 && chain.kind !== 'ring' ? 1.06 : 1));
    });
  });

  if (state.pointer.active && !state.reduced) {
    const glow = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, 170);
    glow.addColorStop(0, state.palette.halo);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(state.pointer.x - 180, state.pointer.y - 180, 360, 360);
  }
}

export function initMolecularField(canvas, options = {}) {
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  const variant = options.variant || 'hero';
  const density = options.density ?? 1;
  const state = {
    variant,
    reduced,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    width: 0,
    height: 0,
    time: 0,
    palette: readPalette(),
    pointer: { x: 0, y: 0, active: false, down: false },
    chains: [],
    particles: [],
    running: true,
    rafId: 0
  };

  const profile = {
    hero: { chains: reduced ? 5 : 6, particles: reduced ? 10 : 12 },
    page: { chains: reduced ? 3 : 4, particles: reduced ? 7 : 8 }
  }[variant] || { chains: 6, particles: 10 };

  function seed() {
    const chainCount = Math.max(3, Math.round(profile.chains * density));
    const particleCount = Math.max(5, Math.round(profile.particles * density));
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

  let lastTime = performance.now();

  function frame(now) {
    if (!state.running) return;
    const deltaMs = Math.min(42, now - lastTime || 16.67);
    lastTime = now;
    state.time += deltaMs;

    state.chains.forEach((chain) => updateChain(chain, state, deltaMs, reduced));
    state.particles.forEach((particle) => updateParticle(particle, state, deltaMs, reduced));

    drawBackdrop(ctx, state);
    drawParticles(ctx, state);
    drawChains(ctx, state);
    state.rafId = requestAnimationFrame(frame);
  }

  function refreshPalette() {
    state.palette = readPalette();
    state.chains.forEach((chain) => {
      const palette = pick(state.palette.chainSets);
      chain.palette = palette;
      chain.beads.forEach((bead, index) => {
        bead.color = palette.beads[index % palette.beads.length];
      });
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
    const point = event.touches?.[0] || event.changedTouches?.[0];
    if (!point) return;
    setPointer(point);
    state.pointer.down = event.type !== 'touchend' && event.type !== 'touchcancel';
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
