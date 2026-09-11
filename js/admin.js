import { db, appId, state, storage } from './firebase-init.js';
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

async function resolveWeddingImage(urlInputId, fileInputId, currentValue, label) {
    const url = document.getElementById(urlInputId)?.value.trim();
    if (url) return url;
    const file = document.getElementById(fileInputId)?.files?.[0];
    if (!file) return currentValue;
    if (!file.type.startsWith('image/')) throw new Error(`${label}: escolha um arquivo de imagem.`);
    if (file.size > 10 * 1024 * 1024) throw new Error(`${label}: o arquivo deve ter no máximo 10 MB.`);
    const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '');
    const location = ref(storage, `wedding-photos/${appId}/${Date.now()}-${label.toLowerCase().replace(/\s+/g, '-')}.${extension}`);
    await uploadBytes(location, file, { contentType: file.type });
    return getDownloadURL(location);
}

export function initAdmin() {
    window.saveAllPanelChanges = async () => {
        try {
        const groomImage = await resolveWeddingImage('cfg-groom-img', 'cfg-groom-file', state.settings.groomImage, 'Foto do noivo');
        const brideImage = await resolveWeddingImage('cfg-bride-img', 'cfg-bride-file', state.settings.brideImage, 'Foto da noiva');
        state.settings = {
            ...state.settings,
            names: document.getElementById('cfg-names')?.value.trim() || state.settings.names,
            date: document.getElementById('cfg-date')?.value || state.settings.date,
            location: document.getElementById('cfg-location')?.value.trim() || state.settings.location,
            maps: document.getElementById('cfg-maps')?.value.trim() || state.settings.maps,
            pixKey: document.getElementById('cfg-pix')?.value.trim() || state.settings.pixKey,
            receiverName: document.getElementById('cfg-receiver')?.value.trim() || state.settings.receiverName,
            cityName: document.getElementById('cfg-city')?.value.trim() || 'Curitiba',
            radioUrl: document.getElementById('cfg-radio')?.value.trim() || state.settings.radioUrl,
            whatsappNumber: document.getElementById('cfg-whatsapp')?.value.trim() || state.settings.whatsappNumber,
            homepageImg: document.getElementById('cfg-homepage-img')?.value.trim() || state.settings.homepageImg,
            groomImage, brideImage,
            theme: document.getElementById('cfg-theme')?.value || state.settings.theme || 'light'
        };
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), state.settings, { merge: true });
            window.showToast("Configurações salvas com sucesso!");
        } catch (err) {
            console.error(err);
            window.showToast(err.message || "Erro ao salvar alterações.", true);
        }
    };
}

export function renderAdmin() {
    let totalGenerated = 0, totalConfirmed = 0;
    state.guests.forEach(g => {
        const groupSize = 1 + (g.companions ? g.companions.length : 0);
        totalGenerated += groupSize;
        if (g.status === 'confirmed') totalConfirmed += groupSize;
    });
    const statTotal = document.getElementById('stat-total-guests');
    const statConf = document.getElementById('stat-confirmed-guests');
    if (statTotal) statTotal.innerText = totalGenerated;
    if (statConf) statConf.innerText = totalConfirmed;
    if (window.lucide) lucide.createIcons();
}
