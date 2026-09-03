/**
 * Neat Fleets — Booking page JS
 * Handles: multi-step navigation, field validation, photo upload
 * (presigned S3 URLs), estimate calculation, Stripe payment redirect.
 */

(function () {
    "use strict";

    const API_BASE = (window.NEATFLEETS_CONFIG || {}).apiBase || "";

    // ── Pricing (mirrors server-side in create_booking/handler.py) ──
    const BASE_RATES = {
        "party-bagged":    180_00,   // cents
        "mixed-household": 210_00,
        "bins-overflow":   240_00,
        "light-bulk":      320_00
    };
    const DEPOSIT_PERCENT = 0.30;
    const DEPOSIT_MINIMUM = 75_00; // cents

    // ── State ────────────────────────────────────────────────────────
    let currentStep = 1;
    const MAX_STEPS = 5;
    const MAX_PHOTOS = 6;

    let photos = []; // { file, previewUrl, objectKey? }
    let bookingId = null;

    // ── Formatters ───────────────────────────────────────────────────
    function formatCurrency(cents) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
    }

    function serviceLabel(val) {
        const map = {
            "party":     "After-Party Trash Pickup",
            "household": "Household Trash Removal",
            "business":  "Business Trash Services"
        };
        return map[val] || val;
    }

    function trashLabel(val) {
        const map = {
            "party-bagged":    "Party waste and bagged trash",
            "mixed-household": "Mixed household trash",
            "bins-overflow":   "Bins and overflow pickup",
            "light-bulk":      "Light bulk haul away"
        };
        return map[val] || val;
    }

    function formatDate(str) {
        if (!str) return "";
        const d = new Date(str + "T12:00:00");
        return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    function formatTime(str) {
        if (!str) return "";
        const [h, m] = str.split(":");
        const hour   = parseInt(h, 10);
        const ampm   = hour >= 12 ? "PM" : "AM";
        const h12    = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    // ── Field getters ────────────────────────────────────────────────
    function val(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function selectedRadio(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : "";
    }

    // ── Validation ───────────────────────────────────────────────────
    const VALIDATORS = {
        serviceType: () => {
            const v = selectedRadio("serviceType");
            return v ? "" : "Please select a service type.";
        },
        name: () => {
            const v = val("name");
            if (!v) return "Name is required.";
            if (v.length < 2) return "Please enter your full name.";
            return "";
        },
        email: () => {
            const v = val("email");
            if (!v) return "Email is required.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address.";
            return "";
        },
        phone: () => {
            const v = val("phone");
            if (!v) return "Phone number is required.";
            if (v.replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit phone number.";
            return "";
        },
        location: () => {
            const v = val("location");
            if (!v) return "Pickup location is required.";
            if (v.length < 5) return "Please enter a full address or location name.";
            return "";
        },
        pickupDate: () => {
            const v = val("pickupDate");
            if (!v) return "Pickup date is required.";
            const d = new Date(v + "T12:00:00");
            const today = new Date();
            today.setHours(0,0,0,0);
            if (d < today) return "Pickup date must be today or in the future.";
            return "";
        },
        pickupTime: () => {
            const v = val("pickupTime");
            if (!v) return "Preferred time is required.";
            return "";
        },
        trashType: () => {
            const v = val("trashType");
            return v ? "" : "Please select a waste type.";
        }
    };

    function validateFields(fieldList) {
        let allOk = true;
        fieldList.forEach(name => {
            const fn  = VALIDATORS[name];
            const err = fn ? fn() : "";
            showFieldError(name, err);
            if (err) allOk = false;
        });
        return allOk;
    }

    function showFieldError(name, msg) {
        const errEl = document.getElementById("error-" + name);
        if (name === "serviceType") {
            // Show error below the service grid
            if (errEl) {
                errEl.textContent = msg;
                errEl.style.display = msg ? "block" : "none";
            }
            return;
        }
        const input = document.getElementById(name);
        if (input) input.classList.toggle("field-error", !!msg);
        if (errEl) errEl.textContent = msg;
    }

    // ── Step navigation ──────────────────────────────────────────────
    function goToStep(n) {
        const panels = document.querySelectorAll(".bk-panel");
        const steps  = document.querySelectorAll(".bk-step");
        const connectors = document.querySelectorAll(".bk-connector");

        panels.forEach((p, i) => {
            p.classList.toggle("active", i + 1 === n);
        });

        steps.forEach((s, i) => {
            const stepNum = i + 1;
            s.classList.remove("active", "done");
            if (stepNum === n) s.classList.add("active");
            else if (stepNum < n) s.classList.add("done");
        });

        // Connectors: fill up to current step
        connectors.forEach((c, i) => {
            c.style.background = i < n - 1
                ? "var(--brand)"
                : "rgba(97,168,144,.15)";
        });

        currentStep = n;
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (n === 2) {
            // Show company field for business service
            const isBusiness = selectedRadio("serviceType") === "business";
            const wrap = document.getElementById("company-field-wrap");
            if (wrap) wrap.style.display = isBusiness ? "" : "none";
        }

        if (n === 3) {
            // Show guest count for party
            const isParty = selectedRadio("serviceType") === "party";
            const guestsLabel = document.getElementById("guests-label");
            if (guestsLabel) guestsLabel.style.display = isParty ? "" : "none";

            // Restrict date to future
            const dateInput = document.getElementById("pickupDate");
            if (dateInput && !dateInput.min) {
                const today = new Date();
                dateInput.min = today.toISOString().split("T")[0];
            }
        }

        if (n === 5) buildReview();
    }

    // ── Review builder ────────────────────────────────────────────────
    function buildReview() {
        const svc      = selectedRadio("serviceType");
        const trash    = val("trashType");
        const estimate = calcEstimate(trash);
        const deposit  = calcDeposit(estimate);
        const balance  = estimate - deposit;

        // Estimate display
        setText("est-total",   formatCurrency(estimate));
        setText("est-deposit", formatCurrency(deposit));
        setText("est-balance", formatCurrency(balance));

        // Summary card
        const card = document.getElementById("review-summary");
        if (!card) return;

        card.innerHTML = `
            <h3>Your Details</h3>
            ${reviewRow("👤", "Name", val("name"))}
            ${reviewRow("✉️", "Email", val("email"))}
            ${reviewRow("📞", "Phone", val("phone"))}
            ${svc === "business" && val("companyName") ? reviewRow("🏢", "Company", val("companyName")) : ""}
            ${reviewRow("🗑️", "Service", serviceLabel(svc))}
            ${reviewRow("♻️", "Waste type", trashLabel(trash))}
            ${reviewRow("📍", "Pickup location", val("location"))}
            ${reviewRow("📅", "Date", formatDate(val("pickupDate")))}
            ${reviewRow("⏰", "Time", formatTime(val("pickupTime")))}
            ${photos.length ? reviewRow("📷", "Photos", `${photos.length} photo${photos.length !== 1 ? "s" : ""} attached`) : ""}
            ${val("details") ? reviewRow("📝", "Notes", val("details")) : ""}
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(97,168,144,.12);">
                <button class="review-edit-btn" onclick="goBack()">✏️ Edit any detail</button>
            </div>
        `;
    }

    function reviewRow(icon, label, value) {
        if (!value) return "";
        return `
            <div class="review-row">
                <span class="review-row-icon">${icon}</span>
                <div class="review-row-content">
                    <div class="review-row-label">${label}</div>
                    <div class="review-row-value">${escapeHtml(value)}</div>
                </div>
            </div>
        `;
    }

    function escapeHtml(str) {
        return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    window.goBack = function () {
        if (currentStep > 1) goToStep(currentStep - 1);
    };

    // ── Estimate calculator ──────────────────────────────────────────
    function calcEstimate(trashType) {
        return BASE_RATES[trashType] || 0;
    }

    function calcDeposit(estimateCents) {
        return Math.max(DEPOSIT_MINIMUM, Math.round(estimateCents * DEPOSIT_PERCENT));
    }

    // ── Photo upload ─────────────────────────────────────────────────
    function setupPhotoUpload() {
        const area   = document.getElementById("upload-area");
        const input  = document.getElementById("photo-input");
        const grid   = document.getElementById("photo-preview");
        const errBox = document.getElementById("upload-error");

        if (!area) return;

        // Drag-over visual
        area.addEventListener("dragover", e => {
            e.preventDefault();
            area.classList.add("drag-over");
        });
        ["dragleave", "dragend", "drop"].forEach(evt =>
            area.addEventListener(evt, () => area.classList.remove("drag-over"))
        );

        area.addEventListener("drop", e => {
            e.preventDefault();
            handleFiles(Array.from(e.dataTransfer.files));
        });

        if (input) {
            input.addEventListener("change", () => handleFiles(Array.from(input.files)));
        }

        function handleFiles(files) {
            clearErr();
            const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
            const maxSize = 10 * 1024 * 1024;
            let errs = [];

            files.forEach(f => {
                if (photos.length >= MAX_PHOTOS) {
                    errs.push(`Max ${MAX_PHOTOS} photos allowed.`);
                    return;
                }
                if (!allowed.includes(f.type) && !f.name.toLowerCase().endsWith(".heic")) {
                    errs.push(`"${f.name}" is not a supported file type.`);
                    return;
                }
                if (f.size > maxSize) {
                    errs.push(`"${f.name}" exceeds 10 MB.`);
                    return;
                }
                const reader = new FileReader();
                reader.onload = ev => {
                    photos.push({ file: f, previewUrl: ev.target.result, objectKey: null });
                    renderPhotoGrid();
                };
                reader.readAsDataURL(f);
            });

            if (errs.length) showErr(errs.join(" "));
            // Reset input so same file can be re-added after removal
            if (input) input.value = "";
        }

        function renderPhotoGrid() {
            if (!grid) return;
            grid.innerHTML = "";
            photos.forEach((p, idx) => {
                const thumb = document.createElement("div");
                thumb.className = "photo-thumb";
                thumb.innerHTML = `
                    <img src="${p.previewUrl}" alt="Upload ${idx+1}">
                    <button class="photo-thumb-remove" aria-label="Remove photo ${idx+1}" data-idx="${idx}">✕</button>
                `;
                grid.appendChild(thumb);
            });

            grid.querySelectorAll(".photo-thumb-remove").forEach(btn => {
                btn.addEventListener("click", () => {
                    const i = parseInt(btn.dataset.idx, 10);
                    photos.splice(i, 1);
                    renderPhotoGrid();
                });
            });
        }

        function showErr(msg) {
            if (!errBox) return;
            errBox.textContent = msg;
            errBox.hidden = false;
        }

        function clearErr() {
            if (!errBox) return;
            errBox.textContent = "";
            errBox.hidden = true;
        }
    }

    // ── Upload photo to S3 via presigned URL ──────────────────────────
    async function uploadPhoto(file, bkId) {
        const contentType = file.type || "image/jpeg";
        const res = await fetch(API_BASE + "/api/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId:   bkId,
                contentType: contentType,
                fileSize:    file.size   // for server-side size validation
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Could not get upload URL for " + file.name);
        }
        const { uploadUrl, objectKey } = await res.json();

        const put = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file
        });

        if (!put.ok) throw new Error("Failed to upload " + file.name + " to storage.");
        return objectKey;
    }

    // ── Payment / submit ──────────────────────────────────────────────
    async function handlePayment() {
        const payBtn    = document.getElementById("pay-button");
        const payLabel  = document.getElementById("pay-label");
        const paySpin   = document.getElementById("pay-spinner");
        const payErr    = document.getElementById("payment-error");

        function setLoading(on) {
            payBtn.disabled = on;
            if (payLabel) payLabel.textContent = on ? "Processing…" : "Pay Deposit & Confirm Booking";
            if (paySpin) paySpin.hidden = !on;
        }

        function showPayErr(msg) {
            if (!payErr) return;
            payErr.textContent = msg;
            payErr.hidden = false;
        }

        function clearPayErr() {
            if (!payErr) return;
            payErr.textContent = "";
            payErr.hidden = true;
        }

        clearPayErr();
        setLoading(true);

        // Dev / no backend mode
        if (!API_BASE || API_BASE.includes("YOUR_API_GATEWAY")) {
            setTimeout(() => {
                setLoading(false);
                showPayErr("⚙️ Dev mode: API not yet connected. Connect your API Gateway endpoint in window.NEATFLEETS_CONFIG.apiBase to enable payments.");
            }, 800);
            return;
        }

        try {
            // 1. Upload photos — use a stable temp ID scoped to this session
            //    so all photos land under uploads/{tempId}/ in S3.
            //    The backend accepts any key starting with "uploads/".
            if (!window._nfUploadSessionId) {
                window._nfUploadSessionId = crypto.randomUUID();
            }
            const uploadSessionId = window._nfUploadSessionId;

            const photoKeys = [];
            for (const p of photos) {
                if (!p.objectKey) {
                    const key = await uploadPhoto(p.file, uploadSessionId);
                    p.objectKey = key;
                    photoKeys.push(key);
                } else {
                    photoKeys.push(p.objectKey);
                }
            }

            // 2. Create booking
            const payload = {
                serviceType: selectedRadio("serviceType"),
                name:        val("name"),
                email:       val("email"),
                phone:       val("phone"),
                location:    val("location"),
                pickupDate:  val("pickupDate"),
                pickupTime:  val("pickupTime"),
                trashType:   val("trashType"),
                details:     val("details"),
                guests:      parseInt(val("guests") || "0", 10),
                companyName: val("companyName"),
                photoKeys
            };

            const res  = await fetch(API_BASE + "/api/bookings", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                showPayErr(data.message || "We couldn't process your booking. Please try again.");
                setLoading(false);
                return;
            }

            if (!data.checkoutUrl) {
                showPayErr("Payment session could not be created. Please try again.");
                setLoading(false);
                return;
            }

            bookingId = data.bookingId;

            // 3. Redirect to Stripe Checkout
            window.location.href = data.checkoutUrl;

        } catch (err) {
            console.error("Payment error:", err);
            showPayErr("A network error occurred. Please check your connection and try again.");
            setLoading(false);
        }
    }

    // ── Bind navigation buttons ───────────────────────────────────────
    function bindNavButtons() {
        // Next buttons
        document.querySelectorAll(".step-next").forEach(btn => {
            btn.addEventListener("click", () => {
                const fields = (btn.dataset.validate || "").split(",").map(s => s.trim()).filter(Boolean);
                if (fields.length && !validateFields(fields)) return;
                if (currentStep < MAX_STEPS) goToStep(currentStep + 1);
            });
        });

        // Back buttons
        document.querySelectorAll(".step-back").forEach(btn => {
            btn.addEventListener("click", () => {
                if (currentStep > 1) goToStep(currentStep - 1);
            });
        });

        // Pay button
        const payBtn = document.getElementById("pay-button");
        if (payBtn) payBtn.addEventListener("click", handlePayment);
    }

    // ── Clear errors on input ─────────────────────────────────────────
    function bindClearErrors() {
        ["name","email","phone","location","pickupDate","pickupTime","trashType"].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", () => showFieldError(id, ""));
            el.addEventListener("change", () => showFieldError(id, ""));
        });
    }

    // ── Utility ───────────────────────────────────────────────────────
    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ── Init ──────────────────────────────────────────────────────────
    function init() {
        setupPhotoUpload();
        bindNavButtons();
        bindClearErrors();
        initGate();

        // Footer year
        const yr = document.getElementById("year");
        if (yr) yr.textContent = new Date().getFullYear();
    }

    // ── Booking gate logic ────────────────────────────────────────────────────
    // Gate (#booking-gate) is VISIBLE by default in HTML.
    // Step panels and progress bar are HIDDEN by default.
    // This function either:
    //   a) Hides the gate and starts step 1 (signed-in or guest URL)
    //   b) Leaves gate visible and wires the "Book as Guest" button
    function initGate() {
        const NF       = window.NeatFleets;
        const gate     = document.getElementById("booking-gate");
        const skipNote = document.getElementById("gate-skip-note");
        const progress = document.querySelector(".bk-progress");
        const params   = new URLSearchParams(window.location.search);
        const isGuest  = params.get("guest") === "1";

        function showBookingFlow() {
            if (gate)     gate.hidden = true;
            if (progress) progress.style.display = "";
        }

        if (NF && NF.isSignedIn()) {
            // Signed in — skip gate entirely
            showBookingFlow();
            goToStep(1);
            preFillFromUser();
            return;
        }

        if (isGuest) {
            // ?guest=1 in URL — skip gate, show guest note
            showBookingFlow();
            if (skipNote) skipNote.hidden = false;
            goToStep(1);
            return;
        }

        // Gate is visible by default — just wire the "Book as Guest" button
        const guestBtn = document.getElementById("gate-guest");
        if (guestBtn) {
            guestBtn.addEventListener("click", () => {
                showBookingFlow();
                if (skipNote) skipNote.hidden = false;
                goToStep(1);
                // Stamp URL so a refresh keeps guest mode
                const url = new URL(window.location);
                url.searchParams.set("guest", "1");
                window.history.replaceState({}, "", url);
            });
        }
    }

    // ── Pre-fill contact fields from signed-in user ───────────────────────────
    function preFillFromUser() {
        const NF = window.NeatFleets;
        if (!NF || !NF.isSignedIn()) return;
        const user = NF.getUser();
        if (!user) return;

        const nameEl  = document.getElementById("name");
        const emailEl = document.getElementById("email");
        const phoneEl = document.getElementById("phone");

        if (nameEl  && !nameEl.value  && user.name)  nameEl.value  = user.name;
        if (emailEl && !emailEl.value && user.email) emailEl.value = user.email;
        if (phoneEl && !phoneEl.value && user.phone) phoneEl.value = user.phone;

        // Show a subtle banner so the customer knows we pre-filled
        const banner = document.createElement("div");
        banner.style.cssText = [
            "background:rgba(26,107,86,.12)",
            "border:1px solid rgba(97,168,144,.25)",
            "border-radius:10px",
            "padding:10px 16px",
            "font-size:.82rem",
            "color:var(--brand-light)",
            "margin-bottom:16px",
            "display:flex",
            "align-items:center",
            "gap:8px"
        ].join(";");
        banner.innerHTML = "✅ Signed in as <strong>" +
            escapeHtml(user.name || user.email) +
            "</strong> — your details have been pre-filled.";

        const formGrid = document.querySelector("#step-2 .bk-form-grid");
        if (formGrid) formGrid.insertAdjacentElement("beforebegin", banner);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
