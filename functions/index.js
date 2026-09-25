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
