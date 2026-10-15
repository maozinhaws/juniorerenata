import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {guestLists,createGuestPdf} from './guest-list.js';
const {jsPDF}=createRequire(import.meta.url)('./vendor/jspdf.umd.min.js');
const groups=[{id:'a',mainName:'João',status:'confirmed',companions:[{name:'Érica'}]},{id:'b',mainName:'José',status:'pending'},{id:'c',mainName:'Renata',status:'revoked',companions:[{name:'Paulo'}]},{id:'d',mainName:'Ana',status:'declined'}];
test('counts named people and companions, partitions pending/declined/revoked without deleting records',()=>{
 const lists=guestLists(groups);assert.equal(lists.confirmed.length,2);assert.equal(lists.off.length,4);assert.equal(lists.people.length,6);
 assert.equal(lists.off.find(p=>p.name==='Paulo').status,'revoked');assert.equal(guestLists([]).people.length,0);
 assert.equal(guestLists([{mainName:'',companions:[{name:'Valid'},{}]}]).people.length,1);
});
test('PDF contains both lists, strike lines, and paginates long guest lists',()=>{
 const pdf=createGuestPdf(groups,jsPDF);const text=pdf.output();assert.ok(text.includes('Convidados Off'));assert.ok(text.includes('Jo'));assert.match(text,/ l\nS/);
 const large=createGuestPdf(Array.from({length:200},(_,i)=>({...groups[i%4],mainName:'Pessoa '+i+' da Silva '.repeat(9)})),jsPDF);
 assert.ok(large.getNumberOfPages()>5);for(let i=1;i<=large.getNumberOfPages();i++) assert.ok(large.internal.pages[i].some(s=>s.includes('Tj')));
 assert.ok(createGuestPdf([],jsPDF).output().includes('Nenhum convidado'));
});
