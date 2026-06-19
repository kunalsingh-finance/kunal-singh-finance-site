"use strict";

/**
 * @param {number} value
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

/**
 * @param {number} scrollTop
 * @param {number} scrollHeight
 * @param {number} viewportHeight
 * @returns {number}
 */
const calculateScrollProgress = (scrollTop, scrollHeight, viewportHeight) => {
  const availableDistance = scrollHeight - viewportHeight;

  if (availableDistance <= 0) {
    return 0;
  }

  return clamp((scrollTop / availableDistance) * 100, 0, 100);
};

/**
 * @param {number} scrollTop
 * @param {number} viewportHeight
 * @returns {number}
 */
const calculateHeroOffset = (scrollTop, viewportHeight) => {
  const maximumOffset = Math.min(viewportHeight * 0.16, 140);
  return clamp(scrollTop * 0.16, 0, maximumOffset);
};

/**
 * @param {HTMLElement} root
 * @param {number} progress
 * @param {number} heroOffset
 * @returns {void}
 */
const updateScrollStyles = (root, progress, heroOffset) => {
  root.style.setProperty("--scroll-progress", `${progress}%`);
  root.style.setProperty("--hero-offset", `${heroOffset}px`);
};

/**
 * @param {HTMLElement} header
 * @param {number} scrollTop
 * @returns {void}
 */
const updateHeader = (header, scrollTop) => {
  header.classList.toggle("is-scrolled", scrollTop > 24);
};

/**
 * @param {HTMLElement} body
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} navigation
 * @param {boolean} isOpen
 * @returns {void}
 */
const setMenuState = (body, button, navigation, isOpen) => {
  body.classList.toggle("menu-open", isOpen);
  button.setAttribute("aria-expanded", String(isOpen));
  button.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  navigation.classList.toggle("is-open", isOpen);
};

/**
 * @param {Element} element
 * @returns {void}
 */
const revealElement = (element) => {
  element.classList.add("is-visible");
};

/**
 * @param {NodeListOf<Element>} elements
 * @returns {IntersectionObserver}
 */
const observeReveals = (elements) => {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => {
          revealElement(entry.target);
          activeObserver.unobserve(entry.target);
        });
    },
    {
      root: null,
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.08,
    },
  );

  elements.forEach((element) => observer.observe(element));
  return observer;
};

/**
 * @param {Document} documentNode
 * @param {Window} windowNode
 * @returns {void}
 */
const initializeSite = (documentNode, windowNode) => {
  const root = documentNode.documentElement;
  const body = documentNode.body;
  const header = documentNode.querySelector(".site-header");
  const menuButton = documentNode.querySelector(".menu-button");
  const mobileNavigation = documentNode.querySelector(".mobile-nav");
  const revealElements = documentNode.querySelectorAll("[data-reveal]");

  if (!(header instanceof HTMLElement)) {
    throw new TypeError("Expected .site-header to be an HTMLElement.");
  }

  if (!(menuButton instanceof HTMLButtonElement)) {
    throw new TypeError("Expected .menu-button to be an HTMLButtonElement.");
  }

  if (!(mobileNavigation instanceof HTMLElement)) {
    throw new TypeError("Expected .mobile-nav to be an HTMLElement.");
  }

  const updateScrollState = () => {
    const scrollTop = windowNode.scrollY;
    const progress = calculateScrollProgress(
      scrollTop,
      documentNode.documentElement.scrollHeight,
      windowNode.innerHeight,
    );
    const heroOffset = calculateHeroOffset(scrollTop, windowNode.innerHeight);

    updateScrollStyles(root, progress, heroOffset);
    updateHeader(header, scrollTop);
  };

  const closeMenu = () => {
    setMenuState(body, menuButton, mobileNavigation, false);
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuState(body, menuButton, mobileNavigation, !isOpen);
  });

  mobileNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  windowNode.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  windowNode.addEventListener("scroll", updateScrollState, { passive: true });
  windowNode.addEventListener("resize", updateScrollState);

  observeReveals(revealElements);
  updateScrollState();
};

initializeSite(document, window);
