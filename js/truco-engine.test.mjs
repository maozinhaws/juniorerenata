import test from 'node:test';
import assert from 'node:assert/strict';
import { beginRound, decide } from './truco-engine.js';
const q = { options: ['a', 'b', 'c', 'd'], correct: 1 };
test('wrong answer makes CPU select the right card and call truco', () => {
    const r = beginRound(q, 0, () => .9);
    assert.equal(r.cpuAnswer, 1); assert.equal(r.offered, 3);
    assert.equal(decide(r, 'accept').winner, 'cpu');
});
test('folding to a bluff reveals facão and pays only accepted stake', () => {
    const r = beginRound(q, 1, () => .1);
    const end = decide(r, 'fold');
    assert.equal(end.reason, 'facão'); assert.equal(end.points, 1);
});
test('CPU can raise six with a wrong answer; player can raise nine', () => {
    const r = beginRound(q, 1, () => .9);
    const raised = decide(r, 'raise', () => .4);
    assert.equal(raised.offered, 6); assert.notEqual(raised.cpuAnswer, 1);
    const end = decide(raised, 'raise', () => .9);
    assert.equal(end.points, 9); assert.equal(end.winner, 'player');
});
test('CPU can fold even holding the right answer', () => {
    const r = beginRound(q, 0, () => .9);
    const end = decide(r, 'raise', () => .1);
    assert.equal(end.winner, 'player'); assert.equal(end.points, 3);
});
test('cannot raise above nine or act after settlement', () => {
    const r = beginRound(q, 0, () => .9);
    const nine = decide(r, 'raise', () => .4);
    assert.equal(nine.offered, 9);
    assert.throws(() => decide(nine, 'raise'));
    assert.throws(() => decide(decide(nine, 'accept'), 'fold'));
});
