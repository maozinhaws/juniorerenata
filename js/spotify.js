export function spotifyEmbed(value) {
    try {
        const raw = value.trim().replace(/^spotify:(track|playlist|album|artist|episode|show):([A-Za-z0-9]+)$/, 'https://open.spotify.com/$1/$2');
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
        const path = url.pathname.replace(/^\/intl-[a-z-]+\//i, '/').replace(/^\/embed\//, '/');
        const match = path.match(/^\/(track|playlist|album|artist|episode|show)\/([A-Za-z0-9]{22})\/?$/);
        return match ? 'https://open.spotify.com/embed/' + match[1] + '/' + match[2] + '?theme=0' : null;
    } catch { return null; }
}
let current, desired;
function renderPlayer(force = false) {
    const wrapper = document.getElementById('spotify-embed-wrapper');
    if (!wrapper || (!force && current === desired && wrapper.children.length)) return;
    current = desired; wrapper.replaceChildren();
    if (!desired) { wrapper.textContent = 'Nenhuma playlist disponível. Os noivos podem adicionar o link no painel.'; return; }
    const status = document.createElement('p'); status.setAttribute('role','status'); status.textContent = 'Carregando Spotify…';
    const iframe = document.createElement('iframe');
    iframe.title = 'Spotify · música dos noivos'; iframe.width = '100%'; iframe.height = '152';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.border = '0'; iframe.style.borderRadius = '12px';
    iframe.onload = () => { status.textContent = 'Toque em play para ouvir. Se o player não aparecer, tente recarregar ou abrir no Spotify.'; };
    wrapper.append(status, iframe);
    iframe.src = desired;
    const link = document.createElement('a'); link.href = desired.replace('/embed/', '/').split('?')[0];
    link.textContent = 'Abrir no Spotify ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer'; wrapper.append(link);
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Recarregar player';
    retry.onclick = () => renderPlayer(true); wrapper.append(retry);
}
export function updateSpotify(value) {
    desired = spotifyEmbed(value || '');
    const popup = document.getElementById('spotify-popup');
    if (popup && !popup.classList.contains('hidden')) renderPlayer();
    else if (current !== desired) { document.getElementById('spotify-embed-wrapper')?.replaceChildren(); current = undefined; }
}
export function initSpotify() {
    window.toggleMusicWidget = () => {
        const popup = document.getElementById('spotify-popup');
        const open = popup.classList.toggle('hidden') === false;
        document.getElementById('music-btn').setAttribute('aria-expanded', String(open));
        document.getElementById('music-btn').setAttribute('aria-label', open ? 'Fechar música dos noivos' : 'Abrir música dos noivos');
        if (open) renderPlayer();
    };
    document.getElementById('music-btn').setAttribute('aria-controls', 'spotify-popup');
    document.getElementById('music-btn').setAttribute('aria-expanded', 'false');
}
