import { validateGiftClaim, giftDecision } from './gift-policy.js';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { validateSubmission, nextSlot } from './policy.js';
initializeApp();
const db = getFirestore();
const appId = 'casamento-junior-renata-v1';
const base = 'artifacts/' + appId + '/public/data/';
const privateRoot = db.collection('weddingMuralPrivate').doc(appId);
async function admin(request) {
    if (!request.auth) return false;
    return (await db.doc(base + 'admins/' + request.auth.uid).get()).data()?.active === true;
}
export const weddingMural = onCall({ maxInstances: 4 }, async request => {
    const data = request.data || {};
    const isAdmin = await admin(request);
    const notes = privateRoot.collection('notes');
    const invites = privateRoot.collection('invites');
    if (data.action === 'list') {
        const snapshot = await (isAdmin ? notes.orderBy('timestamp', 'desc').limit(100) : notes.where('status', '==', 'approved').limit(100)).get();
        return { rows: snapshot.docs.map(doc => {
            const row = doc.data();
            return { id: doc.id, author: row.author, text: row.text, image: row.image, status: row.status, timestamp: row.timestamp, color: row.color };
        }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) };
    }
    if (data.action === 'submit') {
        try { validateSubmission(data); } catch (error) { throw new HttpsError('invalid-argument', error.message); }
        const [groupId, member] = data.guestId.split(':');
        const inviteRef = invites.doc(data.guestId);
        return db.runTransaction(async tx => {
            const guest = (await tx.get(db.doc(base + 'guests/' + groupId))).data();
            const name = member === 'main' ? guest?.mainName : guest?.companions?.[Number(member)]?.name;
            if (!name) throw new HttpsError('not-found', 'Convidado não encontrado na lista.');
            const invite = (await tx.get(inviteRef)).data() || {};
            let slot;
            try { slot = nextSlot(invite.submissions || [], data.requestId); } catch (error) { throw new HttpsError('resource-exhausted', error.message); }
            if (slot.duplicate) return { id: slot.id };
            const note = notes.doc(inviteRef.id + '-' + slot.slot);
            tx.create(note, { author: name, color: ['yellow','pink','green','blue'].includes(data.color) ? data.color : 'yellow', text: data.text.trim(), image: data.image, status: 'pending', timestamp: new Date().toISOString() });
            tx.set(inviteRef, { submissions: [...(invite.submissions || []), { requestId: data.requestId, id: note.id }] }, { merge: true });
            return { id: note.id };
        });
    }
    if (data.action === 'moderate') {
        if (!isAdmin) throw new HttpsError('permission-denied', 'Aprovação restrita aos noivos.');
        if (typeof data.id !== 'string' || !/^[\w:-]+$/.test(data.id) || !['approved', 'rejected'].includes(data.status)) throw new HttpsError('invalid-argument', 'Decisão inválida.');
        await notes.doc(data.id).update({ status: data.status });
        return { success: true };
    }
    throw new HttpsError('invalid-argument', 'Operação desconhecida.');
});

// Claims and receipts are private. Only approved amounts are exposed publicly.
export const weddingGifts = onCall({ maxInstances: 4 }, async request => {
    const data = request.data || {};
    const isAdmin = await admin(request);
    const root = db.collection('weddingGiftsPrivate').doc(appId);
    const claims = root.collection('claims');
    if (data.action === 'list') {
        const totals = (await root.collection('totals').get()).docs.map(d => ({giftId:d.id,amountCents:d.data().amountCents}));
        const rows = isAdmin ? (await claims.where('status','==','pending').limit(100).get()).docs.map(d => ({id:d.id,...d.data()})) : [];
        return {totals,rows};
    }
    if (data.action === 'submit') {
        try { validateGiftClaim(data); } catch (e) { throw new HttpsError('invalid-argument',e.message); }
        const [groupId, member] = data.guestId.split(':');
        return db.runTransaction(async tx => {
            const ref = claims.doc(data.requestId);
            if ((await tx.get(ref)).exists) return {id:ref.id};
            const gift = (await tx.get(db.doc(base+'gifts/'+data.giftId))).data();
            const guest = (await tx.get(db.doc(base+'guests/'+groupId))).data();
            const author = member === 'main' ? guest?.mainName : guest?.companions?.[Number(member)]?.name;
            if (!gift || !author) throw new HttpsError('not-found','Presente ou convidado não encontrado.');
            const quotaRef = root.collection('quotas').doc(data.guestId);
            const quota = (await tx.get(quotaRef)).data() || {};
            const day = new Date().toISOString().slice(0,10);
            const count = quota.day === day ? quota.count || 0 : 0;
            if (count >= 20) throw new HttpsError('resource-exhausted','Limite diário de solicitações atingido.');
            tx.create(ref,{giftId:data.giftId,giftTitle:gift.title,guestId:data.guestId,author,amountCents:data.amountCents,method:data.method,receipt:data.receipt || '',status:'pending',timestamp:new Date().toISOString()});
            tx.set(quotaRef,{day,count:count+1});
            return {id:ref.id};
        });
    }
    if (data.action === 'moderate') {
        if (!isAdmin) throw new HttpsError('permission-denied','Aprovação restrita aos noivos.');
        if (!/^[a-f0-9-]{36}$/.test(data.id || '')) throw new HttpsError('invalid-argument','Pedido inválido.');
        return db.runTransaction(async tx => {
            const ref = claims.doc(data.id); const row = (await tx.get(ref)).data();
            if (!row) throw new HttpsError('not-found','Pedido não encontrado.');
            try { giftDecision(row.status,data.status); } catch(e) { throw new HttpsError('failed-precondition',e.message); }
            if (row.status === data.status) return {success:true};
            const totalRef = root.collection('totals').doc(row.giftId);
            const total = (await tx.get(totalRef)).data()?.amountCents || 0;
            tx.update(ref,{status:data.status,reviewedBy:request.auth.uid,reviewedAt:new Date().toISOString()});
            if (data.status === 'approved') tx.set(totalRef,{amountCents:total+row.amountCents});
            return {success:true};
        });
    }
    throw new HttpsError('invalid-argument','Operação desconhecida.');
});
