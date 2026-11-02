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

  // No permanent render loop: scroll and resize events share one pending frame.
  const paintScrollState = () => {
    scrollFrame = 0;
    const available = root.scrollHeight - windowNode.innerHeight;
    const progress = available > 0 ? Math.max(0, Math.min(windowNode.scrollY / available, 1)) : 0;
    root.style.setProperty("--scroll-progress", String(progress));
    header?.classList.toggle("is-scrolled", windowNode.scrollY > 16);
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
      entries.forEach(entry => entry.target.classList.toggle("is-in-view", entry.isIntersecting));
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

  const syncMotion = () => {
    root.classList.toggle("is-paused", documentNode.hidden || reduceMotion.matches);
    if (reduceMotion.matches) revealEverything();
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
