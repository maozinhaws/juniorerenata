import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {guestLists,createGuestPdf} from './guest-list.js';
const {jsPDF}=createRequire(import.meta.url)('./vendor/jspdf.umd.min.js');
const groups=[{id:'a',mainName:'João',status:'confirmed',companions:[{name:'Érica'}]},{id:'b',mainName:'José',status:'pending'},{id:'c',mainName:'Renata',status:'revoked',companions:[{name:'Paulo'}]},{id:'d',mainName:'Ana',status:'declined'}];
test('counts named people and companions, partitions pending/declined/revoked without deleting records',()=>{
 const lists=guestLists(groups);assert.equal(lists.confirmed.length,2);assert.equal(lists.off.length,3);assert.equal(lists.people.length,6);
 assert.equal(lists.off.find(p=>p.name==='Paulo').status,'revoked');assert.equal(guestLists([]).people.length,0);
 assert.equal(guestLists([{mainName:'',companions:[{name:'Valid'},{}]}]).people.length,1);
});
test('PDF contains both lists, strike lines, and paginates long guest lists',()=>{
 const pdf=createGuestPdf(groups,jsPDF);const text=pdf.output();assert.ok(text.includes('Convidados Off'));assert.ok(text.includes('Jo'));assert.match(text,/ l\nS/);
 const large=createGuestPdf(Array.from({length:200},(_,i)=>({...groups[i%4],mainName:'Pessoa '+i+' da Silva '.repeat(9)})),jsPDF);
 assert.ok(large.getNumberOfPages()>5);for(let i=1;i<=large.getNumberOfPages();i++) assert.ok(large.internal.pages[i].some(s=>s.includes('Tj')));
 assert.ok(createGuestPdf([],jsPDF).output().includes('Nenhum convidado'));
});

test('pending names are not Off and each companion has an independent status and stable key',()=>{
 const group={id:'g',mainName:'Titular',status:'confirmed',companions:[{name:'Um'},{name:'Dois'},{name:'Três'}],memberStates:{main:'pending','0':'revoked','1':'deleted','2':'declined'}};
 const lists=guestLists([group]);assert.equal(lists.pending.length,1);assert.equal(lists.off.length,2);assert.equal(lists.confirmed.length,0);assert.equal(lists.people.find(p=>p.name==='Três').member,'2');
 assert.equal(guestLists([{...group,memberStates:{...group.memberStates,'2':'confirmed'}}]).confirmed.length,1);
});
