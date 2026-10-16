import test from 'node:test';
import assert from 'node:assert/strict';
import { biographyDocument, biographySaveError } from './biography-data.js';

test('legacy seed IDs cannot replace real document IDs when saving chapters', () => {
    const data = { id: 't2', text: 'Nosso encontro', imageUrl: 'https://example.com/photo.jpg', curiosity: 'Bombons' };
    const chapter = biographyDocument({ id: 'firestore-generated-id', data: () => data });
    assert.equal(chapter.id, 'firestore-generated-id');
    assert.equal(chapter.order, 1);
    assert.equal(chapter.text, data.text);
    assert.equal(chapter.imageUrl, data.imageUrl);
    assert.equal(data.id, 't2');
    assert.equal(biographyDocument({ id: 'x', data: () => ({ id: 't2', order: 8 }) }).order, 8);
});

test('missing documents and connection failures are not reported as permissions', () => {
    assert.match(biographySaveError({ code: 'not-found' }), /não foi encontrado/);
    assert.match(biographySaveError({ code: 'permission-denied' }), /permissão/);
    assert.doesNotMatch(biographySaveError({ code: 'unavailable' }), /permissão/);
});
