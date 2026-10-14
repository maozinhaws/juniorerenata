import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeStoreUrl, countdownParts} from './site-values.js';
test('store links reject script URLs and credentials', () => {
    assert.equal(safeStoreUrl('javascript:alert(1)'), '');
    assert.equal(safeStoreUrl('https://user:pass@loja.com'), '');
    assert.equal(safeStoreUrl('https://loja.com/produto?item=2'), 'https://loja.com/produto?item=2');
});
test('countdown carries minutes correctly and stops at zero', () => {
    assert.deepEqual(countdownParts(90061000), {days:1,hours:1,minutes:1,seconds:1});
    assert.deepEqual(countdownParts(3599000), {days:0,hours:0,minutes:59,seconds:59});
    assert.deepEqual(countdownParts(-1), {days:0,hours:0,minutes:0,seconds:0});
});
test('HTML and cyclic imports resolve the same application module identity', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url),'utf8');
    const entries = [...html.matchAll(/<script type="module" src="([^"]+)"/g)];
    assert.equal(entries.length,1);
    assert.equal(entries[0][1],'./js/firebase-init.js');
    assert.doesNotMatch(html,/startCoupleQuiz|chooseQuizTeam|public-ranking-list/);
});

import { chapterCuriosity } from './site-values.js';
test('one photo has exactly one curiosity author, including legacy chapters', () => {
    assert.deepEqual(chapterCuriosity({groomNote:'Groom',brideNote:'Bride'}),{author:'noivo',text:'Groom'});
    assert.deepEqual(chapterCuriosity({curiosityAuthor:'noiva',curiosity:'Bride',groomNote:'Old'}),{author:'noiva',text:'Bride'});
    assert.deepEqual(chapterCuriosity({curiosityAuthor:'noiva',curiosity:'',groomNote:'Old'}),{author:'noiva',text:''});
});
