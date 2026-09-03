/**
 * Neat Fleets — account.js
 * My Account page: auth guard, booking history, sign-out.
 */
(function () {
    "use strict";

    const API_BASE = (window.NEATFLEETS_CONFIG || {}).apiBase || "";
    const NF = window.NeatFleets;

    const SERVICE_LABELS = {
        "party":     "After-Party Trash Pickup",
        "household": "Household Trash Removal",
        "business":  "Business Trash Services",
    };

    const STATUS_LABELS = {
        "DRAFT":            "Draft",
        "PAYMENT_PENDING":  "Awaiting Payment",
        "PAYMENT_FAILED":   "Payment Failed",
        "PAID":             "Paid",
        "CONFIRMED":        "Confirmed",
        "SCHEDULED":        "Scheduled",
        "IN_PROGRESS":      "In Progress",
        "COMPLETED":        "Completed",
        "CANCELLED":        "Cancelled",
    };

    function fmt(v) {
        try { return "$" + parseFloat(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
        catch { return "—"; }
    }

    function fmtDate(str) {
        if (!str) return "—";
        try {
            return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "long", day: "numeric", year: "numeric",
            });
        } catch { return str; }
    }

    function statusClass(s) {
        return "bh-status status-" + (s || "").toLowerCase().replace(/_/g, "_");
    }

    function renderBookingCard(b) {
        const statusLabel = STATUS_LABELS[b.status] || b.status || "Unknown";
        const serviceLabel = SERVICE_LABELS[b.serviceType] || b.serviceType || "Trash Removal";
        return `
            <div class="bh-card">
                <div class="bh-card-top">
                    <div>
                        <div class="bh-service">${escHtml(serviceLabel)}</div>
                        <div class="bh-date">${fmtDate(b.pickupDate)} at ${b.pickupTime || "—"}</div>
                    </div>
                    <span class="${statusClass(b.status)}">${escHtml(statusLabel)}</span>
                </div>
                <div class="bh-rows">
                    <div class="bh-row">
                        <span class="bh-row-label">Location</span>
                        <span class="bh-row-value">${escHtml(b.location || "—")}</span>
                    </div>
                    <div class="bh-row">
                        <span class="bh-row-label">Estimate</span>
                        <span class="bh-row-value">${fmt(b.estimateTotal)}</span>
                    </div>
                    <div class="bh-row">
                        <span class="bh-row-label">${b.chargeMode === "deposit" ? "Deposit paid" : "Amount paid"}</span>
                        <span class="bh-row-value">${b.stripePaid ? fmt(b.chargeAmount) : "—"}</span>
                    </div>
                    <div class="bh-row">
                        <span class="bh-row-label">Booking ref</span>
                        <span class="bh-row-value" style="font-family:monospace;font-size:.78rem;">
                            ${escHtml((b.bookingId || "").substring(0, 8).toUpperCase())}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g,"&amp;").replace(/</g,"&lt;")
            .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    async function loadBookings() {
        const bLoading = document.getElementById("bookings-loading");
        const bList    = document.getElementById("bookings-list");
        const bErr     = document.getElementById("bookings-error");

        const token = NF.getAccessToken();
        if (!token) return;

        // Dev mode
        if (!API_BASE || API_BASE.includes("YOUR_API_GATEWAY")) {
            bLoading.hidden = true;
            bList.hidden = false;
            bList.innerHTML = `
                <div class="booking-history-empty">
                    <div class="bhe-icon">⚙️</div>
                    <h3>Dev mode</h3>
                    <p>Connect your API Gateway endpoint to see real booking history.</p>
                    <a href="booking.html" class="btn btn-solid">Try a Booking</a>
                </div>`;
            return;
        }

        try {
            const res  = await fetch(API_BASE + "/api/my-bookings", {
                headers: { "Authorization": "Bearer " + token },
            });

            if (res.status === 401) {
                // Token expired — try refresh
                const refreshed = await NF.refreshIfNeeded();
                if (!refreshed) {
                    NF.clearSession();
                    window.location.replace("auth.html?redirect=account.html");
                    return;
                }
                return loadBookings(); // retry
            }

            const data = await res.json();
            bLoading.hidden = true;

            if (!res.ok) {
                bErr.textContent = data.error || "Could not load your bookings.";
                bErr.hidden = false;
                return;
            }

            const bookings = data.bookings || [];
            bList.hidden = false;

            if (bookings.length === 0) {
                bList.innerHTML = `
                    <div class="booking-history-empty">
                        <div class="bhe-icon">📭</div>
                        <h3>No bookings yet</h3>
                        <p>Once you book a pickup, it will appear here.</p>
                        <a href="booking.html" class="btn btn-solid">Book Your First Pickup</a>
                    </div>`;
            } else {
                bList.innerHTML = `<div class="booking-history-grid">${bookings.map(renderBookingCard).join("")}</div>`;
            }
        } catch {
            bLoading.hidden = true;
            bErr.textContent = "A network error occurred loading your bookings.";
            bErr.hidden = false;
        }
    }

    async function init() {
        const loading = document.getElementById("account-loading");
        const content = document.getElementById("account-content");

        // Auth guard
        await NF.refreshIfNeeded();
        if (!NF.isSignedIn()) {
            window.location.replace("auth.html?redirect=account.html");
            return;
        }

        loading.hidden = true;
        content.hidden = false;

        // Render user info
        const user = NF.getUser();
        if (user) {
            const firstName = (user.name || "").split(" ")[0] || "there";
            const greeting  = document.getElementById("greeting");
            const emailEl   = document.getElementById("account-email");
            if (greeting) greeting.textContent = "Welcome back, " + firstName + "!";
            if (emailEl)  emailEl.textContent  = user.email || "";
        }

        // Sign out button
        const signoutBtn = document.getElementById("signout-btn");
        if (signoutBtn) {
            signoutBtn.addEventListener("click", async () => {
                await NF.signOut();
                window.location.replace("/");
            });
        }

        // Footer year
        const yr = document.getElementById("year");
        if (yr) yr.textContent = new Date().getFullYear();

        // Load booking history
        loadBookings();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
