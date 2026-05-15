const PAYMENT_URL = "";

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const yearTarget = document.getElementById("year");
const bookingForm = document.getElementById("booking-form");
const formMessage = document.getElementById("form-message");
const estimateTotal = document.getElementById("estimate-total");
const estimateDeposit = document.getElementById("estimate-deposit");
const bookingSummary = document.getElementById("booking-summary");
const paymentButton = document.getElementById("payment-button");
const photoInput = document.getElementById("photo-input");
const photoPreview = document.getElementById("photo-preview");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const guestButton = document.getElementById("guest-button");
const accountStatus = document.getElementById("account-status");
const accountMessage = document.getElementById("account-message");
const bookingLock = document.getElementById("booking-lock");
const registerAccountType = registerForm?.querySelector('select[name="accountType"]');
const companyNameLabel = document.getElementById("company-name-label");
const companyNameInput = registerForm?.querySelector('input[name="companyName"]');

const baseRates = {
    "party-bagged": 180,
    "mixed-household": 210,
    "bins-overflow": 240,
    "light-bulk": 320
};

const CUSTOMER_STORAGE_KEY = "neatfleets-customer-account";

if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
}

if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = siteNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
}

function currency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(value);
}

function getStoredCustomer() {
    try {
        return JSON.parse(window.localStorage.getItem(CUSTOMER_STORAGE_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function setStoredCustomer(customer) {
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
}

function clearStoredCustomer() {
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
}

function updateBookingAccess() {
    const customer = getStoredCustomer();
    const isActive = Boolean(customer);

    if (accountStatus) {
        accountStatus.textContent = isActive
            ? customer.isGuest
                ? "Guest session active"
                : customer.accountType === "company"
                    ? `Signed in as ${customer.companyName || customer.name} (${customer.email})`
                    : `Signed in as ${customer.name} (${customer.email})`
            : "No customer session is active yet.";
    }

    if (logoutButton) {
        logoutButton.hidden = !isActive;
    }

    if (guestButton) {
        guestButton.hidden = isActive;
    }

    if (bookingForm) {
        bookingForm.classList.toggle("form-disabled", !isActive);
        const fields = bookingForm.querySelectorAll("input, textarea, select, button");
        fields.forEach((field) => {
            field.disabled = !isActive;
        });
    }

    if (bookingLock) {
        bookingLock.hidden = isActive;
    }

    if (paymentButton && !isActive) {
        paymentButton.disabled = true;
    }

    if (isActive && bookingForm) {
        const nameField = bookingForm.querySelector('input[name="name"]');
        const emailField = bookingForm.querySelector('input[name="email"]');
        const phoneField = bookingForm.querySelector('input[name="phone"]');

        if (nameField && !nameField.value && !customer.isGuest) {
            nameField.value = customer.name || "";
        }
        if (emailField && !emailField.value && !customer.isGuest) {
            emailField.value = customer.email || "";
        }
        if (phoneField && !phoneField.value && !customer.isGuest) {
            phoneField.value = customer.phone || "";
        }
    }
}

function updateAccountTypeFields() {
    if (!registerAccountType || !companyNameLabel || !companyNameInput) {
        return;
    }

    const isCompany = registerAccountType.value === "company";
    companyNameLabel.classList.toggle("is-hidden", !isCompany);
    companyNameInput.required = isCompany;

    if (!isCompany) {
        companyNameInput.value = "";
    }
}

function getEstimate(formData) {
    const trashType = formData.get("trashType");
    const customerType = formData.get("customerType");
    const guests = Number(formData.get("guests") || 0);
    const pickupDate = formData.get("pickupDate");
    const pickupTime = formData.get("pickupTime") || "";

    let total = baseRates[trashType] || 0;

    if (customerType === "party") {
        if (guests > 40) {
            total += 60;
        }
        if (guests > 100) {
            total += 80;
        }
        if (guests > 200) {
            total += 120;
        }
    }

    if (customerType === "household" && guests === 0) {
        total += 20;
    }

    const hour = Number((pickupTime.split(":")[0] || "0"));
    if (hour >= 20 || hour <= 6) {
        total += 55;
    }

    if (pickupDate) {
        const weekday = new Date(`${pickupDate}T12:00:00`);
        const day = weekday.getDay();
        if (day === 0 || day === 6) {
            total += 40;
        }
    }

    const deposit = total > 0 ? Math.max(75, Math.round(total * 0.3)) : 0;
    return { total, deposit };
}

function renderEstimate() {
    if (!bookingForm) {
        return;
    }

    const formData = new FormData(bookingForm);
    const { total, deposit } = getEstimate(formData);

    if (estimateTotal) {
        estimateTotal.textContent = currency(total);
    }

    if (estimateDeposit) {
        estimateDeposit.textContent = currency(deposit);
    }
}

function renderPhotos(files) {
    if (!photoPreview) {
        return;
    }

    photoPreview.innerHTML = "";

    Array.from(files).slice(0, 6).forEach((file) => {
        if (!file.type.startsWith("image/")) {
            return;
        }

        const img = document.createElement("img");
        img.alt = file.name;
        img.src = URL.createObjectURL(file);
        photoPreview.appendChild(img);
    });
}

function buildSummary(formData, estimate) {
    const photoCount = photoInput?.files?.length || 0;

    return `
        <ul>
            <li><strong>Name:</strong> ${formData.get("name") || "-"}</li>
            <li><strong>Email:</strong> ${formData.get("email") || "-"}</li>
            <li><strong>Phone:</strong> ${formData.get("phone") || "-"}</li>
            <li><strong>Request type:</strong> ${formData.get("customerType") || "-"}</li>
            <li><strong>Guests:</strong> ${formData.get("guests") || "0"}</li>
            <li><strong>Location:</strong> ${formData.get("location") || "-"}</li>
            <li><strong>Date:</strong> ${formData.get("pickupDate") || "-"}</li>
            <li><strong>Time:</strong> ${formData.get("pickupTime") || "-"}</li>
            <li><strong>Trash type:</strong> ${formData.get("trashType") || "-"}</li>
            <li><strong>Uploaded photos:</strong> ${photoCount}</li>
            <li><strong>Estimated total:</strong> ${currency(estimate.total)}</li>
            <li><strong>Suggested deposit:</strong> ${currency(estimate.deposit)}</li>
        </ul>
    `;
}

if (bookingForm) {
    bookingForm.addEventListener("input", renderEstimate);
    bookingForm.addEventListener("change", renderEstimate);

    bookingForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(bookingForm);
        const estimate = getEstimate(formData);

        if (bookingSummary) {
            bookingSummary.innerHTML = buildSummary(formData, estimate);
        }

        if (formMessage) {
            formMessage.textContent = "Booking reviewed. Continue to payment when ready.";
        }

        if (paymentButton) {
            paymentButton.disabled = false;
            paymentButton.dataset.booking = JSON.stringify(Object.fromEntries(formData.entries()));
            paymentButton.dataset.estimateTotal = String(estimate.total);
            paymentButton.dataset.estimateDeposit = String(estimate.deposit);
        }
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(registerForm);
        const customer = {
            accountType: String(formData.get("accountType") || "").trim(),
            name: String(formData.get("name") || "").trim(),
            companyName: String(formData.get("companyName") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            isGuest: false
        };

        setStoredCustomer(customer);
        updateBookingAccess();

        if (accountMessage) {
            accountMessage.textContent = "Account created. Booking is now unlocked.";
        }

        registerForm.reset();
        updateAccountTypeFields();
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const stored = getStoredCustomer();
        const formData = new FormData(loginForm);
        const email = String(formData.get("email") || "").trim();
        const phone = String(formData.get("phone") || "").trim();

        if (!stored || stored.email !== email || stored.phone !== phone) {
            if (accountMessage) {
                accountMessage.textContent = "We could not match that account. Create the account first or use the saved email and phone.";
            }
            return;
        }

        updateBookingAccess();

        if (accountMessage) {
            accountMessage.textContent = "Signed in successfully. You can now complete the booking.";
        }

        loginForm.reset();
    });
}

if (guestButton) {
    guestButton.addEventListener("click", () => {
        setStoredCustomer({
            isGuest: true
        });

        updateBookingAccess();

        if (accountMessage) {
            accountMessage.textContent = "Guest session started. You can now complete the booking.";
        }
    });
}

if (registerAccountType) {
    registerAccountType.addEventListener("change", updateAccountTypeFields);
}

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        clearStoredCustomer();

        if (accountMessage) {
            accountMessage.textContent = "Signed out. Booking is locked again until the customer registers or signs in.";
        }

        updateBookingAccess();
    });
}

if (photoInput) {
    photoInput.addEventListener("change", () => {
        renderPhotos(photoInput.files || []);
    });
}

if (paymentButton) {
    paymentButton.addEventListener("click", () => {
        if (!PAYMENT_URL) {
            alert("Payment provider is not connected yet. Add your live payment URL in website/js/main.js before launch.");
            return;
        }

        window.location.href = PAYMENT_URL;
    });
}

renderEstimate();
updateBookingAccess();
updateAccountTypeFields();
