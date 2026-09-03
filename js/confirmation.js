/**
 * Neat Fleets — Confirmation page
 * Polls the bookings API until the booking shows PAID status,
 * then populates the confirmation card.
 */

(function () {
    "use strict";

    const API_BASE = (window.NEATFLEETS_CONFIG || {}).apiBase || "";

    // DOM refs
    const $loading = document.getElementById("conf-loading");
    const $error   = document.getElementById("conf-error");
    const $success = document.getElementById("conf-success");
    const $errMsg  = document.getElementById("conf-error-msg");

    // ── Helpers ──────────────────────────────────────────────────────
    function show(el)  { el.hidden = false; }
    function hide(el)  { el.hidden = true;  }

    function formatDate(str) {
        if (!str) return "—";
        const d = new Date(str + "T12:00:00"); // avoid TZ shift
        return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    function formatTime(str) {
        if (!str) return "—";
        const [h, m] = str.split(":");
        const hour   = parseInt(h, 10);
        const ampm   = hour >= 12 ? "PM" : "AM";
        const h12    = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    function formatCurrency(cents) {
        if (cents == null) return "—";
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
    }

    function serviceLabel(val) {
        const map = {
            "party":     "After-Party Trash Pickup",
            "household": "Household Trash Removal",
            "business":  "Business Trash Services"
        };
        return map[val] || val || "—";
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val || "—";
    }

    // ── Render success state ──────────────────────────────────────────
    function renderSuccess(data) {
        const totalCents   = data.estimateTotal   || 0;
        const depositCents = data.chargeAmount     || 0;
        const balanceCents = Math.max(0, totalCents - depositCents);

        // Reference
        const refEl = document.getElementById("conf-ref-display");
        if (refEl) refEl.textContent = "Booking ref: " + (data.bookingId || "").toUpperCase();

        // Details
        setText("conf-name",     data.name);
        setText("conf-email",    data.email);
        setText("conf-phone",    data.phone || "—");
        setText("conf-service",  serviceLabel(data.serviceType));
        setText("conf-location", data.location);
        setText("conf-date",     formatDate(data.pickupDate));
        setText("conf-time",     formatTime(data.pickupTime));

        // Status pill
        const pill = document.getElementById("conf-status");
        if (pill) pill.textContent = data.status || "CONFIRMED";

        // Payment
        setText("conf-total",   formatCurrency(totalCents));
        setText("conf-paid",    formatCurrency(depositCents));
        setText("conf-balance", formatCurrency(balanceCents));

        // Switch states
        hide($loading);
        hide($error);
        show($success);
    }

    // ── Render error state ────────────────────────────────────────────
    function renderError(msg) {
        if ($errMsg) $errMsg.textContent = msg || "Something went wrong.";
        hide($loading);
        hide($success);
        show($error);
    }

    // ── Poll until PAID or max attempts ──────────────────────────────
    async function pollBooking(bookingId, attempt, maxAttempts, delayMs) {
        if (attempt > maxAttempts) {
            renderError(
                "We're still waiting for payment confirmation. If you completed your payment, check your email — your booking may still be processing. Booking ref: " + bookingId
            );
            return;
        }

        try {
            const res  = await fetch(API_BASE + "/api/bookings/" + encodeURIComponent(bookingId));
            const data = await res.json();

            if (!res.ok) {
                renderError(data.message || "Booking not found.");
                return;
            }

            if (data.status === "PAID" || data.status === "CONFIRMED" || data.stripePaid) {
                renderSuccess(data);
            } else {
                // Keep polling
                setTimeout(() => pollBooking(bookingId, attempt + 1, maxAttempts, delayMs), delayMs);
            }
        } catch (err) {
            console.error("Poll error:", err);
            renderError("A network error occurred while loading your booking. Please refresh the page.");
        }
    }

    // ── Init ─────────────────────────────────────────────────────────
    function init() {
        const params    = new URLSearchParams(window.location.search);
        const bookingId = params.get("booking_id");

        if (!bookingId) {
            renderError("No booking reference found in the URL. If you just completed a payment, check your email for confirmation.");
            return;
        }

        if (!API_BASE || API_BASE.includes("YOUR_API_GATEWAY")) {
            // Dev mode — show a demo card
            renderSuccess({
                bookingId:    bookingId,
                status:       "CONFIRMED",
                name:         "Joe Customer",
                email:        "joe@example.com",
                phone:        "(555) 000-0000",
                serviceType:  "party",
                location:     "123 Main St, Hollister, CA",
                pickupDate:   "2025-09-15",
                pickupTime:   "10:00",
                estimateTotal: 18000,
                chargeAmount:  5400,
                stripePaid:    true
            });
            return;
        }

        // Real polling: up to 10 attempts, 2s apart
        pollBooking(bookingId, 1, 10, 2000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Footer year
    const yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();

})();
