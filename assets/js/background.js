import { clamp, prefersReducedMotion } from './utils.js';

function random(min, max) {
  return min + Math.random() * (max - min);
}

function wrap(value, max) {
  if (value < 0) return value + max;
  if (value > max) return value - max;
  return value;
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
    pulses: [],
    rafId: null,
    time: 0,
    running: true
  };

  const profile = {
    hero: { chains: reduced ? 8 : 18, particles: reduced ? 28 : 58, lineAlpha: 0.15, nodeAlpha: 0.55, pulseAlpha: 0.14 },
    page: { chains: reduced ? 5 : 10, particles: reduced ? 20 : 34, lineAlpha: 0.12, nodeAlpha: 0.45, pulseAlpha: 0.1 }
  }[variant] || { chains: 10, particles: 30, lineAlpha: 0.12, nodeAlpha: 0.45, pulseAlpha: 0.1 };

  function buildChain() {
    const length = Math.floor(random(5, variant === 'hero' ? 10 : 8));
    const spacing = random(22, 42);
    const angle = random(0, Math.PI * 2);
    const wiggle = random(0.35, 0.95);
    const center = {
      x: random(0, state.width),
      y: random(0, state.height),
      vx: random(-0.15, 0.15),
      vy: random(-0.1, 0.1),
      phase: random(0, Math.PI * 2),
      speed: random(0.00055, 0.0015),
      amplitude: random(8, 20)
    };
    const offsets = [];
    for (let i = 0; i < length; i += 1) {
      const t = i - (length - 1) / 2;
      const localAngle = angle + Math.sin(i * 0.65 + center.phase) * 0.1;
      offsets.push({
        x: Math.cos(localAngle) * t * spacing,
        y: Math.sin(localAngle) * t * spacing,
        z: random(0.85, 1.15)
      });
    }
    const nodes = offsets.map((offset) => ({ x: center.x + offset.x, y: center.y + offset.y, vx: 0, vy: 0 }));
    return { center, offsets, nodes, wiggle, hueShift: random(0, 1) };
  }

  function buildParticle() {
    return {
      x: random(0, state.width),
      y: random(0, state.height),
      vx: random(-0.2, 0.2),
      vy: random(-0.15, 0.15),
      size: random(1.2, 2.7),
      alpha: random(0.16, 0.48),
      drift: random(0.0004, 0.0014),
      phase: random(0, Math.PI * 2)
    };
  }

  function pulse(x, y) {
    state.pulses.push({ x, y, r: 8, alpha: 0.8 });
    if (state.pulses.length > 8) state.pulses.shift();
  }

  function seed() {
    state.chains = Array.from({ length: Math.max(4, Math.round(profile.chains * density)) }, buildChain);
    state.particles = Array.from({ length: Math.max(14, Math.round(profile.particles * density)) }, buildParticle);
    state.pulses = [];
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

  function update(deltaMs) {
    state.time += deltaMs;
    const pointerRadius = state.pointer.down ? 180 : 120;

    state.chains.forEach((chain) => {
      const { center, offsets, nodes, wiggle } = chain;
      center.x = wrap(center.x + center.vx, state.width);
      center.y = wrap(center.y + center.vy, state.height);
      center.vx += Math.sin(state.time * center.speed + center.phase) * 0.0025;
      center.vy += Math.cos(state.time * center.speed * 1.3 + center.phase) * 0.002;
      center.vx = clamp(center.vx, -0.22, 0.22);
      center.vy = clamp(center.vy, -0.18, 0.18);

      nodes.forEach((node, index) => {
        const offset = offsets[index];
        const normalX = -offset.y / (Math.hypot(offset.x, offset.y) + 1);
        const normalY = offset.x / (Math.hypot(offset.x, offset.y) + 1);
        const wave = Math.sin(state.time * center.speed * 2 + index * wiggle + center.phase) * center.amplitude;
        const targetX = center.x + offset.x + normalX * wave * 0.9;
        const targetY = center.y + offset.y + normalY * wave * 0.9;

        let ax = (targetX - node.x) * 0.02;
        let ay = (targetY - node.y) * 0.02;

        if (state.pointer.active) {
          const dx = node.x - state.pointer.x;
          const dy = node.y - state.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < pointerRadius) {
            const force = (1 - dist / pointerRadius) * (state.pointer.down ? 0.9 : 0.36);
            ax += (dx / (dist + 0.001)) * force;
            ay += (dy / (dist + 0.001)) * force;
          }
        }

        node.vx = (node.vx + ax) * 0.92;
        node.vy = (node.vy + ay) * 0.92;
        node.x = wrap(node.x + node.vx, state.width);
        node.y = wrap(node.y + node.vy, state.height);
      });
    });

    state.particles.forEach((particle) => {
      particle.x = wrap(
        particle.x + particle.vx + Math.sin(state.time * particle.drift + particle.phase) * 0.18,
        state.width
      );
      particle.y = wrap(
        particle.y + particle.vy + Math.cos(state.time * particle.drift * 1.1 + particle.phase) * 0.18,
        state.height
      );

      if (state.pointer.active) {
        const dx = particle.x - state.pointer.x;
        const dy = particle.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 110) {
          const push = (1 - dist / 110) * (state.pointer.down ? 0.55 : 0.18);
          particle.x = wrap(particle.x + (dx / (dist + 0.01)) * push * 6, state.width);
          particle.y = wrap(particle.y + (dy / (dist + 0.01)) * push * 6, state.height);
        }
      }
    });

    state.pulses = state.pulses
      .map((entry) => ({ ...entry, r: entry.r + deltaMs * 0.055, alpha: entry.alpha * 0.985 }))
      .filter((entry) => entry.alpha > 0.05);
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);

    const grad = ctx.createLinearGradient(0, 0, state.width, state.height);
    grad.addColorStop(0, 'rgba(98, 64, 255, 0.08)');
    grad.addColorStop(0.52, 'rgba(34, 190, 255, 0.03)');
    grad.addColorStop(1, 'rgba(20, 255, 204, 0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.width, state.height);

    if (state.pointer.active && !reduced) {
      const glow = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, 180);
      glow.addColorStop(0, 'rgba(126, 231, 255, 0.14)');
      glow.addColorStop(0.4, 'rgba(126, 141, 255, 0.06)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(state.pointer.x - 200, state.pointer.y - 200, 400, 400);
    }

    state.chains.forEach((chain) => {
      ctx.beginPath();
      chain.nodes.forEach((node, index) => {
        if (index === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
      });
      ctx.strokeStyle = `rgba(126, 231, 255, ${profile.lineAlpha})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      chain.nodes.forEach((node, index) => {
        const size = index % 3 === 0 ? 3.1 : 2.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 244, 255, ${profile.nodeAlpha})`;
        ctx.fill();
      });
    });

    state.particles.forEach((particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      ctx.fill();
    });

    state.pulses.forEach((entry) => {
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, entry.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(126, 231, 255, ${entry.alpha * profile.pulseAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  let lastTime = performance.now();
  function frame(now) {
    if (!state.running) return;
    const deltaMs = Math.min(40, now - lastTime);
    lastTime = now;
    update(deltaMs);
    draw();
    state.rafId = requestAnimationFrame(frame);
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
    pulse(state.pointer.x, state.pointer.y);
  }

  function handleUp() {
    state.pointer.down = false;
  }

  function handleTouch(event) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    handleMove(touch);
    if (event.type === 'touchstart') {
      state.pointer.down = true;
      pulse(state.pointer.x, state.pointer.y);
    }
    if (event.type === 'touchend' || event.type === 'touchcancel') {
      state.pointer.down = false;
    }
  }

  window.addEventListener('resize', resize);
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
