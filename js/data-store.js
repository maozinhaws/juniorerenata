import * as firestore from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Local previews never read or write the production database.
export const isPreview = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
export const { collection, doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = firestore;
const key = 'wedding-preview-v3';
let data;
try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch { data = {}; }
const listeners = new Set();
const snapshot = (ref) => {
    if (ref.type === 'collection') {
        const docs = Object.entries(data).filter(([p]) => p.startsWith(ref.path + '/') && p.split('/').length === ref.path.split('/').length + 1)
            .map(([p, v]) => ({ id: p.split('/').pop(), data: () => structuredClone(v) }));
        return { docs, empty: !docs.length };
    }
    return { exists: () => Boolean(data[ref.path]), data: () => structuredClone(data[ref.path]) };
};
function persist() {
    localStorage.setItem(key, JSON.stringify(data));
    listeners.forEach(fn => fn());
}
export const getDoc = ref => isPreview ? Promise.resolve(snapshot(ref)) : firestore.getDoc(ref);
export const onSnapshot = (ref, next, error) => {
    if (!isPreview) return firestore.onSnapshot(ref, next, error);
    const notify = () => next(snapshot(ref));
    listeners.add(notify);
    queueMicrotask(notify);
    return () => listeners.delete(notify);
};
export const setDoc = async (ref, value, options) => {
    if (!isPreview) return firestore.setDoc(ref, value, options);
    const previous = data[ref.path];
    data[ref.path] = options?.merge ? { ...previous, ...value } : value;
    try { persist(); } catch (error) { if (previous) data[ref.path] = previous; else delete data[ref.path]; throw error; }
};
export const addDoc = async (ref, value) => {
    if (!isPreview) return firestore.addDoc(ref, value);
    const target = doc(ref, crypto.randomUUID());
    await setDoc(target, value);
    return target;
};
export const updateDoc = (ref, value) => isPreview ? setDoc(ref, value, { merge: true }) : firestore.updateDoc(ref, value);
export const deleteDoc = async ref => {
    if (!isPreview) return firestore.deleteDoc(ref);
    delete data[ref.path]; persist();
};
export function seedPreview(db, appId, defaults) {
    if (!isPreview || data.__seeded) return;
    const base = 'artifacts/' + appId + '/public/data/';
    data[base + 'settings/config'] = defaults.settings;
    for (const type of ['gifts', 'timeline']) for (const row of defaults[type]) data[base + type + '/' + row.id] = row;
    data[base + 'guests/demo'] = { mainName: 'Convidado de demonstração', companions: [], status: 'pending' };
    data.__seeded = true;
    persist();
}
