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
  let scrollFrame = 0;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

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
