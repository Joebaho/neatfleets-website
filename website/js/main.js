// Simple contact form alert (you can replace with actual form handling)
document.getElementById('contact-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you! We will get back to you within 24 hours.');
    this.reset();
});