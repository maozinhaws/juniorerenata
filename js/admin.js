import { db, appId, state } from './firebase-init.js';
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initAdmin() {
    window.saveAllPanelChanges = async () => {
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
            homepageImg: document.getElementById('cfg-homepage-img')?.value.trim() || state.settings.homepageImg
        };
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), state.settings, { merge: true });
            window.showToast("Configurações salvas com sucesso!");
        } catch (err) {
            console.error(err);
            window.showToast("Erro ao salvar alterações.", true);
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
