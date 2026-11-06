"use strict";

const initializeSite = (documentNode, windowNode) => {
  const root = documentNode.documentElement;
  const body = documentNode.body;
  const header = documentNode.querySelector(".site-header");
  const main = documentNode.querySelector("main");
  const hero = documentNode.querySelector(".hero");
  const reduceMotion = windowNode.matchMedia("(prefers-reduced-motion: reduce)");
  const revealElements = Array.from(documentNode.querySelectorAll("[data-reveal]"));
  const navigationLinks = Array.from(documentNode.querySelectorAll(".desktop-nav a, .mobile-nav a"));
  let scrollFrame = 0;
  let resetArtwork = () => {};

  // No permanent render loop: scroll and resize events share one pending frame.
  const paintScrollState = () => {
    scrollFrame = 0;
    resetArtwork();
    const available = root.scrollHeight - windowNode.innerHeight;
    const progress = available > 0 ? Math.max(0, Math.min(windowNode.scrollY / available, 1)) : 0;
    root.style.setProperty("--scroll-progress", String(progress));
    header?.classList.toggle("is-scrolled", windowNode.scrollY > 16);
    if (hero?.classList.contains("is-in-view")) {
      const shift = reduceMotion.matches ? 0 : Math.min(windowNode.scrollY * 0.045, windowNode.innerWidth < 800 ? 14 : 38);
      hero.style.setProperty("--stage-shift", `${shift}px`);
    }
  };
  const scheduleScrollPaint = () => {
    if (!scrollFrame) scrollFrame = windowNode.requestAnimationFrame(paintScrollState);
  };
  windowNode.addEventListener("scroll", scheduleScrollPaint, { passive: true });
  windowNode.addEventListener("resize", scheduleScrollPaint, { passive: true });
  paintScrollState();

  let revealObserver;
  const revealEverything = () => {
    root.classList.remove("motion-ready");
    revealElements.forEach(element => element.classList.add("is-visible"));
    revealObserver?.disconnect();
  };

  if ("IntersectionObserver" in windowNode) {
    if (!reduceMotion.matches) {
      documentNode.querySelectorAll(".repository-grid, .feature-grid, .latest-research-grid, .credentials-grid").forEach(group => {
        Array.from(group.children).forEach((child, index) => {
          child.style.setProperty("--reveal-delay", `${(index % 2) * 55}ms`);
        });
      });
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -24px 0px", threshold: 0 });

      // Above-the-fold copy is readable on the first paint.
      revealElements.forEach(element => {
        if (element.getBoundingClientRect().top < windowNode.innerHeight) {
          element.classList.add("is-visible");
        } else {
          revealObserver.observe(element);
        }
      });
      root.classList.add("motion-ready");
    } else {
      revealEverything();
    }

    // The CSS gradient is paused outside the hero and whenever the tab is hidden.
    const heroObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle("is-in-view", entry.isIntersecting);
        if (entry.isIntersecting) scheduleScrollPaint();
        else resetArtwork();
      });
    });
    if (hero) heroObserver.observe(hero);

    const chapterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navigationLinks.forEach(link => {
          const current = link.hash === `#${entry.target.id}`;
          link.classList.toggle("is-active", current);
          if (current) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
    documentNode.querySelectorAll("[data-chapter]").forEach(section => chapterObserver.observe(section));
  }

  // Small charts animate once. Without enhancement setup every chart is fully drawn.
  const visuals = Array.from(documentNode.querySelectorAll(".feature-visual, .risk-console, .research-console, .performance-chart"));
  let visualObserver;
  const finishVisuals = () => {
    root.classList.remove("effects-ready");
    visuals.forEach(visual => visual.classList.add("is-visual-visible"));
    visualObserver?.disconnect();
  };
  if ("IntersectionObserver" in windowNode && !reduceMotion.matches) {
    visualObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visual-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
    visuals.forEach(visual => {
      visual.classList.add("visual-reveal");
      visual.querySelectorAll(".frontier-path, .research-path, .portfolio-line").forEach(path => path.setAttribute("pathLength", "1"));
      visualObserver.observe(visual);
    });
    root.classList.add("effects-ready");
  }

  // Separate from the float/scroll layers; only fine pointers can activate this.
  const artwork = documentNode.querySelector(".hero-artwork");
  const finePointer = windowNode.matchMedia("(hover: hover) and (pointer: fine)");
  if (artwork) {
    let pointerFrame = 0;
    let bounds;
    let pointerX = 0;
    let pointerY = 0;
    const canInteract = event => finePointer.matches && !reduceMotion.matches && !documentNode.hidden && event.pointerType !== "touch";
    const paintArtwork = () => {
      pointerFrame = 0;
      if (!bounds || !finePointer.matches || reduceMotion.matches || documentNode.hidden) return;
      const x = Math.max(-1, Math.min((pointerX - bounds.left) / bounds.width * 2 - 1, 1));
      const y = Math.max(-1, Math.min((pointerY - bounds.top) / bounds.height * 2 - 1, 1));
      artwork.style.setProperty("--art-rx", `${-y * 2.2}deg`);
      artwork.style.setProperty("--art-ry", `${x * 3.2}deg`);
      artwork.style.setProperty("--art-x", `${x * 5}px`);
      artwork.style.setProperty("--art-y", `${y * 3}px`);
      artwork.style.setProperty("--light-x", `${pointerX - bounds.left}px`);
      artwork.style.setProperty("--light-y", `${pointerY - bounds.top}px`);
      artwork.classList.add("is-interacting");
    };
    resetArtwork = () => {
      if (pointerFrame) windowNode.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      bounds = undefined;
      artwork.classList.remove("is-interacting");
      ["--art-rx", "--art-ry", "--art-x", "--art-y"].forEach(property => artwork.style.removeProperty(property));
    };
    artwork.addEventListener("pointermove", event => {
      if (!canInteract(event)) return;
      if (!bounds) bounds = artwork.getBoundingClientRect();
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = windowNode.requestAnimationFrame(paintArtwork);
    }, { passive: true });
    artwork.addEventListener("pointerleave", resetArtwork);
    artwork.addEventListener("pointercancel", resetArtwork);
    finePointer.addEventListener("change", resetArtwork);
  }

  const syncMotion = () => {
    root.classList.toggle("is-paused", documentNode.hidden || reduceMotion.matches);
    resetArtwork();
    if (reduceMotion.matches) hero?.style.setProperty("--stage-shift", "0px");
    if (reduceMotion.matches) {
      revealEverything();
      finishVisuals();
    }
  };
  documentNode.addEventListener("visibilitychange", syncMotion);
  reduceMotion.addEventListener("change", syncMotion);
  syncMotion();

  const menuButton = documentNode.querySelector(".menu-button");
  const mobileNavigation = documentNode.querySelector(".mobile-nav");
  if (menuButton && mobileNavigation) {
    const mobileLinks = Array.from(mobileNavigation.querySelectorAll("a"));
    const setMenuState = (open, returnFocus = false) => {
      body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      mobileNavigation.setAttribute("aria-hidden", String(!open));
      mobileNavigation.classList.toggle("is-open", open);
      mobileNavigation.inert = !open;
      if (main) main.inert = open;
      if (open) mobileLinks[0]?.focus();
      else if (returnFocus) menuButton.focus();
    };
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      setMenuState(!open, open);
    });
    mobileLinks.forEach(link => {
      link.addEventListener("click", () => {
        setMenuState(false);
        const destination = documentNode.getElementById(link.hash.slice(1));
        if (destination) {
          destination.setAttribute("tabindex", "-1");
          destination.focus({ preventScroll: true });
        }
      });
    });
    documentNode.addEventListener("keydown", event => {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuState(false, true);
      } else if (event.key === "Tab") {
        const first = menuButton;
        const last = mobileLinks[mobileLinks.length - 1];
        if (event.shiftKey && documentNode.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && documentNode.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    windowNode.matchMedia("(min-width: 1101px)").addEventListener("change", event => {
      if (event.matches) setMenuState(false);
    });
  }

  const dialog = documentNode.querySelector("#credential-dialog");
  const closeButton = documentNode.querySelector(".credential-dialog-close");
  const image = documentNode.querySelector("#credential-dialog-image");
  const issuer = documentNode.querySelector("#credential-dialog-issuer");
  const title = documentNode.querySelector("#credential-dialog-title");
  const detail = documentNode.querySelector("#credential-dialog-detail");
  const request = documentNode.querySelector("#credential-dialog-request");
  let activeTrigger;
  if (dialog && closeButton && image && issuer && title && detail && request) {
    documentNode.querySelectorAll(".credential-trigger").forEach(trigger => {
      trigger.addEventListener("click", () => {
        const data = trigger.dataset;
        if (!data.issuer || !data.title || !data.detail || !data.image) return;
        image.src = data.image;
        image.alt = `${data.title} certificate awarded to Kunal Singh`;
        issuer.textContent = data.issuer;
        title.textContent = data.title;
        detail.textContent = data.detail;
        request.href = `mailto:ks0000477@gmail.com?subject=${encodeURIComponent(`Credential Verification - ${data.title}`)}`;
        activeTrigger = trigger;
        body.classList.add("dialog-open");
        dialog.showModal();
        closeButton.focus();
      });
    });
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      body.classList.remove("dialog-open");
      image.removeAttribute("src");
      image.alt = "";
      activeTrigger?.focus();
      activeTrigger = null;
    });
  }
};

initializeSite(document, window);
