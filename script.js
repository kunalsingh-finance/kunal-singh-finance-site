"use strict";

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const initializeSite = (documentNode, windowNode) => {
  const root = documentNode.documentElement;
  const body = documentNode.body;
  const header = documentNode.querySelector(".site-header");
  const mainContent = documentNode.querySelector("main");
  const hero = documentNode.querySelector(".hero");
  const menuButton = documentNode.querySelector(".menu-button");
  const mobileNavigation = documentNode.querySelector(".mobile-nav");
  const reduceMotion = windowNode.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = windowNode.matchMedia("(pointer: fine)");
  const scrollMotionSections = Array.from(documentNode.querySelectorAll("[data-chapter]"));
  const visibleMotionSections = new Set();
  let scrollFrame = 0;
  let pointerFrame = 0;
  let tiltFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let activeTiltElement = null;
  let tiltX = 0;
  let tiltY = 0;

  const paintScrollState = () => {
    scrollFrame = 0;

    const scrollTop = windowNode.scrollY;
    const availableDistance = root.scrollHeight - windowNode.innerHeight;
    const progress =
      availableDistance > 0 ? clamp((scrollTop / availableDistance) * 100, 0, 100) : 0;
    const heroOffset = reduceMotion.matches
      ? 0
      : clamp(scrollTop * (windowNode.innerWidth < 760 ? 0.07 : 0.12), 0, 120);

    root.style.setProperty("--scroll-progress", `${progress}%`);
    root.style.setProperty("--hero-offset", `${heroOffset}px`);
    header?.classList.toggle("is-scrolled", scrollTop > 24);

    visibleMotionSections.forEach((section) => {
      if (!(section instanceof HTMLElement)) {
        return;
      }

      if (reduceMotion.matches) {
        section.style.setProperty("--section-progress", "0.5");
        section.style.setProperty("--section-shift", "0px");
        return;
      }

      const bounds = section.getBoundingClientRect();
      const sectionProgress = clamp(
        (windowNode.innerHeight - bounds.top) / (windowNode.innerHeight + bounds.height),
        0,
        1,
      );
      const sectionShift = clamp((0.5 - sectionProgress) * 72, -36, 36);
      section.style.setProperty("--section-progress", sectionProgress.toFixed(4));
      section.style.setProperty("--section-shift", `${sectionShift.toFixed(2)}px`);
    });
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

  const resetHeroDepth = () => {
    if (pointerFrame !== 0) {
      windowNode.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }

    root.style.setProperty("--hero-shift-x", "0px");
    root.style.setProperty("--hero-shift-y", "0px");
    root.style.setProperty("--signal-shift-x", "0px");
    root.style.setProperty("--signal-shift-y", "0px");
  };

  const paintHeroDepth = () => {
    pointerFrame = 0;
    root.style.setProperty("--hero-shift-x", `${(-pointerX * 8).toFixed(2)}px`);
    root.style.setProperty("--hero-shift-y", `${(-pointerY * 5).toFixed(2)}px`);
    root.style.setProperty("--signal-shift-x", `${(pointerX * 11).toFixed(2)}px`);
    root.style.setProperty("--signal-shift-y", `${(pointerY * 7).toFixed(2)}px`);
  };

  if (hero instanceof HTMLElement) {
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (reduceMotion.matches || !finePointer.matches) {
          return;
        }

        const bounds = hero.getBoundingClientRect();
        pointerX = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
        pointerY = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);

        if (pointerFrame === 0) {
          pointerFrame = windowNode.requestAnimationFrame(paintHeroDepth);
        }
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", resetHeroDepth, { passive: true });
    finePointer.addEventListener("change", resetHeroDepth);
    reduceMotion.addEventListener("change", (event) => {
      if (event.matches) {
        resetHeroDepth();
      }
    });
  }

  if ("IntersectionObserver" in windowNode) {
    const scrollMotionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleMotionSections.add(entry.target);
          } else {
            visibleMotionSections.delete(entry.target);
          }
        });
        scheduleScrollPaint();
      },
      { rootMargin: "24% 0px 24% 0px", threshold: 0 },
    );

    scrollMotionSections.forEach((section) => scrollMotionObserver.observe(section));
  } else {
    scrollMotionSections.forEach((section) => visibleMotionSections.add(section));
  }

  const tiltElements = Array.from(documentNode.querySelectorAll("[data-tilt]"));

  const resetTilt = (element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--tilt-glow-x", "50%");
    element.style.setProperty("--tilt-glow-y", "50%");
  };

  const resetAllTilts = () => {
    if (tiltFrame !== 0) {
      windowNode.cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
    }
    activeTiltElement = null;
    tiltElements.forEach(resetTilt);
  };

  const paintTilt = () => {
    tiltFrame = 0;
    if (!(activeTiltElement instanceof HTMLElement)) {
      return;
    }
    activeTiltElement.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    activeTiltElement.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
  };

  tiltElements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.addEventListener(
      "pointermove",
      (event) => {
        if (reduceMotion.matches || !finePointer.matches) {
          return;
        }

        const bounds = element.getBoundingClientRect();
        const localX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
        const localY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
        activeTiltElement = element;
        tiltX = (localX - 0.5) * 4.4;
        tiltY = (0.5 - localY) * 4;
        element.style.setProperty("--tilt-glow-x", `${(localX * 100).toFixed(1)}%`);
        element.style.setProperty("--tilt-glow-y", `${(localY * 100).toFixed(1)}%`);

        if (tiltFrame === 0) {
          tiltFrame = windowNode.requestAnimationFrame(paintTilt);
        }
      },
      { passive: true },
    );

    element.addEventListener(
      "pointerleave",
      () => {
        if (activeTiltElement === element && tiltFrame !== 0) {
          windowNode.cancelAnimationFrame(tiltFrame);
          tiltFrame = 0;
        }
        activeTiltElement = null;
        resetTilt(element);
      },
      { passive: true },
    );
  });

  finePointer.addEventListener("change", resetAllTilts);
  reduceMotion.addEventListener("change", (event) => {
    if (event.matches) {
      resetAllTilts();
    }
  });

  const chapterSections = scrollMotionSections;
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
