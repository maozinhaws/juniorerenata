import fs from 'node:fs';
let source=fs.readFileSync('../../js/spark-approvals.js','utf8').replace("'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'","'firebase/firestore'").replace("'./firebase-init.js'","'./spark-context.mjs'").replace("'./guests.js'","'./spark-context.mjs'");
fs.writeFileSync('spark-adapter.mjs',source);
fs.writeFileSync('spark-context.mjs',`export let db; export const appId='casamento-junior-renata-v1'; export const state={isAdminLoggedIn:false,gifts:[{id:'gift',title:'Presente teste'}]}; export function use(next,admin=false){db=next;state.isAdminLoggedIn=admin;} export const participants=()=>[{key:'guest:main',name:'Teste'}];`);
const {initializeTestEnvironment}=await import('@firebase/rules-unit-testing');
const {doc,setDoc,getDocs,collection}=await import('firebase/firestore');
const assert=(await import('node:assert/strict')).default;
const env=await initializeTestEnvironment({projectId:'demo-adapter',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('../../firestore.rules','utf8')}});
await env.clearFirestore();
const {use}=await import('./spark-context.mjs');const {sparkMural,sparkGifts}=await import('./spark-adapter.mjs');
const base='artifacts/casamento-junior-renata-v1/public/data/';
await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),base+'admins/couple'),{active:true});await setDoc(doc(c.firestore(),base+'guests/guest'),{mainName:'Teste',companions:[]});await setDoc(doc(c.firestore(),base+'gifts/gift'),{title:'Presente teste'});});
try{
use(env.unauthenticatedContext().firestore());
const note={guestId:'guest:main',requestId:crypto.randomUUID(),text:'Teste da transação',image:'',color:'yellow'};
const first=await sparkMural('submit',note);assert.deepEqual(await sparkMural('submit',note),first);
assert.equal((await sparkMural('list')).rows.length,0);
await sparkMural('submit',{...note,requestId:crypto.randomUUID()});
await assert.rejects(sparkMural('submit',{...note,requestId:crypto.randomUUID()}),/dois recados/);
use(env.authenticatedContext('couple').firestore(),true);
assert.equal((await sparkMural('list')).rows.length,2);await sparkMural('moderate',{id:first.id,status:'approved'});await sparkMural('moderate',{id:first.id,status:'approved'});
use(env.unauthenticatedContext().firestore());assert.equal((await sparkMural('list')).rows.length,1);
const claim={guestId:'guest:main',requestId:crypto.randomUUID(),giftId:'gift',amountCents:2500,method:'pix',receipt:'data:image/jpeg;base64,/9j/2Q==',paid:true};
const sent=await sparkGifts('submit',claim);assert.deepEqual(await sparkGifts('submit',claim),sent);assert.equal((await sparkGifts('list')).totals.length,0);
use(env.authenticatedContext('couple').firestore(),true);assert.equal((await sparkGifts('list')).rows.length,1);await sparkGifts('moderate',{id:sent.id,status:'approved'});await sparkGifts('moderate',{id:sent.id,status:'approved'});
use(env.unauthenticatedContext().firestore());const result=await sparkGifts('list');assert.deepEqual(result,{rows:[],totals:[{giftId:'gift',amountCents:2500}]});
console.log('PASS actual Spark adapter: submit, quotas, pending privacy, moderation, duplicate retries and exact gift total');
}finally{await env.cleanup();}
