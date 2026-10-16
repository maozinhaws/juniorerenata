import assert from 'node:assert/strict';
import { biographyDocument } from '../../js/biography-data.js';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,writeBatch,updateDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import fs from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-wedding',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('../../firestore.rules','utf8')}});
await env.clearFirestore();
const app='casamento-junior-renata-v1',base='artifacts/'+app+'/public/data/',root='weddingSpark/'+app+'/';
const publicDb=env.unauthenticatedContext().firestore(),adminDb=env.authenticatedContext('couple').firestore();
await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,base+'admins/couple'),{active:true});await setDoc(doc(db,base+'guests/guest'),{mainName:'Teste',companions:[{name:'Acompanhante'}],status:'pending'});await setDoc(doc(db,base+'gifts/gift'),{title:'Presente teste'});});
let checks=0;
const ok=async(p)=>{await assertSucceeds(p);checks++;},no=async(p)=>{await assertFails(p);checks++;};
const id1='11111111-1111-4111-8111-111111111111',id2='22222222-2222-4222-8222-222222222222';
const person={guestId:'guest:main',groupId:'guest',member:'main',author:'Teste'};
function note(id,slot,extra={}){return {...person,requestId:id,slot,text:'Felicidades!',image:'',color:'yellow',status:'pending',createdAt:serverTimestamp(),...extra};}
function sendNote(id,slot,requests,extra={}){const b=writeBatch(publicDb);b.set(doc(publicDb,root+'muralNotes/guest:main_'+slot),note(id,slot,extra));b.set(doc(publicDb,root+'muralSlots/guest:main'),{requests});return b.commit();}
try{
const chapterRef=doc(adminDb,base+'timeline/generated-chapter-id');
await ok(setDoc(chapterRef,{id:'t2',text:'História original',curiosity:'Original',imageUrl:'https://example.com/photo.jpg'}));
const chapter=biographyDocument(await getDoc(chapterRef));
await ok(updateDoc(doc(adminDb,base+'timeline/'+chapter.id),{text:'História revisada',curiosity:'Bombons após o turno',curiosityAuthor:'noivo',imageUrl:'https://example.com/new.jpg'}));
assert.equal((await getDoc(chapterRef)).data().curiosity,'Bombons após o turno'); checks++;
await no(updateDoc(doc(publicDb,base+'timeline/'+chapter.id),{text:'Alteração pública'}));
await no(setDoc(doc(publicDb,base+'admins/attacker'),{active:true}));
await no(setDoc(doc(publicDb,base+'gifts/injected'),{title:'Fake'}));
await ok(updateDoc(doc(publicDb,base+'guests/guest'),{status:'confirmed'}));
await no(updateDoc(doc(publicDb,base+'guests/guest'),{mainName:'Impersonated'}));
await ok(updateDoc(doc(adminDb,base+'guests/guest'),{status:'revoked'}));
await no(updateDoc(doc(publicDb,base+'guests/guest'),{status:'confirmed'}));
await ok(updateDoc(doc(adminDb,base+'guests/guest'),{status:'confirmed'}));
await no(sendNote(id1,1,[id1],{author:'Forged'}));
await no(sendNote(id1,1,[id1],{status:'approved'}));
await no(sendNote(id1,1,[id1],{image:'https://bad.example/image.jpg'}));
await ok(sendNote(id1,1,[id1]));
await no(getDoc(doc(publicDb,root+'muralNotes/guest:main_1')));
await no(updateDoc(doc(publicDb,root+'muralNotes/guest:main_1'),{status:'approved'}));
await ok(getDocs(collection(adminDb,root+'muralNotes')));
await ok(updateDoc(doc(adminDb,root+'muralNotes/guest:main_1'),{status:'approved'}));
await ok(getDocs(query(collection(publicDb,root+'muralNotes'),where('status','==','approved'))));
await no(updateDoc(doc(publicDb,root+'muralNotes/guest:main_1'),{status:'deleted'}));
await ok(updateDoc(doc(adminDb,root+'muralNotes/guest:main_1'),{status:'deleted'}));
await no(getDoc(doc(publicDb,root+'muralNotes/guest:main_1')));
await ok(updateDoc(doc(adminDb,root+'muralNotes/guest:main_1'),{status:'pending'}));
await ok(updateDoc(doc(adminDb,base+'guests/guest'),{'memberStates.0':'revoked'}));
await no(updateDoc(doc(publicDb,base+'guests/guest'),{'memberStates.0':'confirmed'}));
await ok(updateDoc(doc(adminDb,base+'guests/guest'),{'memberStates.main':'revoked'}));
await no(updateDoc(doc(publicDb,base+'guests/guest'),{status:'confirmed'}));
await ok(updateDoc(doc(adminDb,base+'guests/guest'),{'memberStates.main':'confirmed'}));

await no(getDocs(collection(publicDb,root+'muralNotes')));
await ok(sendNote(id2,2,[id1,id2]));
await no(sendNote(id1,3,[id1,id2,id1]));
await no(sendNote(id1,1,[id1]));
const claimId='33333333-3333-4333-8333-333333333333';
const day=Timestamp.fromDate(new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z'));
function claim(extra={}){const b=writeBatch(publicDb);b.set(doc(publicDb,root+'giftClaims/'+claimId),{...person,requestId:claimId,giftId:'gift',giftTitle:'Presente teste',amountCents:100,method:'pix',receipt:'data:image/jpeg;base64,/9j/2Q==',paid:true,status:'pending',createdAt:serverTimestamp(),...extra});b.set(doc(publicDb,root+'giftSlots/guest:main'),{day,requests:[claimId]});return b.commit();}
await no(claim({amountCents:-1}));await no(claim({paid:false}));await no(claim({receipt:''}));await ok(claim());
await no(getDoc(doc(publicDb,root+'giftClaims/'+claimId)));await ok(getDoc(doc(adminDb,root+'giftClaims/'+claimId)));
await no(setDoc(doc(publicDb,root+'giftApprovals/'+claimId),{giftId:'gift',amountCents:100}));
await no(updateDoc(doc(adminDb,root+'giftClaims/'+claimId),{status:'approved'}));
let b=writeBatch(adminDb);b.update(doc(adminDb,root+'giftClaims/'+claimId),{status:'approved'});b.set(doc(adminDb,root+'giftApprovals/'+claimId),{giftId:'gift',amountCents:101});await no(b.commit());
b=writeBatch(adminDb);b.update(doc(adminDb,root+'giftClaims/'+claimId),{status:'approved'});b.set(doc(adminDb,root+'giftApprovals/'+claimId),{giftId:'gift',amountCents:100});await ok(b.commit());
await ok(getDocs(collection(publicDb,root+'giftApprovals')));
await no(updateDoc(doc(adminDb,root+'giftClaims/'+claimId),{status:'rejected'}));
await no(updateDoc(doc(adminDb,root+'giftApprovals/'+claimId),{amountCents:200}));
console.log('PASS',checks,'Firestore authorization and atomicity assertions');
}finally{await env.cleanup();}
