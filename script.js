"use strict";

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const initializeSite = (documentNode, windowNode) => {
  const root = documentNode.documentElement;
  const body = documentNode.body;
  const header = documentNode.querySelector(".site-header");
  const mainContent = documentNode.querySelector("main");
  const menuButton = documentNode.querySelector(".menu-button");
  const mobileNavigation = documentNode.querySelector(".mobile-nav");
  const ambientCanvas = documentNode.querySelector("#ambient-canvas");
  const reduceMotion = windowNode.matchMedia("(prefers-reduced-motion: reduce)");
  const chapterSections = Array.from(documentNode.querySelectorAll("[data-chapter]"));
  let scrollFrame = 0;
  let ambientScrollTarget = 0;

  const paintScrollState = () => {
    scrollFrame = 0;

    const scrollTop = windowNode.scrollY;
    const availableDistance = root.scrollHeight - windowNode.innerHeight;
    const progress =
      availableDistance > 0 ? clamp((scrollTop / availableDistance) * 100, 0, 100) : 0;
    const heroOffset = reduceMotion.matches
      ? 0
      : clamp(scrollTop * (windowNode.innerWidth < 760 ? 0.025 : 0.04), 0, 48);

    root.style.setProperty("--scroll-progress", `${progress}%`);
    root.style.setProperty("--hero-offset", `${heroOffset}px`);
    ambientScrollTarget = progress / 100;
    header?.classList.toggle("is-scrolled", scrollTop > 24);
  };

  const scheduleScrollPaint = () => {
    if (scrollFrame === 0) {
      scrollFrame = windowNode.requestAnimationFrame(paintScrollState);
    }
  };

  windowNode.addEventListener("scroll", scheduleScrollPaint, { passive: true });
  windowNode.addEventListener("resize", scheduleScrollPaint, { passive: true });
  reduceMotion.addEventListener("change", scheduleScrollPaint);
  paintScrollState();

  if (ambientCanvas instanceof HTMLCanvasElement) {
    const ambientContext = ambientCanvas.getContext("2d", { alpha: true });

    if (ambientContext) {
      let ambientFrame = 0;
      let resizeFrame = 0;
      let lastPaintTime = 0;
      let ambientWidth = 0;
      let ambientHeight = 0;
      let ambientScroll = 0;
      let pointerX = 0.64;
      let pointerY = 0.38;
      let pointerTargetX = pointerX;
      let pointerTargetY = pointerY;
      let backgroundGradient = null;
      let horizonGradient = null;
      let terrainGradients = [];
      let stars = [];
      let randomSeed = 4187;
      const bloomCanvas = documentNode.createElement("canvas");
      const bloomContext = bloomCanvas.getContext("2d");

      const seededRandom = () => {
        randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
        return randomSeed / 4294967296;
      };

      const createStars = () => {
        randomSeed = 4187;
        const count = ambientWidth < 760 ? 28 : 60;
        stars = Array.from({ length: count }, (_, index) => ({
          x: seededRandom() * 2 - 1,
          y: seededRandom() * 1.22 - 0.78,
          z: 0.22 + seededRandom() * 1.02,
          speed: 0.07 + seededRandom() * 0.1,
          warm: index % 9 === 0,
        }));
      };

      const resetStar = (star) => {
        star.x = seededRandom() * 2 - 1;
        star.y = seededRandom() * 1.22 - 0.78;
        star.z = 1.22;
        star.speed = 0.07 + seededRandom() * 0.1;
      };

      const createBloom = () => {
        if (!bloomContext) {
          return;
        }
        bloomCanvas.width = 640;
        bloomCanvas.height = 640;
        const glow = bloomContext.createRadialGradient(320, 320, 0, 320, 320, 320);
        glow.addColorStop(0, "rgba(156, 226, 255, 0.48)");
        glow.addColorStop(0.16, "rgba(52, 145, 197, 0.26)");
        glow.addColorStop(0.46, "rgba(18, 74, 108, 0.12)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        bloomContext.clearRect(0, 0, 640, 640);
        bloomContext.fillStyle = glow;
        bloomContext.fillRect(0, 0, 640, 640);
      };

      const drawStars = (deltaSeconds, horizon, vanishingX, staticFrame) => {
        ambientContext.save();
        ambientContext.globalCompositeOperation = "lighter";

        stars.forEach((star) => {
          if (!staticFrame) {
            star.z -= deltaSeconds * star.speed;
          }
          if (star.z < 0.18) {
            resetStar(star);
          }

          const scale = 1 / star.z;
          const screenX = vanishingX + star.x * ambientWidth * 0.42 * scale;
          const screenY = horizon + star.y * ambientHeight * 0.3 * scale;

          if (
            screenX < -80 ||
            screenX > ambientWidth + 80 ||
            screenY < -80 ||
            screenY > ambientHeight + 80
          ) {
            resetStar(star);
            return;
          }

          const previousScale = 1 / (star.z + Math.max(deltaSeconds, 0.012) * star.speed * 7);
          const previousX = vanishingX + star.x * ambientWidth * 0.42 * previousScale;
          const previousY = horizon + star.y * ambientHeight * 0.3 * previousScale;
          const depth = clamp(1.28 - star.z, 0, 1);

          ambientContext.beginPath();
          ambientContext.moveTo(previousX, previousY);
          ambientContext.lineTo(screenX, screenY);
          ambientContext.globalAlpha = 0.14 + depth * 0.48;
          ambientContext.strokeStyle = star.warm ? "#e3b468" : "#8bd7ff";
          ambientContext.lineWidth = 0.45 + depth * 1.1;
          ambientContext.stroke();

          ambientContext.beginPath();
          ambientContext.arc(screenX, screenY, 0.45 + depth * 1.3, 0, Math.PI * 2);
          ambientContext.fillStyle = star.warm ? "#f0c47b" : "#b8e8ff";
          ambientContext.fill();
        });

        ambientContext.restore();
      };

      const drawPerspectiveGrid = (phase, horizon, vanishingX) => {
        const groundHeight = ambientHeight - horizon;
        const rayCount = ambientWidth < 760 ? 12 : 22;
        const rowCount = ambientWidth < 760 ? 12 : 18;
        const yaw = (pointerX - 0.5) * ambientWidth * 0.06;

        ambientContext.save();
        ambientContext.globalCompositeOperation = "lighter";
        ambientContext.strokeStyle = "rgba(103, 187, 229, 0.2)";
        ambientContext.lineWidth = 0.65;

        for (let ray = 0; ray < rayCount; ray += 1) {
          const progress = ray / (rayCount - 1);
          const endX = -ambientWidth * 0.28 + progress * ambientWidth * 1.56 + yaw;
          ambientContext.beginPath();
          ambientContext.moveTo(vanishingX + (endX - vanishingX) * 0.018, horizon);
          ambientContext.lineTo(endX, ambientHeight);
          ambientContext.globalAlpha = 0.42 + Math.abs(progress - 0.5) * 0.3;
          ambientContext.stroke();
        }

        const travel = (phase * 0.32) % 1;
        for (let row = 0; row <= rowCount; row += 1) {
          const depth = (row + travel) / rowCount;
          if (depth > 1) {
            continue;
          }
          const projectedDepth = Math.pow(depth, 2.12);
          const y = horizon + groundHeight * projectedDepth;
          const halfWidth = ambientWidth * (0.035 + projectedDepth * 0.78);
          ambientContext.beginPath();
          ambientContext.moveTo(vanishingX - halfWidth + yaw * projectedDepth, y);
          ambientContext.lineTo(vanishingX + halfWidth + yaw * projectedDepth, y);
          ambientContext.globalAlpha = 0.22 + depth * 0.62;
          ambientContext.stroke();
        }

        ambientContext.restore();
      };

      const drawTerrain = (phase, horizon) => {
        const layerCount = ambientWidth < 760 ? 2 : 3;
        const segments = ambientWidth < 760 ? 30 : 52;

        for (let layer = 0; layer < layerCount; layer += 1) {
          const base = horizon + ambientHeight * (0.13 + layer * 0.11);
          const amplitude = ambientHeight * (0.018 + layer * 0.012);
          const points = [];

          for (let segment = 0; segment <= segments; segment += 1) {
            const progress = segment / segments;
            const x = progress * ambientWidth;
            const y =
              base +
              Math.sin(progress * Math.PI * (3.2 + layer * 0.38) + phase * (0.62 - layer * 0.08) + layer) *
                amplitude +
              Math.sin(progress * Math.PI * 8.4 - phase * 0.31 + layer * 1.7) *
                amplitude *
                0.26;
            points.push({ x, y });
          }

          ambientContext.save();
          ambientContext.beginPath();
          points.forEach((point, index) => {
            if (index === 0) {
              ambientContext.moveTo(point.x, point.y);
            } else {
              ambientContext.lineTo(point.x, point.y);
            }
          });
          ambientContext.lineTo(ambientWidth, ambientHeight);
          ambientContext.lineTo(0, ambientHeight);
          ambientContext.closePath();
          ambientContext.globalAlpha = 0.54 - layer * 0.1;
          ambientContext.fillStyle = terrainGradients[layer];
          ambientContext.fill();

          ambientContext.beginPath();
          points.forEach((point, index) => {
            if (index === 0) {
              ambientContext.moveTo(point.x, point.y);
            } else {
              ambientContext.lineTo(point.x, point.y);
            }
          });
          ambientContext.globalCompositeOperation = "lighter";
          ambientContext.globalAlpha = 0.38 - layer * 0.06;
          ambientContext.strokeStyle = layer === 1 ? "#d8a95f" : "#68c6f4";
          ambientContext.lineWidth = 0.7 + layer * 0.25;
          ambientContext.stroke();

          if (layer === layerCount - 1) {
            points.forEach((point, index) => {
              if (index % 4 !== 0) {
                return;
              }
              ambientContext.beginPath();
              ambientContext.moveTo(point.x, point.y);
              ambientContext.lineTo(point.x, Math.min(ambientHeight, point.y + 24 + layer * 8));
              ambientContext.globalAlpha = 0.12;
              ambientContext.stroke();
            });
          }
          ambientContext.restore();
        }
      };

      const drawDataTowers = (phase, horizon, vanishingX) => {
        const towerCount = ambientWidth < 760 ? 9 : 16;
        const groundHeight = ambientHeight - horizon;

        ambientContext.save();
        ambientContext.globalCompositeOperation = "lighter";
        for (let tower = 0; tower < towerCount; tower += 1) {
          const depth = 0.13 + ((tower * 0.173 + phase * 0.018) % 0.84);
          const lane = ((tower * 5) % towerCount) / Math.max(1, towerCount - 1) - 0.5;
          const groundY = horizon + groundHeight * Math.pow(depth, 2.08);
          const groundX = vanishingX + lane * ambientWidth * (0.08 + depth * 1.18);
          const pulse = 0.72 + Math.sin(phase * 1.8 + tower * 0.9) * 0.2;
          const height = (18 + (tower % 5) * 16) * depth * pulse;
          const width = 0.8 + depth * 2.2;
          const warm = tower % 6 === 0;

          ambientContext.globalAlpha = 0.035 + depth * 0.13;
          ambientContext.fillStyle = warm ? "#dfac61" : "#73cdf9";
          ambientContext.fillRect(groundX - width * 0.5, groundY - height, width, height);

          ambientContext.beginPath();
          ambientContext.moveTo(groundX, groundY);
          ambientContext.lineTo(groundX, groundY - height);
          ambientContext.globalAlpha = 0.12 + depth * 0.5;
          ambientContext.strokeStyle = warm ? "#dfac61" : "#73cdf9";
          ambientContext.lineWidth = 0.55 + depth * 1.25;
          ambientContext.stroke();

          ambientContext.beginPath();
          ambientContext.arc(groundX, groundY - height, 0.7 + depth * 1.8, 0, Math.PI * 2);
          ambientContext.fillStyle = warm ? "#f0bd6f" : "#a8e3ff";
          ambientContext.fill();
        }
        ambientContext.restore();
      };

      const paintAmbientField = (timestamp, force = false) => {
        ambientFrame = 0;

        if (
          ambientWidth === 0 ||
          ambientHeight === 0 ||
          !backgroundGradient ||
          !horizonGradient
        ) {
          return;
        }

        const mobileFrameInterval = 1000 / 40;
        if (
          !force &&
          ambientWidth < 760 &&
          timestamp - lastPaintTime < mobileFrameInterval
        ) {
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
          return;
        }

        const deltaSeconds = lastPaintTime > 0 ? Math.min((timestamp - lastPaintTime) / 1000, 0.06) : 0;
        lastPaintTime = timestamp;
        ambientScroll += (ambientScrollTarget - ambientScroll) * 0.04;
        pointerX += (pointerTargetX - pointerX) * 0.03;
        pointerY += (pointerTargetY - pointerY) * 0.03;

        const staticFrame = reduceMotion.matches;
        const phase = staticFrame ? 3.8 : timestamp * 0.0005;
        const horizon = ambientHeight * (0.37 + ambientScroll * 0.045 + (pointerY - 0.5) * 0.022);
        const vanishingX =
          ambientWidth * (ambientWidth < 760 ? 0.57 : 0.68) +
          (pointerX - 0.5) * ambientWidth * (ambientWidth < 760 ? 0.045 : 0.095);

        ambientContext.save();
        ambientContext.fillStyle = backgroundGradient;
        ambientContext.fillRect(0, 0, ambientWidth, ambientHeight);

        if (bloomContext) {
          const bloomSize = Math.min(Math.max(ambientWidth * 0.72, 520), 940);
          ambientContext.globalAlpha = 0.84;
          ambientContext.drawImage(
            bloomCanvas,
            vanishingX - bloomSize * 0.5,
            horizon - bloomSize * 0.5,
            bloomSize,
            bloomSize,
          );
        }

        const beamX = ((phase * 0.18) % 1) * (ambientWidth + 420) - 210;
        ambientContext.beginPath();
        ambientContext.moveTo(beamX - 150, 0);
        ambientContext.lineTo(beamX + 80, 0);
        ambientContext.lineTo(beamX + 300, ambientHeight);
        ambientContext.lineTo(beamX - 90, ambientHeight);
        ambientContext.closePath();
        ambientContext.fillStyle = "rgba(96, 196, 244, 0.035)";
        ambientContext.fill();
        ambientContext.fillStyle = "rgba(161, 224, 255, 0.16)";
        ambientContext.fillRect(beamX, 0, 0.85, ambientHeight);

        drawStars(deltaSeconds, horizon, vanishingX, staticFrame);

        ambientContext.globalAlpha = 0.9;
        ambientContext.fillStyle = horizonGradient;
        ambientContext.fillRect(0, horizon - 70, ambientWidth, 140);
        ambientContext.globalAlpha = 0.34;
        ambientContext.fillStyle = "#8bd8ff";
        ambientContext.fillRect(0, horizon, ambientWidth, 0.7);

        drawPerspectiveGrid(phase, horizon, vanishingX);
        drawTerrain(phase, horizon);
        drawDataTowers(phase, horizon, vanishingX);
        ambientContext.restore();
        root.classList.add("ambient-ready");

        if (!staticFrame && !documentNode.hidden) {
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
        }
      };

      const resizeAmbientField = () => {
        resizeFrame = 0;
        if (ambientFrame !== 0) {
          windowNode.cancelAnimationFrame(ambientFrame);
          ambientFrame = 0;
        }

        ambientWidth = windowNode.innerWidth;
        ambientHeight = windowNode.innerHeight;
        const pixelRatio = Math.min(windowNode.devicePixelRatio || 1, ambientWidth < 760 ? 1 : 1.2);

        ambientCanvas.width = Math.round(ambientWidth * pixelRatio);
        ambientCanvas.height = Math.round(ambientHeight * pixelRatio);
        ambientContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        backgroundGradient = ambientContext.createLinearGradient(0, 0, 0, ambientHeight);
        backgroundGradient.addColorStop(0, "#010408");
        backgroundGradient.addColorStop(0.4, "#04111a");
        backgroundGradient.addColorStop(0.7, "#02080d");
        backgroundGradient.addColorStop(1, "#010305");

        horizonGradient = ambientContext.createLinearGradient(0, 0, ambientWidth, 0);
        horizonGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        horizonGradient.addColorStop(0.46, "rgba(32, 113, 156, 0.04)");
        horizonGradient.addColorStop(0.68, "rgba(96, 198, 245, 0.15)");
        horizonGradient.addColorStop(0.82, "rgba(219, 168, 88, 0.07)");
        horizonGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        terrainGradients = Array.from({ length: 3 }, (_, index) => {
          const gradient = ambientContext.createLinearGradient(0, ambientHeight * 0.38, 0, ambientHeight);
          gradient.addColorStop(
            0,
            index === 1 ? "rgba(109, 83, 43, 0.12)" : "rgba(29, 111, 154, 0.18)",
          );
          gradient.addColorStop(0.58, "rgba(8, 25, 35, 0.12)");
          gradient.addColorStop(1, "rgba(1, 4, 7, 0)");
          return gradient;
        });
        createStars();
        paintAmbientField(windowNode.performance.now(), true);
      };

      const scheduleAmbientResize = () => {
        if (resizeFrame === 0) {
          resizeFrame = windowNode.requestAnimationFrame(resizeAmbientField);
        }
      };

      windowNode.addEventListener(
        "pointermove",
        (event) => {
          if (reduceMotion.matches || event.pointerType === "touch") {
            return;
          }
          pointerTargetX = clamp(event.clientX / windowNode.innerWidth, 0, 1);
          pointerTargetY = clamp(event.clientY / windowNode.innerHeight, 0, 1);
        },
        { passive: true },
      );
      windowNode.addEventListener("resize", scheduleAmbientResize, { passive: true });
      documentNode.addEventListener("visibilitychange", () => {
        if (documentNode.hidden) {
          if (ambientFrame !== 0) {
            windowNode.cancelAnimationFrame(ambientFrame);
            ambientFrame = 0;
          }
        } else if (!reduceMotion.matches && ambientFrame === 0) {
          lastPaintTime = 0;
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
        }
      });
      reduceMotion.addEventListener("change", (event) => {
        if (ambientFrame !== 0) {
          windowNode.cancelAnimationFrame(ambientFrame);
          ambientFrame = 0;
        }
        pointerTargetX = 0.64;
        pointerTargetY = 0.38;
        lastPaintTime = 0;
        paintAmbientField(windowNode.performance.now(), true);
        if (!event.matches && ambientFrame === 0) {
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
        }
      });

      createBloom();
      resizeAmbientField();
    }
  }

  const chapterIndex = documentNode.querySelector(".chapter-rail-index");
  const chapterLabel = documentNode.querySelector(".chapter-rail-label");
  const chapterNavigationLinks = Array.from(
    documentNode.querySelectorAll(".desktop-nav a, .mobile-nav a"),
  );

  const activateChapter = (section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    if (chapterIndex instanceof HTMLElement) {
      chapterIndex.textContent = section.dataset.chapterIndex ?? "";
    }
    if (chapterLabel instanceof HTMLElement) {
      chapterLabel.textContent = section.dataset.chapter ?? "";
    }

    chapterNavigationLinks.forEach((link) => {
      const isCurrent = link instanceof HTMLAnchorElement && link.hash === `#${section.id}`;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if (chapterSections.length > 0) {
    activateChapter(chapterSections[0]);

    if ("IntersectionObserver" in windowNode) {
      const chapterObserver = new IntersectionObserver(
        (entries) => {
          entries
            .filter((entry) => entry.isIntersecting)
            .forEach((entry) => activateChapter(entry.target));
        },
        {
          rootMargin: "-42% 0px -50% 0px",
          threshold: 0,
        },
      );

      chapterSections.forEach((section) => chapterObserver.observe(section));
    }
  }

  const counterElements = Array.from(documentNode.querySelectorAll("[data-count-to]"));
  const completedCounters = new WeakSet();

  const formatCounterValue = (element, value) => {
    const decimals = Number.parseInt(element.dataset.countDecimals ?? "0", 10);
    const useGrouping = element.hasAttribute("data-count-grouping");
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  };

  const finishCounter = (element) => {
    const target = Number.parseFloat(element.dataset.countTo ?? "0");
    if (!Number.isFinite(target)) {
      return;
    }
    element.textContent = formatCounterValue(element, target);
    completedCounters.add(element);
  };

  const animateCounter = (element) => {
    if (!(element instanceof HTMLElement) || completedCounters.has(element)) {
      return;
    }

    const target = Number.parseFloat(element.dataset.countTo ?? "0");
    if (!Number.isFinite(target) || reduceMotion.matches) {
      finishCounter(element);
      return;
    }

    completedCounters.add(element);
    const duration = target > 1000 ? 1450 : 1150;
    const startTime = windowNode.performance.now();

    const paintCounter = (timestamp) => {
      const progress = clamp((timestamp - startTime) / duration, 0, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      element.textContent = formatCounterValue(element, target * easedProgress);

      if (progress < 1 && !documentNode.hidden) {
        windowNode.requestAnimationFrame(paintCounter);
      } else {
        element.textContent = formatCounterValue(element, target);
      }
    };

    element.textContent = formatCounterValue(element, 0);
    windowNode.requestAnimationFrame(paintCounter);
  };

  const activateCountersWithin = (container) => {
    if (!(container instanceof Element)) {
      return;
    }
    if (container.matches("[data-count-to]")) {
      animateCounter(container);
    }
    container.querySelectorAll("[data-count-to]").forEach(animateCounter);
  };

  const staggerGroups = Array.from(
    documentNode.querySelectorAll(
      ".proof-grid, .feature-grid, .portfolio-detail-grid, .repository-grid, .analytical-grid, .credentials-grid, .timeline",
    ),
  );
  staggerGroups.forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      if (child instanceof HTMLElement && child.hasAttribute("data-reveal")) {
        child.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 65}ms`);
      }
    });
  });

  const revealElements = Array.from(documentNode.querySelectorAll("[data-reveal]"));
  const motionScenes = Array.from(documentNode.querySelectorAll(".motion-scene"));

  const revealEverything = () => {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    motionScenes.forEach((element) => element.classList.add("is-active"));
    counterElements.forEach(finishCounter);
  };

  if (reduceMotion.matches || !("IntersectionObserver" in windowNode)) {
    revealEverything();
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            entry.target.classList.add("is-visible");
            activateCountersWithin(entry.target);
            observer.unobserve(entry.target);
          });
      },
      {
        rootMargin: "0px 0px -9% 0px",
        threshold: 0.07,
      },
    );

    revealElements.forEach((element) => revealObserver.observe(element));

    const sceneObserver = new IntersectionObserver(
      (entries, observer) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            entry.target.classList.add("is-active");
            observer.unobserve(entry.target);
          });
      },
      {
        rootMargin: "-8% 0px -8% 0px",
        threshold: 0.18,
      },
    );

    motionScenes.forEach((scene) => sceneObserver.observe(scene));

    reduceMotion.addEventListener("change", (event) => {
      if (event.matches) {
        revealEverything();
        revealObserver.disconnect();
        sceneObserver.disconnect();
      }
    });
  }

  if (
    menuButton instanceof HTMLButtonElement &&
    mobileNavigation instanceof HTMLElement
  ) {
    const navigationLinks = Array.from(mobileNavigation.querySelectorAll("a"));

    const setMenuState = (isOpen, returnFocus = false) => {
      body.classList.toggle("menu-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      mobileNavigation.classList.toggle("is-open", isOpen);
      mobileNavigation.setAttribute("aria-hidden", String(!isOpen));
      mobileNavigation.inert = !isOpen;
      if (mainContent instanceof HTMLElement) {
        mainContent.inert = isOpen;
      }

      if (isOpen) {
        windowNode.requestAnimationFrame(() => navigationLinks[0]?.focus());
      } else if (returnFocus) {
        menuButton.focus();
      }
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen, isOpen);
    });

    navigationLinks.forEach((link) => {
      link.addEventListener("click", () => setMenuState(false));
    });

    windowNode.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, true);
      }
    });

    windowNode.addEventListener(
      "resize",
      () => {
        if (
          windowNode.innerWidth > 1180 &&
          menuButton.getAttribute("aria-expanded") === "true"
        ) {
          setMenuState(false);
        }
      },
      { passive: true },
    );
  }

  const credentialDialog = documentNode.querySelector("#credential-dialog");
  const dialogCloseButton = documentNode.querySelector(".credential-dialog-close");
  const dialogImage = documentNode.querySelector("#credential-dialog-image");
  const dialogIssuer = documentNode.querySelector("#credential-dialog-issuer");
  const dialogTitle = documentNode.querySelector("#credential-dialog-title");
  const dialogDetail = documentNode.querySelector("#credential-dialog-detail");
  const dialogRequest = documentNode.querySelector("#credential-dialog-request");
  const credentialTriggers = Array.from(documentNode.querySelectorAll(".credential-trigger"));
  let activeCredentialTrigger = null;

  const dialogIsReady =
    credentialDialog instanceof HTMLDialogElement &&
    dialogCloseButton instanceof HTMLButtonElement &&
    dialogImage instanceof HTMLImageElement &&
    dialogIssuer instanceof HTMLElement &&
    dialogTitle instanceof HTMLElement &&
    dialogDetail instanceof HTMLElement &&
    dialogRequest instanceof HTMLAnchorElement;

  if (dialogIsReady) {
    credentialTriggers.forEach((trigger) => {
      if (!(trigger instanceof HTMLButtonElement)) {
        return;
      }

      trigger.addEventListener("click", () => {
        const { issuer, title, detail, image } = trigger.dataset;

        if (!issuer || !title || !detail || !image) {
          return;
        }

        dialogImage.src = image;
        dialogImage.alt = `${title} certificate awarded to Kunal Singh`;
        dialogImage.decoding = "async";
        dialogIssuer.textContent = issuer;
        dialogTitle.textContent = title;
        dialogDetail.textContent = detail;
        dialogRequest.href =
          `mailto:ks0000477@gmail.com?subject=${encodeURIComponent(
            `Credential Verification - ${title}`,
          )}`;
        activeCredentialTrigger = trigger;
        body.classList.add("dialog-open");
        credentialDialog.showModal();
      });
    });

    dialogCloseButton.addEventListener("click", () => credentialDialog.close());

    credentialDialog.addEventListener("click", (event) => {
      if (event.target === credentialDialog) {
        credentialDialog.close();
      }
    });

    credentialDialog.addEventListener("close", () => {
      body.classList.remove("dialog-open");
      dialogImage.removeAttribute("src");
      dialogImage.alt = "";
      activeCredentialTrigger?.focus();
      activeCredentialTrigger = null;
    });
  }
};

initializeSite(document, window);
