/**
 * Neat Fleets — Shared auth state
 * Tokens are stored in sessionStorage (cleared when the browser tab closes).
 * Never stored in localStorage — avoids XSS persistence risk.
 *
 * Exports (attached to window.NeatFleets):
 *   isSignedIn()       → boolean
 *   getUser()          → { email, name, phone, sub } | null
 *   getAccessToken()   → string | null
 *   getRefreshToken()  → string | null
 *   saveSession(data)  → void   (called after signin)
 *   clearSession()     → void   (called on signout)
 *   refreshIfNeeded()  → Promise<boolean>
 *   signOut()          → Promise<void>
 */

(function () {
    "use strict";

    const API_BASE = (window.NEATFLEETS_CONFIG || {}).apiBase || "";
    const KEYS = {
        accessToken:  "nf_access",
        idToken:      "nf_id",
        refreshToken: "nf_refresh",
        expiresAt:    "nf_exp",
        user:         "nf_user",
    };

    function saveSession(data) {
        sessionStorage.setItem(KEYS.accessToken,  data.accessToken  || "");
        sessionStorage.setItem(KEYS.idToken,      data.idToken      || "");
        sessionStorage.setItem(KEYS.refreshToken, data.refreshToken || "");
        const exp = Date.now() + ((data.expiresIn || 3600) - 60) * 1000;
        sessionStorage.setItem(KEYS.expiresAt, String(exp));
        if (data.user) {
            sessionStorage.setItem(KEYS.user, JSON.stringify(data.user));
        }
    }

    function clearSession() {
        Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
    }

    function isSignedIn() {
        return !!sessionStorage.getItem(KEYS.accessToken);
    }

    function getUser() {
        const raw = sessionStorage.getItem(KEYS.user);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    function getAccessToken() {
        return sessionStorage.getItem(KEYS.accessToken) || null;
    }

    function getRefreshToken() {
        return sessionStorage.getItem(KEYS.refreshToken) || null;
    }

    function isExpired() {
        const exp = parseInt(sessionStorage.getItem(KEYS.expiresAt) || "0", 10);
        return Date.now() >= exp;
    }

    async function refreshIfNeeded() {
        if (!isSignedIn()) return false;
        if (!isExpired()) return true;

        const refreshToken = getRefreshToken();
        if (!refreshToken) { clearSession(); return false; }

        try {
            const res  = await fetch(API_BASE + "/api/auth/refresh", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ refreshToken }),
            });
            if (!res.ok) { clearSession(); return false; }
            const data = await res.json();
            // Refresh doesn't return a new refresh token — keep existing
            data.refreshToken = refreshToken;
            saveSession(data);
            return true;
        } catch {
            clearSession();
            return false;
        }
    }

    async function signOut() {
        const token = getAccessToken();
        if (token && API_BASE && !API_BASE.includes("YOUR_API_GATEWAY")) {
            try {
                await fetch(API_BASE + "/api/auth/signout", {
                    method:  "POST",
                    headers: {
                        "Content-Type":  "application/json",
                        "Authorization": "Bearer " + token,
                    },
                });
            } catch { /* ignore network errors on signout */ }
        }
        clearSession();
    }

    // ── Nav rendering ─────────────────────────────────────────────────────────
    // Call this on every page after DOMContentLoaded to wire up the auth nav state.
    function renderAuthNav() {
        const signInLink  = document.getElementById("nav-signin");
        const accountWrap = document.getElementById("nav-account");
        const accountName = document.getElementById("nav-account-name");
        const signOutBtn  = document.getElementById("nav-signout");

        if (!signInLink && !accountWrap) return;

        if (isSignedIn()) {
            const user = getUser();
            if (signInLink)  signInLink.style.display  = "none";
            if (accountWrap) accountWrap.style.display = "";
            if (accountName && user) {
                accountName.textContent = user.name ? user.name.split(" ")[0] : "My Account";
            }
        } else {
            if (signInLink)  signInLink.style.display  = "";
            if (accountWrap) accountWrap.style.display = "none";
        }

        if (signOutBtn) {
            signOutBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                await signOut();
                window.location.href = "index.html";
            });
        }

        // Dropdown toggle for account menu
        const dropTrigger = document.getElementById("nav-account-trigger");
        const dropMenu    = document.getElementById("nav-account-menu");
        if (dropTrigger && dropMenu) {
            dropTrigger.addEventListener("click", (e) => {
                e.stopPropagation();
                dropMenu.classList.toggle("open");
            });
            document.addEventListener("click", () => dropMenu.classList.remove("open"));
        }
    }

    // Expose on window
    window.NeatFleets = {
        isSignedIn,
        getUser,
        getAccessToken,
        getRefreshToken,
        saveSession,
        clearSession,
        refreshIfNeeded,
        signOut,
        renderAuthNav,
    };

    // Auto-render nav on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderAuthNav);
    } else {
        renderAuthNav();
    }

})();
