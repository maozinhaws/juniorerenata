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

export const DEFAULT_SPOTIFY_URL = 'https://open.spotify.com/album/6fu2Vky35ZXLoGDzdUcHjv';
let current, controller, generation = 0, apiPromise;
function loadApi() {
    if (!apiPromise) apiPromise = new Promise(resolve => {
        window.onSpotifyIframeApiReady = resolve;
        const script = document.createElement('script');
        script.src = 'https://open.spotify.com/embed/iframe-api/v1'; script.async = true;
        script.onerror = () => resolve(null);
        document.head.append(script);
        setTimeout(() => resolve(null), 10000);
    });
    return apiPromise;
}
export async function updateSpotify(value, force = false) {
    const desired = spotifyEmbed(value?.trim() || DEFAULT_SPOTIFY_URL);
    const wrapper = document.getElementById('spotify-embed-wrapper');
    if (!wrapper || (!force && current === desired && wrapper.children.length)) return;
    current = desired;
    const version = ++generation;
    controller?.destroy(); controller = null; wrapper.replaceChildren();
    if (!desired) { wrapper.textContent = 'Link do Spotify inválido. Confira o endereço no painel.'; return; }
    const mount = document.createElement('div');
    const status = document.createElement('p'); status.setAttribute('role','status');
    status.textContent = 'Carregando nossa trilha…';
    const link = document.createElement('a'); link.href = desired.replace('/embed/', '/').split('?')[0];
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Abrir no Spotify ↗';
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Recarregar player';
    retry.onclick = () => updateSpotify(value, true);
    wrapper.append(mount, status, link, retry);
    const api = await loadApi();
    if (version !== generation) return;
    status.textContent = 'Se o som não iniciar, toque no play do Spotify.';
    if (!api) {
        const frame = document.createElement('iframe'); frame.src = desired;
        frame.title = 'Spotify · trilha dos noivos'; frame.width = '100%'; frame.height = '152';
        frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        mount.replaceWith(frame); return;
    }
    const parts = new URL(desired).pathname.split('/');
    api.createController(mount, {uri:'spotify:' + parts[2] + ':' + parts[3],width:'100%',height:152}, instance => {
        if (version !== generation) { instance.destroy(); return; }
        controller = instance;
        instance.addListener('ready', () => { if (version === generation) instance.play(); });
        instance.addListener('playback_update', event => {
            if (version === generation) status.textContent = event.data.isPaused ? 'Toque no play do Spotify para ouvir.' : 'Nossa trilha está tocando.';
        });
    });
}
export function initSpotify() { updateSpotify(DEFAULT_SPOTIFY_URL); }
