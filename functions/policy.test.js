import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, nextSlot } from './policy.js';
const valid = { guestId: 'demo:main', text: 'Parabéns!', image: '', requestId: '11111111-1111-1111-1111-111111111111' };
test('accepts a text-only message', () => assert.doesNotThrow(() => validateSubmission(valid)));
test('requires a registered participant key instead of an invitation code', () => {
    assert.throws(() => validateSubmission({ ...valid, guestId: undefined, code: 'old-code' }));
    assert.throws(() => validateSubmission({ ...valid, guestId: '../other' }));
    assert.doesNotThrow(() => validateSubmission({ ...valid, guestId: 'group:0' }));
});
test('rejects videos and oversized images', () => {
    assert.throws(() => validateSubmission({ ...valid, image: 'data:video/mp4;base64,AAAA' }));
    assert.throws(() => validateSubmission({ ...valid, image: 'x'.repeat(340001) }));
});
test('rejects forged JPEG and empty messages', () => {
    assert.throws(() => validateSubmission({ ...valid, image: 'data:image/jpeg;base64,AAAA' }));
    assert.throws(() => validateSubmission({ ...valid, text: ' ' }));
});
test('two lifetime slots include rejected notes, retries do not consume slots', () => {
    const notes = [{ id: '1', requestId: 'a' }, { id: '2', requestId: 'b' }];
    assert.throws(() => nextSlot(notes, 'c'));
    assert.equal(nextSlot(notes, 'b').duplicate, true);
    assert.equal(nextSlot([], 'a').slot, 1);
});
