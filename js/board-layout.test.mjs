import test from 'node:test';
import assert from 'node:assert/strict';
import {boardLayout} from './board-layout.js';
test('all notes fit within a finite grid on mobile and desktop',()=>{
    for(const [width,height] of [[280,480],[360,480],[1100,680],[0,0]]) {
        for(const count of [0,1,2,12,40,100]) {
            const grid=boardLayout(count,width,height);
            assert.ok(Number.isInteger(grid.columns) && Number.isInteger(grid.rows));
            assert.ok(grid.columns*grid.rows>=count);
        }
    }
});
test('adding memories makes tiles smaller rather than increasing board height',()=>{
    const few=boardLayout(4,360,480),many=boardLayout(40,360,480);
    assert.ok(many.columns>few.columns);
    assert.ok(many.rows>few.rows);
});
