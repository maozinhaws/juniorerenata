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
let current;
export function updateSpotify(value) {
    const src = spotifyEmbed(value || '');
    const wrapper = document.getElementById('spotify-embed-wrapper');
    if (!wrapper || current === src) return;
    current = src; wrapper.replaceChildren();
    if (!src) { wrapper.textContent = 'Adicione um link de música ou playlist do Spotify no painel.'; return; }
    const iframe = document.createElement('iframe');
    iframe.src = src; iframe.title = 'Spotify · música dos noivos'; iframe.width = '100%'; iframe.height = '152';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.style.border = '0'; iframe.style.borderRadius = '12px';
    wrapper.append(iframe);
    const link = document.createElement('a'); link.href = src.replace('/embed/', '/').split('?')[0];
    link.textContent = 'Abrir no Spotify ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer'; wrapper.append(link);
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Recarregar player';
    retry.onclick = () => { current = undefined; updateSpotify(value); };
    wrapper.append(retry);
}
export function initSpotify() {
    window.toggleMusicWidget = () => {
        const popup = document.getElementById('spotify-popup');
        const open = popup.classList.toggle('hidden') === false;
        document.getElementById('music-btn').setAttribute('aria-expanded', String(open));
        document.getElementById('music-btn').setAttribute('aria-label', open ? 'Fechar música dos noivos' : 'Abrir música dos noivos');
    };
    document.getElementById('music-btn').setAttribute('aria-controls', 'spotify-popup');
    document.getElementById('music-btn').setAttribute('aria-expanded', 'false');
}
