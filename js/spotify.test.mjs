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
