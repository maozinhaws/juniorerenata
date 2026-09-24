import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageFile, MAX_IMAGE_BYTES, validImageSource } from './image-input.js';
test('photos accept 3 MB and reject oversized files and videos', () => {
    assert.doesNotThrow(() => validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES }));
    assert.throws(() => validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }));
    for (const type of ['video/mp4', 'image/gif', 'image/svg+xml']) assert.throws(() => validateImageFile({ type, size: 100 }));
});
test('cover accepts bundled photo but rejects Instagram profiles and unsafe URLs', () => {
    assert.equal(validImageSource('./assets/wedding/hero-rings.png'), true);
    assert.equal(validImageSource('https://www.instagram.com/reehvjr'), false);
    assert.equal(validImageSource('javascript:alert(1)'), false);
});
