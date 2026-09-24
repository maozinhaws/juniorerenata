import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomBytes, createHash } from 'node:crypto';
import { validateSubmission, nextSlot } from './policy.js';
initializeApp();
const db = getFirestore();
const appId = 'casamento-junior-renata-v1';
const base = 'artifacts/' + appId + '/public/data/';
const privateRoot = db.collection('weddingMuralPrivate').doc(appId);
const hash = code => createHash('sha256').update(code).digest('hex');
async function admin(request) {
    if (!request.auth) return false;
    return (await db.doc(base + 'admins/' + request.auth.uid).get()).data()?.active === true;
}
export const weddingMural = onCall({ maxInstances: 4 }, async request => {
    const data = request.data || {};
    const isAdmin = await admin(request);
    const notes = privateRoot.collection('notes');
    const invites = privateRoot.collection('invites');
    if (data.action === 'invite') {
        if (!isAdmin) throw new HttpsError('permission-denied', 'Apenas os noivos podem gerar convites.');
        if (typeof data.guestId !== 'string' || !/^[\w-]+:(main|[0-9]+)$/.test(data.guestId)) throw new HttpsError('invalid-argument', 'Selecione o convidado.');
        const [groupId, member] = data.guestId.split(':');
        const guest = (await db.doc(base + 'guests/' + groupId).get()).data();
        if (!guest) throw new HttpsError('not-found', 'Convidado não encontrado.');
        const name = member === 'main' ? guest.mainName : guest.companions?.[Number(member)]?.name;
        if (!name) throw new HttpsError('not-found', 'Acompanhante não encontrado.');
        const code = randomBytes(16).toString('hex');
        // Rotating a code never resets the two lifetime submission slots.
        await invites.doc(data.guestId).set({ digest: hash(code), name }, { merge: true });
        return { code };
    }
    if (data.action === 'list') {
        const snapshot = await (isAdmin ? notes.orderBy('timestamp', 'desc').limit(100) : notes.where('status', '==', 'approved').limit(100)).get();
        return { rows: snapshot.docs.map(doc => {
            const row = doc.data();
            return { id: doc.id, author: row.author, text: row.text, image: row.image, status: row.status, timestamp: row.timestamp };
        }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) };
    }
    if (data.action === 'submit') {
        try { validateSubmission(data); } catch (error) { throw new HttpsError('invalid-argument', error.message); }
        const digest = hash(data.code);
        const result = await invites.where('digest', '==', digest).limit(1).get();
        if (result.empty) throw new HttpsError('permission-denied', 'Código de convite inválido.');
        const inviteRef = result.docs[0].ref;
        return db.runTransaction(async tx => {
            const invite = (await tx.get(inviteRef)).data();
            if (invite.digest !== digest) throw new HttpsError('permission-denied', 'Código de convite substituído.');
            let slot;
            try { slot = nextSlot(invite.submissions || [], data.requestId); } catch (error) { throw new HttpsError('resource-exhausted', error.message); }
            if (slot.duplicate) return { id: slot.id };
            const note = notes.doc(inviteRef.id + '-' + slot.slot);
            tx.create(note, { author: invite.name, text: data.text.trim(), image: data.image, status: 'pending', timestamp: new Date().toISOString() });
            tx.update(inviteRef, { submissions: [...(invite.submissions || []), { requestId: data.requestId, id: note.id }] });
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
