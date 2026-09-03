/**
 * Neat Fleets — auth.js
 * Drives the Sign In / Create Account / Verify / Forgot Password page.
 */
(function () {
    "use strict";

    const API_BASE = (window.NEATFLEETS_CONFIG || {}).apiBase || "";
    const NF = window.NeatFleets;

    // Redirect if already signed in
    if (NF && NF.isSignedIn()) {
        const redirect = new URLSearchParams(window.location.search).get("redirect") || "account.html";
        window.location.replace(redirect);
        return;
    }

    // ── Panel routing ─────────────────────────────────────────────────────────
    let pendingEmail = ""; // saved across confirm / forgot flows

    function showPanel(name) {
        document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
        const panel = document.getElementById("panel-" + name);
        if (panel) panel.classList.add("active");

        // Keep tabs in sync for signin/signup
        document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
        const tab = document.getElementById("tab-" + name);
        if (tab) {
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
        }

        clearMessage();
    }

    // Check URL param on load
    const initMode = new URLSearchParams(window.location.search).get("mode") || "signin";
    showPanel(initMode === "signup" ? "signup" : "signin");

    // ── Tabs ──────────────────────────────────────────────────────────────────
    document.querySelectorAll(".auth-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.id.replace("tab-", "");
            showPanel(target);
        });
    });

    document.querySelectorAll(".auth-switch-link").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            showPanel(link.dataset.show);
        });
    });

    // ── Message banner ────────────────────────────────────────────────────────
    function showMessage(msg, type = "error") {
        const el = document.getElementById("auth-message");
        if (!el) return;
        el.textContent = msg;
        el.className = "auth-message " + (type === "success" ? "is-success" : "is-error");
        el.hidden = false;
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearMessage() {
        const el = document.getElementById("auth-message");
        if (el) { el.hidden = true; el.textContent = ""; }
    }

    // ── Loading state on buttons ──────────────────────────────────────────────
    function setLoading(btnId, on) {
        const btn   = document.getElementById(btnId);
        if (!btn) return;
        const label = btn.querySelector(".btn-label");
        const spin  = btn.querySelector(".btn-spin");
        btn.disabled = on;
        if (spin) spin.hidden = !on;
        if (label && on)  label.style.opacity = ".5";
        if (label && !on) label.style.opacity = "";
    }

    // ── Field error helpers ───────────────────────────────────────────────────
    function setFieldErr(id, msg) {
        const input = document.getElementById(id);
        const errEl = document.getElementById(id + "-err");
        if (input) input.classList.toggle("field-error", !!msg);
        if (errEl) errEl.textContent = msg || "";
    }

    function clearFieldErrs(...ids) {
        ids.forEach(id => setFieldErr(id, ""));
    }

    // ── API helper ────────────────────────────────────────────────────────────
    async function authPost(action, payload) {
        const res  = await fetch(`${API_BASE}/api/auth/${action}`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
    }

    // ── Dev mode guard ────────────────────────────────────────────────────────
    function isDevMode() {
        return !API_BASE || API_BASE.includes("YOUR_API_GATEWAY");
    }

    // ── SIGN IN ───────────────────────────────────────────────────────────────
    document.getElementById("form-signin").addEventListener("submit", async e => {
        e.preventDefault();
        clearMessage();
        clearFieldErrs("si-email", "si-password");

        const email    = document.getElementById("si-email").value.trim();
        const password = document.getElementById("si-password").value;

        let valid = true;
        if (!email)    { setFieldErr("si-email", "Email is required."); valid = false; }
        if (!password) { setFieldErr("si-password", "Password is required."); valid = false; }
        if (!valid) return;

        if (isDevMode()) {
            // Dev mode: simulate a successful sign-in
            NF.saveSession({
                accessToken:  "dev-access-token",
                idToken:      "dev-id-token",
                refreshToken: "dev-refresh-token",
                expiresIn:    3600,
                user: { email, name: "Dev User", phone: "", sub: "dev-sub" },
            });
            window.location.replace("account.html");
            return;
        }

        setLoading("btn-signin", true);
        try {
            const { ok, data } = await authPost("signin", { email, password });
            if (ok) {
                NF.saveSession(data);
                const redirect = new URLSearchParams(window.location.search).get("redirect") || "account.html";
                window.location.replace(redirect);
            } else {
                showMessage(data.error || "Sign in failed. Please try again.");
                if (data.error && data.error.includes("verify")) {
                    pendingEmail = email;
                    setTimeout(() => {
                        showMessage("Your email isn't verified yet. Enter the code we sent you.", "error");
                        showPanel("confirm");
                    }, 1200);
                }
            }
        } catch {
            showMessage("A network error occurred. Please check your connection.");
        } finally {
            setLoading("btn-signin", false);
        }
    });

    // ── CREATE ACCOUNT ────────────────────────────────────────────────────────
    document.getElementById("form-signup").addEventListener("submit", async e => {
        e.preventDefault();
        clearMessage();
        clearFieldErrs("su-name", "su-email", "su-password");

        const name     = document.getElementById("su-name").value.trim();
        const email    = document.getElementById("su-email").value.trim();
        const phone    = document.getElementById("su-phone").value.trim();
        const password = document.getElementById("su-password").value;

        let valid = true;
        if (!name)     { setFieldErr("su-name", "Full name is required."); valid = false; }
        if (!email || !email.includes("@")) { setFieldErr("su-email", "Valid email is required."); valid = false; }
        if (password.length < 8) { setFieldErr("su-password", "Password must be at least 8 characters."); valid = false; }
        if (!valid) return;

        if (isDevMode()) {
            showMessage("⚙️ Dev mode: connect your API Gateway to enable real accounts. Showing confirmation step for demo.", "success");
            pendingEmail = email;
            setTimeout(() => showPanel("confirm"), 1200);
            return;
        }

        setLoading("btn-signup", true);
        try {
            const { ok, data } = await authPost("signup", { name, email, phone, password });
            if (ok) {
                pendingEmail = email;
                showPanel("confirm");
                document.getElementById("confirm-msg").textContent =
                    `We sent a 6-digit code to ${email}. Enter it below to activate your account.`;
                showMessage("Account created! Check your email for a verification code.", "success");
            } else {
                showMessage(data.error || "Sign up failed. Please try again.");
            }
        } catch {
            showMessage("A network error occurred. Please check your connection.");
        } finally {
            setLoading("btn-signup", false);
        }
    });

    // ── CONFIRM EMAIL ─────────────────────────────────────────────────────────
    document.getElementById("form-confirm").addEventListener("submit", async e => {
        e.preventDefault();
        clearMessage();
        clearFieldErrs("cf-code");

        const code = document.getElementById("cf-code").value.trim();
        if (!code || code.length < 6) {
            setFieldErr("cf-code", "Please enter the 6-digit code from your email.");
            return;
        }

        if (isDevMode()) {
            showMessage("Email verified! You can now sign in.", "success");
            setTimeout(() => showPanel("signin"), 1400);
            return;
        }

        setLoading("btn-confirm", true);
        try {
            const { ok, data } = await authPost("confirm", { email: pendingEmail, code });
            if (ok) {
                showMessage("Email verified! You can now sign in.", "success");
                setTimeout(() => showPanel("signin"), 1400);
            } else {
                setFieldErr("cf-code", data.error || "Invalid code. Please try again.");
            }
        } catch {
            showMessage("A network error occurred.");
        } finally {
            setLoading("btn-confirm", false);
        }
    });

    // Resend code
    document.getElementById("resend-link").addEventListener("click", async e => {
        e.preventDefault();
        if (!pendingEmail) { showMessage("We lost track of your email. Please go back and sign up again."); return; }
        if (isDevMode()) { showMessage("Dev mode: code would be resent to " + pendingEmail, "success"); return; }

        try {
            const { ok, data } = await authPost("resend-code", { email: pendingEmail });
            showMessage(ok ? data.message : (data.error || "Could not resend code."), ok ? "success" : "error");
        } catch {
            showMessage("A network error occurred.");
        }
    });

    // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
    document.getElementById("forgot-link").addEventListener("click", e => {
        e.preventDefault();
        const email = document.getElementById("si-email").value.trim();
        if (email) {
            document.getElementById("fp-email").value = email;
            pendingEmail = email;
        }
        showPanel("forgot");
    });

    document.getElementById("form-forgot").addEventListener("submit", async e => {
        e.preventDefault();
        clearMessage();
        clearFieldErrs("fp-email");

        const email = document.getElementById("fp-email").value.trim();
        if (!email) { setFieldErr("fp-email", "Email is required."); return; }

        if (isDevMode()) {
            pendingEmail = email;
            showMessage("Reset code sent (dev mode demo).", "success");
            setTimeout(() => showPanel("reset"), 1000);
            return;
        }

        setLoading("btn-forgot", true);
        try {
            const { ok, data } = await authPost("forgot-password", { email });
            if (ok) {
                pendingEmail = email;
                showMessage(data.message, "success");
                setTimeout(() => showPanel("reset"), 1200);
            } else {
                showMessage(data.error || "Could not send reset code.");
            }
        } catch {
            showMessage("A network error occurred.");
        } finally {
            setLoading("btn-forgot", false);
        }
    });

    // ── RESET PASSWORD ────────────────────────────────────────────────────────
    document.getElementById("form-reset").addEventListener("submit", async e => {
        e.preventDefault();
        clearMessage();
        clearFieldErrs("rp-code", "rp-password");

        const code     = document.getElementById("rp-code").value.trim();
        const password = document.getElementById("rp-password").value;

        let valid = true;
        if (!code)          { setFieldErr("rp-code", "Code is required."); valid = false; }
        if (password.length < 8) { setFieldErr("rp-password", "Password must be at least 8 characters."); valid = false; }
        if (!valid) return;

        if (isDevMode()) {
            showMessage("Password reset (dev mode). You can now sign in.", "success");
            setTimeout(() => showPanel("signin"), 1200);
            return;
        }

        setLoading("btn-reset", true);
        try {
            const { ok, data } = await authPost("reset-password", {
                email: pendingEmail, code, password,
            });
            if (ok) {
                showMessage("Password reset! You can now sign in with your new password.", "success");
                setTimeout(() => showPanel("signin"), 1400);
            } else {
                showMessage(data.error || "Could not reset password.");
            }
        } catch {
            showMessage("A network error occurred.");
        } finally {
            setLoading("btn-reset", false);
        }
    });

    // ── Password visibility toggle ────────────────────────────────────────────
    document.querySelectorAll(".af-eye").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isPass = input.type === "password";
            input.type = isPass ? "text" : "password";
            btn.textContent = isPass ? "🙈" : "👁";
            btn.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
        });
    });

    // ── Clear field errors on input ───────────────────────────────────────────
    ["si-email","si-password","su-name","su-email","su-password","cf-code","fp-email","rp-code","rp-password"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("input", () => setFieldErr(id, ""));
        });

})();
