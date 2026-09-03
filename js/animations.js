/**
 * animations.js
 * Handles: scroll reveal, sticky header, mobile menu, smooth nav active state.
 */

(function () {
    "use strict";

    /* ── Sticky header ──────────────────────────────────────── */
    const header = document.getElementById("site-header");
    function updateHeader() {
        if (!header) return;
        header.classList.toggle("scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    /* ── Mobile menu ────────────────────────────────────────── */
    const toggle = document.querySelector(".menu-toggle");
    const nav    = document.getElementById("site-nav");

    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            const open = nav.classList.toggle("is-open");
            header.classList.toggle("menu-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            document.body.style.overflow = open ? "hidden" : "";
        });

        // Close on link click
        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                nav.classList.remove("is-open");
                header.classList.remove("menu-open");
                toggle.setAttribute("aria-expanded", "false");
                document.body.style.overflow = "";
            });
        });

        // Close on Escape
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && nav.classList.contains("is-open")) {
                nav.classList.remove("is-open");
                header.classList.remove("menu-open");
                toggle.setAttribute("aria-expanded", "false");
                document.body.style.overflow = "";
            }
        });
    }

    /* ── Active nav link on scroll ──────────────────────────── */
    const sections  = document.querySelectorAll("section[id]");
    const navLinks  = document.querySelectorAll(".nav-link[href^='#'], .nav-link[href='/']");

    function updateActiveLink() {
        let current = "";
        sections.forEach(sec => {
            const top = sec.getBoundingClientRect().top;
            if (top <= 120) current = sec.id;
        });

        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            link.classList.toggle(
                "active",
                href === `#${current}` || (current === "" && href === "/")
            );
        });
    }
    window.addEventListener("scroll", updateActiveLink, { passive: true });
    updateActiveLink();

    /* ── Scroll reveal ──────────────────────────────────────── */
    const revealEls = document.querySelectorAll(
        ".reveal-up, .reveal-fade, .reveal-left, .reveal-right"
    );

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

        revealEls.forEach(el => observer.observe(el));
    } else {
        // Fallback: show all
        revealEls.forEach(el => el.classList.add("visible"));
    }

    /* ── Animated number counter ────────────────────────────── */
    function animateCounter(el, target, duration) {
        const start = performance.now();
        const update = (time) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    const counters = document.querySelectorAll("[data-count]");
    if (counters.length) {
        const cObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target, +entry.target.dataset.count, 1800);
                    cObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(el => cObs.observe(el));
    }

    /* ── Footer year ────────────────────────────────────────── */
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ── Smooth parallax on hero bg ─────────────────────────── */
    const heroBgImg = document.querySelector(".hero-bg-img");
    if (heroBgImg) {
        window.addEventListener("scroll", () => {
            const scrolled = window.scrollY;
            heroBgImg.style.transform = `scale(1.08) translateY(${scrolled * 0.25}px)`;
        }, { passive: true });
    }

})();
