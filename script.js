(() => {
  const canvas = document.querySelector("#market-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const siteHeader = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector("#mobile-nav");
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    scroll: 0,
    targetScroll: 0,
    pointerX: 0,
    pointerY: 0,
  };

  const palette = {
    text: "rgba(244, 243, 236,",
    gold: "rgba(215, 180, 106,",
    green: "rgba(73, 209, 153,",
    blue: "rgba(106, 184, 255,",
    rose: "rgba(231, 130, 159,",
  };

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const particles = Array.from({ length: 180 }, (_, index) => ({
    x: rand(-9, 9),
    y: rand(-4.2, 4.2),
    z: rand(3, 18),
    radius: rand(0.6, 1.9),
    speed: rand(0.004, 0.018),
    lane: index % 4,
  }));

  const bars = Array.from({ length: 52 }, (_, index) => ({
    x: (index - 26) * 0.38,
    z: rand(5, 17),
    base: rand(0.4, 2.7),
    variance: rand(0.3, 1.4),
    phase: rand(0, Math.PI * 2),
    hue: index % 5,
  }));

  const slabs = Array.from({ length: 22 }, (_, index) => ({
    x: rand(-5.5, 5.5),
    y: rand(-1.9, 2.6),
    z: rand(6, 16),
    w: rand(0.8, 2.2),
    h: rand(0.28, 0.9),
    phase: rand(0, Math.PI * 2),
    tone: index % 3,
  }));

  const streams = Array.from({ length: 11 }, (_, index) => ({
    y: 0.18 + index * 0.065 + rand(-0.02, 0.02),
    amp: rand(18, 58),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.00018, 0.00036),
    tone: index % 4,
  }));

  const macroDots = Array.from({ length: 64 }, (_, index) => ({
    theta: rand(0, Math.PI * 2),
    phi: rand(-1.1, 1.1),
    radius: rand(0.72, 1),
    speed: rand(0.00006, 0.00018) * (index % 2 ? 1 : -1),
    tone: index % 4,
  }));

  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  };

  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    state.targetScroll = max > 0 ? window.scrollY / max : 0;
  };

  const project = (point) => {
    const scrollTilt = (state.scroll - 0.42) * 1.2;
    const cameraZ = 7.2 - state.scroll * 1.4;
    const px = point.x + state.pointerX * 0.45;
    const py = point.y + state.pointerY * 0.24 + scrollTilt;
    const pz = point.z + cameraZ;
    const depth = Math.max(0.08, 9 / pz);
    return {
      x: state.width / 2 + px * state.width * 0.075 * depth,
      y: state.height / 2 + py * state.height * 0.105 * depth,
      depth,
      alpha: Math.max(0, Math.min(1, 1.4 - pz / 22)),
    };
  };

  const drawBackground = (labFade, marketFade) => {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, "#05060a");
    gradient.addColorStop(0.46, labFade > 0.35 ? "#07100f" : "#0a0b0d");
    gradient.addColorStop(1, marketFade > 0.35 ? "#100c14" : "#11100c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowA = ctx.createRadialGradient(
      state.width * (0.72 + state.pointerX * 0.05),
      state.height * 0.16,
      0,
      state.width * 0.72,
      state.height * 0.16,
      state.width * 0.58
    );
    glowA.addColorStop(0, `rgba(215, 180, 106, ${0.1 + marketFade * 0.06})`);
    glowA.addColorStop(1, "rgba(215, 180, 106, 0)");
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, state.width, state.height);

    const glowB = ctx.createRadialGradient(
      state.width * (0.22 + labFade * 0.18),
      state.height * 0.68,
      0,
      state.width * 0.22,
      state.height * 0.68,
      state.width * 0.55
    );
    glowB.addColorStop(0, `rgba(73, 209, 153, ${0.07 + labFade * 0.1})`);
    glowB.addColorStop(1, "rgba(73, 209, 153, 0)");
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, state.width, state.height);
  };

  const drawGrid = (opacity) => {
    const rows = 18;
    const cols = 34;
    ctx.lineWidth = 1;

    for (let row = 0; row <= rows; row += 1) {
      const z = 4 + row * 0.75;
      const left = project({ x: -10, y: 2.9, z });
      const right = project({ x: 10, y: 2.9, z });
      ctx.strokeStyle = `${palette.text} ${0.045 * left.alpha * opacity})`;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    for (let col = 0; col <= cols; col += 1) {
      const x = -10 + (col / cols) * 20;
      const near = project({ x, y: 2.9, z: 4 });
      const far = project({ x, y: 2.9, z: 17.5 });
      ctx.strokeStyle = `${palette.text} ${0.035 * near.alpha * opacity})`;
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
  };

  const drawParticles = (opacity) => {
    particles.forEach((particle) => {
      particle.z -= particle.speed * (1.8 + state.scroll * 4.4);
      if (particle.z < 2.6) {
        particle.z = rand(14, 19);
        particle.x = rand(-9, 9);
        particle.y = rand(-4.2, 4.2);
      }
      const p = project(particle);
      const tones = [palette.gold, palette.green, palette.blue, palette.rose];
      ctx.fillStyle = `${tones[particle.lane]} ${0.32 * p.alpha * opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, particle.radius * p.depth * 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawBars = (opacity) => {
    bars.forEach((bar, index) => {
      const pulse = Math.sin(state.time * 0.0017 + bar.phase + state.scroll * 4);
      const height = bar.base + pulse * bar.variance + state.scroll * 1.4;
      const bottom = project({ x: bar.x, y: 2.2, z: bar.z });
      const top = project({ x: bar.x, y: 2.2 - Math.max(0.18, height), z: bar.z });
      const width = Math.max(2, 16 * bottom.depth);
      const colors = [palette.green, palette.gold, palette.blue, palette.green, palette.rose];
      const alpha = (0.19 + 0.24 * bottom.alpha) * opacity;

      ctx.fillStyle = `${colors[bar.hue]} ${alpha})`;
      ctx.fillRect(bottom.x - width / 2, top.y, width, bottom.y - top.y);
      ctx.strokeStyle = `${palette.text} ${0.1 * bottom.alpha * opacity})`;
      ctx.strokeRect(bottom.x - width / 2, top.y, width, bottom.y - top.y);

      if (index % 6 === 0) {
        ctx.fillStyle = `${palette.text} ${0.28 * bottom.alpha * opacity})`;
        ctx.fillRect(bottom.x - 1, top.y - 14 * bottom.depth, 2, 11 * bottom.depth);
      }
    });
  };

  const drawSlabs = (opacity) => {
    slabs.forEach((slab) => {
      const drift = Math.sin(state.time * 0.001 + slab.phase) * 0.24;
      const p = project({ x: slab.x + drift, y: slab.y, z: slab.z });
      const w = slab.w * state.width * 0.036 * p.depth;
      const h = slab.h * state.height * 0.028 * p.depth;
      const tones = [palette.text, palette.gold, palette.green];
      ctx.fillStyle = `${tones[slab.tone]} ${(0.045 + 0.08 * p.alpha) * opacity})`;
      ctx.strokeStyle = `${tones[slab.tone]} ${0.16 * p.alpha * opacity})`;
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 6);
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawOrbit = (opacity) => {
    const centerX = state.width * (0.66 + state.pointerX * 0.025);
    const centerY = state.height * (0.45 + state.pointerY * 0.04);
    const radiusX = Math.min(state.width, state.height) * (0.24 + state.scroll * 0.08);
    const radiusY = radiusX * (0.34 + state.scroll * 0.16);

    for (let ring = 0; ring < 3; ring += 1) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(state.time * 0.00012 * (ring + 1) + ring * 0.74);
      ctx.strokeStyle = `${ring === 1 ? palette.gold : palette.blue} ${(0.08 + ring * 0.035) * opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX * (1 - ring * 0.17), radiusY * (1 + ring * 0.2), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawFlowNetwork = (opacity) => {
    if (opacity <= 0.01) return;
    const tones = [palette.green, palette.gold, palette.blue, palette.rose];
    streams.forEach((stream, index) => {
      const baseY = state.height * stream.y + Math.sin(state.time * stream.speed + stream.phase) * stream.amp;
      const offset = Math.sin(state.time * 0.00022 + index) * 40;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `${tones[stream.tone]} ${0.12 * opacity})`;
      ctx.beginPath();
      ctx.moveTo(-40, baseY);
      for (let x = 0; x <= state.width + 60; x += 140) {
        const y = baseY + Math.sin(x * 0.008 + stream.phase + state.time * stream.speed) * stream.amp;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      const progress = (state.time * stream.speed * 0.55 + stream.phase) % 1;
      const dotX = progress * (state.width + 180) - 90 + offset;
      const dotY = baseY + Math.sin(dotX * 0.008 + stream.phase + state.time * stream.speed) * stream.amp;
      ctx.fillStyle = `${tones[stream.tone]} ${0.44 * opacity})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.2 + (index % 3), 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawMacroMap = (opacity) => {
    if (opacity <= 0.01) return;
    const cx = state.width * (0.64 + state.pointerX * 0.02);
    const cy = state.height * (0.48 + state.pointerY * 0.02);
    const radius = Math.min(state.width, state.height) * 0.29;
    const tones = [palette.green, palette.gold, palette.blue, palette.rose];

    ctx.strokeStyle = `${palette.text} ${0.09 * opacity})`;
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 5; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (0.35 + ring * 0.15), radius * (0.12 + ring * 0.06), ring * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    macroDots.forEach((dot) => {
      const theta = dot.theta + state.time * dot.speed + state.scroll * 1.2;
      const x = cx + Math.cos(theta) * Math.cos(dot.phi) * radius * dot.radius;
      const y = cy + Math.sin(dot.phi) * radius * 0.72 + Math.sin(theta) * 18;
      const z = (Math.sin(theta) + 1) / 2;
      const size = 1.6 + z * 3.2;
      ctx.fillStyle = `${tones[dot.tone]} ${(0.16 + z * 0.34) * opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const draw = (now) => {
    state.time = now;
    state.scroll += (state.targetScroll - state.scroll) * 0.06;

    const heroFade = 1 - clamp01((state.scroll - 0.18) / 0.24);
    const labFade = clamp01((state.scroll - 0.12) / 0.2) * (1 - clamp01((state.scroll - 0.58) / 0.22));
    const marketFade = clamp01((state.scroll - 0.48) / 0.28);

    drawBackground(labFade, marketFade);
    drawGrid(0.4 + heroFade * 0.6);
    drawOrbit(0.24 + marketFade * 0.78);
    drawFlowNetwork(labFade);
    drawMacroMap(marketFade);
    drawSlabs(0.24 + labFade * 0.78);
    drawBars(0.16 + heroFade * 0.88);
    drawParticles(0.42 + heroFade * 0.36 + marketFade * 0.14);
    requestAnimationFrame(draw);
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll("[data-reveal]").forEach((element) => {
    revealObserver.observe(element);
  });

  const closeMobileNav = () => {
    if (!siteHeader || !navToggle) return;
    siteHeader.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  };

  if (siteHeader && navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = siteHeader.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileNav);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobileNav();
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("pointermove", (event) => {
    state.pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  resize();
  updateScroll();
  requestAnimationFrame(draw);
})();
