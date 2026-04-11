const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const yearTarget = document.getElementById('year');
const form = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
}

if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

form?.addEventListener('submit', (event) => {
    event.preventDefault();

    if (formMessage) {
        formMessage.textContent = 'Thanks. Your request looks ready. Connect this form to email delivery before launch if you want real submissions.';
    }

    form.reset();
});
