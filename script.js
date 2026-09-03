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
      let pointerX = 0.62;
      let pointerY = 0.42;
      let pointerTargetX = pointerX;
      let pointerTargetY = pointerY;
      let ambientGradients = [];

      const pointOnFlow = (progress, band, phase) => {
        const direction = band % 2 === 0 ? 1 : -1;
        const base = ambientHeight * (0.12 + band * 0.145);
        const slope = ambientHeight * (0.08 + band * 0.012);
        const amplitude = ambientHeight * (0.025 + band * 0.0035);
        const drift = Math.sin(phase * 0.42 + band * 1.7) * ambientWidth * 0.018;
        const pointerInfluence = (pointerX - 0.5) * ambientWidth * 0.028 * direction;
        const scrollInfluence = (ambientScroll - 0.5) * ambientHeight * 0.11 * direction;
        const x = progress * ambientWidth + drift + pointerInfluence;
        const y =
          base +
          (progress - 0.5) * slope +
          Math.sin(progress * Math.PI * 2.25 + phase * (0.72 + band * 0.035) + band) *
            amplitude +
          Math.sin(progress * Math.PI * 6.4 - phase * 0.38 + band * 0.72) *
            amplitude *
            0.28 +
          (pointerY - 0.5) * ambientHeight * 0.04 * (1 - progress) +
          scrollInfluence;

        return { x, y };
      };

      const buildGradient = (start, middle, finish) => {
        const gradient = ambientContext.createLinearGradient(0, 0, ambientWidth, 0);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.22, start);
        gradient.addColorStop(0.62, middle);
        gradient.addColorStop(0.88, finish);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        return gradient;
      };

      const paintAmbientField = (timestamp, force = false) => {
        ambientFrame = 0;

        if (ambientWidth === 0 || ambientHeight === 0) {
          return;
        }

        const mobileFrameInterval = 1000 / 30;
        if (
          !force &&
          ambientWidth < 760 &&
          timestamp - lastPaintTime < mobileFrameInterval
        ) {
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
          return;
        }

        lastPaintTime = timestamp;
        ambientScroll += (ambientScrollTarget - ambientScroll) * 0.045;
        pointerX += (pointerTargetX - pointerX) * 0.035;
        pointerY += (pointerTargetY - pointerY) * 0.035;

        const phase = reduceMotion.matches ? 5.2 : timestamp * 0.00028;
        const bandCount = ambientWidth < 760 ? 4 : 6;
        const segmentCount = ambientWidth < 760 ? 38 : 64;
        const particleCount = ambientWidth < 760 ? 16 : 28;

        ambientContext.clearRect(0, 0, ambientWidth, ambientHeight);
        ambientContext.save();
        ambientContext.globalCompositeOperation = "lighter";

        for (let band = 0; band < bandCount; band += 1) {
          const thickness = 15 + band * 4;
          ambientContext.beginPath();

          for (let segment = 0; segment <= segmentCount; segment += 1) {
            const progress = segment / segmentCount;
            const point = pointOnFlow(progress, band, phase);
            const envelope = Math.sin(progress * Math.PI);
            const y = point.y - thickness * envelope;

            if (segment === 0) {
              ambientContext.moveTo(point.x, y);
            } else {
              ambientContext.lineTo(point.x, y);
            }
          }

          for (let segment = segmentCount; segment >= 0; segment -= 1) {
            const progress = segment / segmentCount;
            const point = pointOnFlow(progress, band, phase);
            const envelope = Math.sin(progress * Math.PI);
            ambientContext.lineTo(point.x, point.y + thickness * envelope);
          }

          ambientContext.closePath();
          ambientContext.globalAlpha = band % 2 === 0 ? 0.24 : 0.16;
          ambientContext.fillStyle = ambientGradients[band % ambientGradients.length];
          ambientContext.fill();

          ambientContext.beginPath();
          for (let segment = 0; segment <= segmentCount; segment += 1) {
            const point = pointOnFlow(segment / segmentCount, band, phase);
            if (segment === 0) {
              ambientContext.moveTo(point.x, point.y);
            } else {
              ambientContext.lineTo(point.x, point.y);
            }
          }
          ambientContext.globalAlpha = 0.34 + band * 0.025;
          ambientContext.strokeStyle = band % 3 === 1 ? "#d5a45c" : "#69bdf0";
          ambientContext.lineWidth = 0.7 + band * 0.12;
          ambientContext.stroke();
        }

        for (let index = 0; index < particleCount; index += 1) {
          const band = index % bandCount;
          const travel =
            (index / particleCount + phase * (0.028 + (index % 4) * 0.0025)) % 1;
          const point = pointOnFlow(travel, band, phase);
          const pulse = 0.45 + Math.sin(phase * 2.2 + index) * 0.22;
          ambientContext.beginPath();
          ambientContext.arc(point.x, point.y, index % 5 === 0 ? 2.1 : 1.25, 0, Math.PI * 2);
          ambientContext.globalAlpha = pulse;
          ambientContext.fillStyle = index % 6 === 0 ? "#e1b66e" : "#8bd4ff";
          ambientContext.fill();
        }

        ambientContext.restore();
        root.classList.add("ambient-ready");

        if (!reduceMotion.matches && !documentNode.hidden) {
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
        const pixelRatio = Math.min(windowNode.devicePixelRatio || 1, ambientWidth < 760 ? 1 : 1.15);

        ambientCanvas.width = Math.round(ambientWidth * pixelRatio);
        ambientCanvas.height = Math.round(ambientHeight * pixelRatio);
        ambientContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ambientGradients = [
          buildGradient(
            "rgba(48, 129, 181, 0.08)",
            "rgba(79, 181, 235, 0.32)",
            "rgba(211, 164, 91, 0.1)",
          ),
          buildGradient(
            "rgba(200, 151, 76, 0.04)",
            "rgba(91, 150, 187, 0.22)",
            "rgba(221, 174, 98, 0.24)",
          ),
        ];
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
          if (reduceMotion.matches) {
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
        pointerTargetX = 0.62;
        pointerTargetY = 0.42;
        lastPaintTime = 0;
        paintAmbientField(windowNode.performance.now(), true);
        if (!event.matches && ambientFrame === 0) {
          ambientFrame = windowNode.requestAnimationFrame(paintAmbientField);
        }
      });

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

  const revealElements = Array.from(documentNode.querySelectorAll("[data-reveal]"));
  const motionScenes = Array.from(documentNode.querySelectorAll(".motion-scene"));

  const revealEverything = () => {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    motionScenes.forEach((element) => element.classList.add("is-active"));
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
