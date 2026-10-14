import test from 'node:test';
import assert from 'node:assert/strict';
import { spotifyEmbed } from './spotify.js';
test('Spotify accepts shared, localized, embedded and URI links', () => {
    const id = '37i9dQZF1DXcBWIGoYBM5M';
    for (const url of ['https://open.spotify.com/playlist/'+id+'?si=abc','https://open.spotify.com/intl-pt/playlist/'+id,'https://open.spotify.com/embed/playlist/'+id,'spotify:playlist:'+id]) assert.equal(spotifyEmbed(url),'https://open.spotify.com/embed/playlist/'+id+'?theme=0');
});
test('Spotify rejects unrelated hosts and invalid paths', () => {
    for (const url of ['https://open.spotify.com.evil.com/track/123','javascript:alert(1)','https://open.spotify.com/track/123']) assert.equal(spotifyEmbed(url),null);
});

test('requested album produces an official embed', () => {
    assert.equal(spotifyEmbed('https://open.spotify.com/intl-pt/album/6fu2Vky35ZXLoGDzdUcHjv?si=rxud886cSP-47urbwrW0ag'),'https://open.spotify.com/embed/album/6fu2Vky35ZXLoGDzdUcHjv?theme=0');
});

test('blocked autoplay retries on a real gesture once and cleans up after playback', async () => {
    const {updateSpotify} = await import('./spotify.js');
    const listeners = new Map(), events = new Map();
    let plays = 0;
    const element = () => ({children:[],setAttribute(){},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]}});
    const wrapper = element();
    const api = {createController(mount, options, callback) {callback({play(){plays++},destroy(){},addListener(name, fn){events.set(name,fn)}})}};
    const oldDocument = globalThis.document, oldWindow = globalThis.window, oldTimeout = globalThis.setTimeout;
    globalThis.window = {};
    globalThis.document = {getElementById:()=>wrapper,createElement:element,head:{append(){window.onSpotifyIframeApiReady(api)}},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
    globalThis.setTimeout = () => 0;
    try {
        await updateSpotify('https://open.spotify.com/album/6fu2Vky35ZXLoGDzdUcHjv',true);
        listeners.get('click')({isTrusted:true}); assert.equal(plays,0);
        events.get('ready')(); assert.equal(plays,1);
        listeners.get('click')({isTrusted:false}); assert.equal(plays,1);
        listeners.get('click')({isTrusted:true}); assert.equal(plays,2); assert.equal(listeners.size,0);
        await updateSpotify('https://open.spotify.com/album/6fu2Vky35ZXLoGDzdUcHjv',true);
        events.get('ready')(); events.get('playback_started')(); assert.equal(listeners.size,0);
        const before = plays;
        events.get('playback_update')({data:{isPaused:true}}); assert.equal(plays,before);
    } finally {globalThis.document=oldDocument;globalThis.window=oldWindow;globalThis.setTimeout=oldTimeout;}
});

test('default playlist matches the owner supplied radio link', async () => {
    const {DEFAULT_SPOTIFY_URL} = await import('./spotify.js');
    assert.equal(DEFAULT_SPOTIFY_URL,'https://open.spotify.com/playlist/37i9dQZF1E4FuBHeAGTKp0');
    assert.equal(spotifyEmbed(DEFAULT_SPOTIFY_URL),'https://open.spotify.com/embed/playlist/37i9dQZF1E4FuBHeAGTKp0?theme=0');
});
