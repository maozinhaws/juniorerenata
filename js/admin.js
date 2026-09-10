import { db, appId, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initAdmin() {
    window.saveAllPanelChanges = async () => {
        state.settings = {
            ...state.settings,
            names: document.getElementById('cfg-names').value.trim(),
            date: document.getElementById('cfg-date').value,
            location: document.getElementById('cfg-location').value.trim(),
            maps: document.getElementById('cfg-maps').value.trim(),
            pixKey: document.getElementById('cfg-pix').value.trim(),
            receiverName: document.getElementById('cfg-receiver').value.trim(),
            cityName: document.getElementById('cfg-city').value.trim() || 'Curitiba',
            radioUrl: document.getElementById('cfg-radio').value.trim(),
            whatsappNumber: document.getElementById('cfg-whatsapp').value.trim(),
            homepageImg: document.getElementById('cfg-homepage-img').value.trim() || state.settings.homepageImg
        };
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), state.settings, { merge: true });
            window.showToast("Configurações salvas com sucesso!");
        } catch(err) { window.showToast("Erro ao salvar alterações.", true); }
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