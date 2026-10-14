export function initMotion() {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), {threshold:0.08});
    function register() {
        document.querySelectorAll('#tab-home > *, .bio-memory, .bio-copy, #tab-gallery > *, #tab-gifts > *, #tab-mural > *, #tab-rsvp > *').forEach((el,i) => {
            if (seen.has(el)) return;
            seen.add(el); el.classList.add('reveal-pending'); el.style.setProperty('--reveal-delay', (i % 3) * 65 + 'ms'); observer.observe(el);
        });
    }
    register();
    new MutationObserver(register).observe(document.getElementById('main-content'),{childList:true,subtree:true});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
        if (event.matches) { observer.disconnect(); document.querySelectorAll('.reveal-pending').forEach(el => el.classList.add('is-revealed')); }
    });
}
