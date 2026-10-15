import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGiftClaim,giftDecision} from './gift-policy.js';
const valid = {guestId:'guest:main',giftId:'g1',requestId:'12345678-1234-1234-1234-123456789abc',amountCents:12345,method:'pix',paid:true,receipt:'data:image/jpeg;base64,/9j/2Q=='};
test('accepts cents and requires a receipt for Pix and store payments',()=>{
 for(const method of ['pix','store','payment'])assert.doesNotThrow(()=>validateGiftClaim({...valid,method}));
 assert.throws(()=>validateGiftClaim({...valid,receipt:''}));
});
test('rejects invalid money and unconfirmed payments',()=>{
 for(const amountCents of [0,-1,NaN,Infinity,1.5,100000000001])assert.throws(()=>validateGiftClaim({...valid,amountCents}));
 assert.throws(()=>validateGiftClaim({...valid,paid:false}));
});
test('rejects remote proofs, fake image bytes and oversized images',()=>{
 for(const receipt of ['https://example.com/proof.jpg','data:image/jpeg;base64,YWJj','x'.repeat(340001)])assert.throws(()=>validateGiftClaim({...valid,receipt}));
});
test('approval cannot be reversed and retries do not change the decision',()=>{
 assert.equal(giftDecision('pending','approved'),'approved');
 assert.equal(giftDecision('approved','approved'),'approved');
 assert.throws(()=>giftDecision('approved','rejected'));
 assert.throws(()=>giftDecision('rejected','approved'));
 assert.throws(()=>giftDecision('pending','anything'));
});
