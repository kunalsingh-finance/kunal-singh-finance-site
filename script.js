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
 * @typedef {Object} CredentialData
 * @property {string} issuer
 * @property {string} title
 * @property {string} detail
 * @property {string} image
 */

/**
 * @param {HTMLButtonElement} trigger
 * @returns {CredentialData}
 */
const getCredentialData = (trigger) => {
  const issuer = trigger.dataset.issuer;
  const title = trigger.dataset.title;
  const detail = trigger.dataset.detail;
  const image = trigger.dataset.image;

  if (issuer === undefined || title === undefined || detail === undefined || image === undefined) {
    throw new TypeError(`Credential trigger is missing required data: ${trigger.textContent}`);
  }

  return {
    issuer,
    title,
    detail,
    image,
  };
};

/**
 * @param {HTMLImageElement} imageElement
 * @param {HTMLElement} issuerElement
 * @param {HTMLElement} titleElement
 * @param {HTMLElement} detailElement
 * @param {HTMLAnchorElement} requestElement
 * @param {CredentialData} data
 * @returns {void}
 */
const populateCredentialDialog = (
  imageElement,
  issuerElement,
  titleElement,
  detailElement,
  requestElement,
  data,
) => {
  imageElement.src = data.image;
  imageElement.alt = `${data.title} certificate awarded to Kunal Singh`;
  issuerElement.textContent = data.issuer;
  titleElement.textContent = data.title;
  detailElement.textContent = data.detail;
  requestElement.href =
    `mailto:ks0000477@gmail.com?subject=${encodeURIComponent(`Credential Verification - ${data.title}`)}`;
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
  const credentialDialog = documentNode.querySelector("#credential-dialog");
  const credentialDialogClose = documentNode.querySelector(".credential-dialog-close");
  const credentialDialogImage = documentNode.querySelector("#credential-dialog-image");
  const credentialDialogIssuer = documentNode.querySelector("#credential-dialog-issuer");
  const credentialDialogTitle = documentNode.querySelector("#credential-dialog-title");
  const credentialDialogDetail = documentNode.querySelector("#credential-dialog-detail");
  const credentialDialogRequest = documentNode.querySelector("#credential-dialog-request");
  const credentialTriggers = documentNode.querySelectorAll(".credential-trigger");
  /** @type {HTMLButtonElement | null} */
  let activeCredentialTrigger = null;

  if (!(header instanceof HTMLElement)) {
    throw new TypeError("Expected .site-header to be an HTMLElement.");
  }

  if (!(menuButton instanceof HTMLButtonElement)) {
    throw new TypeError("Expected .menu-button to be an HTMLButtonElement.");
  }

  if (!(mobileNavigation instanceof HTMLElement)) {
    throw new TypeError("Expected .mobile-nav to be an HTMLElement.");
  }

  if (!(credentialDialog instanceof HTMLDialogElement)) {
    throw new TypeError("Expected #credential-dialog to be an HTMLDialogElement.");
  }

  if (!(credentialDialogClose instanceof HTMLButtonElement)) {
    throw new TypeError("Expected .credential-dialog-close to be an HTMLButtonElement.");
  }

  if (!(credentialDialogImage instanceof HTMLImageElement)) {
    throw new TypeError("Expected #credential-dialog-image to be an HTMLImageElement.");
  }

  if (!(credentialDialogIssuer instanceof HTMLElement)) {
    throw new TypeError("Expected #credential-dialog-issuer to be an HTMLElement.");
  }

  if (!(credentialDialogTitle instanceof HTMLElement)) {
    throw new TypeError("Expected #credential-dialog-title to be an HTMLElement.");
  }

  if (!(credentialDialogDetail instanceof HTMLElement)) {
    throw new TypeError("Expected #credential-dialog-detail to be an HTMLElement.");
  }

  if (!(credentialDialogRequest instanceof HTMLAnchorElement)) {
    throw new TypeError("Expected #credential-dialog-request to be an HTMLAnchorElement.");
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

  credentialTriggers.forEach((element) => {
    if (!(element instanceof HTMLButtonElement)) {
      throw new TypeError("Expected each .credential-trigger to be an HTMLButtonElement.");
    }

    element.addEventListener("click", () => {
      const credentialData = getCredentialData(element);

      populateCredentialDialog(
        credentialDialogImage,
        credentialDialogIssuer,
        credentialDialogTitle,
        credentialDialogDetail,
        credentialDialogRequest,
        credentialData,
      );
      activeCredentialTrigger = element;
      body.classList.add("dialog-open");
      credentialDialog.showModal();
    });
  });

  credentialDialogClose.addEventListener("click", () => {
    credentialDialog.close();
  });

  credentialDialog.addEventListener("click", (event) => {
    if (event.target === credentialDialog) {
      credentialDialog.close();
    }
  });

  credentialDialog.addEventListener("close", () => {
    body.classList.remove("dialog-open");
    credentialDialogImage.removeAttribute("src");
    activeCredentialTrigger?.focus();
    activeCredentialTrigger = null;
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
