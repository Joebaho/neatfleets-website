/**
 * main.js — Site-wide JavaScript for Neat Fleets
 * Handles: navigation menu, footer year, hero auth state
 */

// ── Mobile navigation toggle ──────────────────────────────────────────────────
const menuToggle = document.querySelector(".menu-toggle");
const siteNav    = document.querySelector(".site-nav");
const siteHeader = document.getElementById("site-header");

if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = siteNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        // Toggle menu-open on header for burger animation via CSS
        if (siteHeader) siteHeader.classList.toggle("menu-open", isOpen);
    });

    // Close nav when a link inside site-nav is clicked (mobile)
    siteNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            siteNav.classList.remove("is-open");
            if (siteHeader) siteHeader.classList.remove("menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });

    // Close nav when clicking outside it
    document.addEventListener("click", (e) => {
        if (siteNav.classList.contains("is-open") &&
            !siteNav.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            siteNav.classList.remove("is-open");
            if (siteHeader) siteHeader.classList.remove("menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
}

// ── Scroll: add .scrolled to header ──────────────────────────────────────────
(function initScrollHeader() {
    const hdr = document.getElementById("site-header");
    if (!hdr) return;
    const update = () => hdr.classList.toggle("scrolled", window.scrollY > 20);
    window.addEventListener("scroll", update, { passive: true });
    update();
})();

// ── Footer year ───────────────────────────────────────────────────────────────
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Hero auth-path toggle ─────────────────────────────────────────────────────
(function initHeroAuthPaths() {
    const pathsEl  = document.getElementById("hero-auth-paths");
    const signedEl = document.getElementById("hero-signed-in");
    const nameEl   = document.getElementById("hero-user-name");

    if (!pathsEl || !signedEl) return;

    const NF = window.NeatFleets;
    if (NF && NF.isSignedIn()) {
        const user = NF.getUser();
        pathsEl.style.display = "none";
        signedEl.style.display = "";
        if (nameEl && user) {
            nameEl.textContent = (user.name || user.email || "").split(" ")[0];
        }
    } else {
        pathsEl.style.display = "";
        signedEl.style.display = "none";
    }
})();

// ── Wire up auth nav (Sign In / My Account) ───────────────────────────────────
if (window.NeatFleets && typeof window.NeatFleets.renderAuthNav === "function") {
    window.NeatFleets.renderAuthNav();
}
