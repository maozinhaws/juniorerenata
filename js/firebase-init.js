import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, isPreview, seedPreview } from './data-store.js';
import { mountImageInput, validImageSource } from './image-input.js?v=20260925-2329';
import { initGuests } from './guests.js';
import { initSpotify, updateSpotify, DEFAULT_SPOTIFY_URL } from './spotify.js';
import { initMotion } from './motion.js';
import { initBackgrounds, showBackground } from './backgrounds.js?v=20260925-2329';
import { initMural, refreshMural } from './mural.js?v=20260925-2329';

import { initBiography, renderBiography } from './biography.js';
import { initGifts, refreshGiftPayments, safeStoreUrl } from './gifts.js';
import { countdownParts } from './site-values.js';
import { renderGallery, processInstagram } from './gallery.js';
import { initAdmin, renderAdmin } from './admin.js?v=20260925-2329';

const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? (typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config)
    : {
        apiKey: "AIzaSyCYUx_0e4Xfsit8cGKR9Tx648lBsNkZkf8",
        authDomain: "casamentojer-f582b.firebaseapp.com",
        projectId: "casamentojer-f582b",
        storageBucket: "casamentojer-f582b.firebasestorage.app",
        messagingSenderId: "1045448989382",
        appId: "1:1045448989382:web:c62c868d5104154be1d5c7",
        measurementId: "G-PM73MG69PF"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'casamento-junior-renata-v1';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Keep the last synchronized data in the browser so the page can paint immediately
// on repeat visits. Firestore still delivers live server updates through onSnapshot.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export { appId };

const DEFAULT_GIFTS = [
    { id: 'g1', title: "Cota para Lua de Mel", totalAmount: 3000, currentAmount: 0, category: "Viagem", description: "Ajuda para o nosso merecido descanso na praia!", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
    { id: 'g2', title: "Fogão e Forno", totalAmount: 2200, currentAmount: 0, category: "Cozinha", description: "Para jantares e memórias especiais na casa nova.", imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80" }
];

const DEFAULT_TIMELINE = [
    { id: 't1', tag: "A Troca de Turno", title: "Onde nos conhecemos na fábrica?", options: ["Na fila da janta", "Na portaria da empresa", "No estacionamento", "No escritório"], correct: 0, text: "Nos conhecemos na empresa na troca de turno. Ele chegava com a Saveiro chamando a atenção, mas eu nem ligava! Até que na fila da janta, sem querer, sentei na mesma mesa que ele." },
    { id: 't2', tag: "O Primeiro Encontro", title: "O que fomos beber antes do turno?", options: ["Café e Suco", "Budweiser & Heineken", "Água de Coco", "Refrigerante"], correct: 1, text: "Antes do turno ele me chamou para beber: me trouxe uma Bud, bebeu uma Heineken, tomamos um chopp e conversamos um monte sobre a vida." },
    { id: 't3', tag: "O Pedido de Namoro", title: "Onde aconteceu o nosso pedido de namoro?", options: ["Na serra", "Na praia", "No shopping", "Em um restaurante"], correct: 1, text: "Passados 3 meses de conversas e risadas, ele me pediu em namoro na praia. Foi um momento mágico e inesquecível à beira do mar." }
];

export let state = {
    gifts: DEFAULT_GIFTS, messages: [], guests: [], timeline: DEFAULT_TIMELINE, gallery: [], contributions: [], rankings: [],
    selectedGift: null, selectedRsvpGuest: null, isSidebarCollapsed: true, isAdminLoggedIn: false,
    pendingDelete: null, activeQuizGuest: null, currentQuizStep: 0, quizAnswersState: [],
    settings: { 
        names: "Júnior & Renata", date: "2026-11-14T17:00", location: "Espaço das Flores - Curitiba, PR", maps: "https://maps.google.com", 
        pixKey: "", receiverName: "Júnior e Renata", cityName: "Curitiba", radioUrl: DEFAULT_SPOTIFY_URL,
        whatsappNumber: "5541999999999",
        homepageImg: "./assets/wedding/hero-rings.png",
        heroPosition: "65"
    }
};

export function sendWhatsAppAlert(text) {
    if (isPreview) return;
    try {
        console.log("📲 Alerta silencioso para WhatsApp dos noivos:", text);
        if (state.settings.whatsappWebhook) {
            fetch(state.settings.whatsappWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: state.settings.whatsappNumber, message: text })
            }).catch(() => {});
        }
    } catch(e) {}
}

window.openCalendarModal = () => { document.getElementById('modal-calendar').style.display = 'flex'; window.lucide?.createIcons(); };
window.closeCalendarModal = () => { document.getElementById('modal-calendar').style.display = 'none'; };

function getEventCalendarDetails() {
    const dateStr = state.settings.date || "2026-11-14T17:00";
    const startDate = new Date(dateStr);
    const validStart = isNaN(startDate.getTime()) ? new Date("2026-11-14T17:00") : startDate;
    const endDate = new Date(validStart.getTime() + 6 * 60 * 60 * 1000);
    const formatISO = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return {
        title: `Casamento de ${state.settings.names || "Júnior & Renata"}`,
        startISO: formatISO(validStart),
        endISO: formatISO(endDate),
        location: state.settings.location || "Curitiba, PR",
        details: `Celebração do casamento.\nLocal: ${state.settings.location || "Curitiba, PR"}`
    };
}

window.addToGoogleCalendar = () => {
    const ev = getEventCalendarDetails();
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${ev.startISO}/${ev.endISO}&details=${encodeURIComponent(ev.details)}&location=${encodeURIComponent(ev.location)}`;
    window.open(gCalUrl, '_blank');
    window.closeCalendarModal();
    window.showToast("Redirecionando para a Google Agenda...");
};

window.downloadIcsFile = () => {
    const ev = getEventCalendarDetails();
    const icsData = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casamento Junior e Renata//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT', `SUMMARY:${ev.title}`, `DESCRIPTION:${ev.details.replace(/\n/g, '\\n')}`, `LOCATION:${ev.location}`,
        `DTSTART:${ev.startISO}`, `DTEND:${ev.endISO}`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'casamento-junior-renata.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.closeCalendarModal();
    window.showToast("Evento baixado com sucesso!");
};

window.openDeleteModal = (msg, act) => {
    state.pendingDelete = act;
    document.getElementById('delete-confirm-message').innerText = msg;
    document.getElementById('modal-delete-confirm').style.display = 'flex';
    window.lucide?.createIcons();
};
window.closeDeleteModal = () => { state.pendingDelete = null; document.getElementById('modal-delete-confirm').style.display = 'none'; };
window.confirmPendingDelete = async () => { const act = state.pendingDelete; window.closeDeleteModal(); if (typeof act === 'function') await act(); };

window.showToast = (msg, err = false) => {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    t.className = `fixed top-16 right-5 z-[9999] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${err ? 'bg-red-950 border-red-700' : 'bg-stone-900 border-emerald-600'} show`;
    document.getElementById('toast-icon').setAttribute('data-lucide', err ? 'alert-circle' : 'check-circle-2');
    window.lucide?.createIcons();
    setTimeout(() => { t.className = t.className.replace('show', ''); }, 4000);
};

export const escapeHTML = v => (v == null ? '' : String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])));

document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab], [data-action]');
    if (!btn) return;
    if (btn.dataset.tab) window.switchTab(btn.dataset.tab);
    else if (btn.dataset.action) {
        const act = btn.dataset.action;

        if (act === 'open-admin') window.openAdminModal();
        if (act === 'close-admin') window.closeAdminModal();
        if (act === 'close-pix') window.closePixModal();

        if (act === 'copy-pix') window.copyPix();

        if (act === 'open-add-gift') window.openAddGiftModal();
        if (act === 'close-add-gift') window.closeAddGiftModal();
        if (act === 'open-add-guest') window.openAddGuestModal();
        if (act === 'close-add-guest') window.closeAddGuestModal();


        if (act === 'open-add-gallery') window.openAddGalleryModal();
        if (act === 'close-add-gallery') window.closeAddGalleryModal();
        if (act === 'add-companion-row') window.addCompanionRow();

    }
});

const scrollTabs = ['home', 'history', 'gallery', 'gifts', 'mural', 'rsvp'];
const browserThemes = { home: '#350817', history: '#241128', gallery: '#301529', gifts: '#2b1726', mural: '#4b244f', rsvp: '#241128', admin: '#19121f' };

function setActiveSection(tabId) {
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', browserThemes[tabId] || browserThemes.home);
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tabId}`));
    document.querySelectorAll('.sidebar-nav-btn').forEach(b => {
        if (b.dataset.tab === tabId) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
        b.className = b.dataset.tab === tabId ?
            "sidebar-nav-btn w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all bg-red-600 text-white shadow-sm cursor-pointer whitespace-nowrap" :
            "sidebar-nav-btn w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all hover:bg-red-100 hover:text-red-700 cursor-pointer whitespace-nowrap";
    });
    showBackground(tabId);
    if (tabId === 'gallery') requestAnimationFrame(processInstagram);
}

// Native scrolling remains completely natural. The observer only updates the
// highlighted menu item and browser theme as each section enters the viewport.
let navigationFrame;
function syncNavigation() {
    navigationFrame = null;
    if (document.body.dataset.adminView === 'true') return;
    const marker = Math.min(window.innerHeight * .35, 240);
    let active = 'home';
    for (const id of scrollTabs) {
        const section = document.getElementById('tab-' + id);
        if (section && section.getBoundingClientRect().top <= marker) active = id;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = 'rsvp';
    setActiveSection(active);
}
window.addEventListener('scroll', () => { if (!navigationFrame) navigationFrame = requestAnimationFrame(syncNavigation); }, {passive:true});
window.addEventListener('resize', syncNavigation);

window.switchTab = (tabId) => {
    if (tabId === 'admin' && !isPreview && (!auth.currentUser || !state.isAdminLoggedIn)) {
        window.openAdminModal();
        return;
    }

    document.body.dataset.adminView = String(tabId === 'admin');
    setActiveSection(tabId);
    if (tabId === 'mural') refreshMural();
    if (tabId === 'gallery') requestAnimationFrame(processInstagram);
    if (tabId === 'admin') {
        updateEditorUI();
        renderAdmin();
        refreshMural();
    }


    const target = document.getElementById('tab-' + tabId);
    if (target) {
        requestAnimationFrame(() => {
            const top = target.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
    }
};

window.openAdminModal = () => {
    if (isPreview) {
        state.isAdminLoggedIn = true;
        updateEditorUI(); renderAdmin(); refreshMural();
        window.switchTab('admin'); return;
    }
    if (auth.currentUser && state.isAdminLoggedIn) { window.switchTab('admin'); renderAdmin(); return; }
    document.getElementById('modal-admin-login').style.display = 'flex';
};
window.closeAdminModal = () => document.getElementById('modal-admin-login').style.display = 'none';

window.submitAdminLogin = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('[type=submit]');
    if (button?.disabled) return;
    const email = document.getElementById('admin-input-email').value.trim();
    const pass = document.getElementById('admin-input-pass').value;
    if (!email || !pass) return window.showToast("Preencha e-mail e senha!", true);

    try {
        if (button) button.disabled = true;
        window.showToast("Autenticando...");
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;
        const adminDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'admins', uid);
        const adminSnap = await getDoc(adminDocRef);

        if (!adminSnap.exists() || adminSnap.data().active !== true) {
            await signOut(auth);
            return window.showToast("Acesso Negado: Conta sem privilégios de administrador.", true);
        }

        state.isAdminLoggedIn = true;
        window.closeAdminModal();
        updateEditorUI();
        window.switchTab('admin');
        renderAdmin();
        window.showToast("Modo de Edição ativado (Wix Style)!");
    } catch (err) {
        const permission = err.code === 'permission-denied';
        window.showToast(permission ? 'Login recebido, mas o Firebase bloqueou a consulta de administrador. Confira as regras e o cadastro de permissões.' : 'Não foi possível entrar. Confira e-mail, senha e conexão.', true);
    } finally { if (button) button.disabled = false; }
};

window.adminLogout = async () => {
    if (!isPreview) await signOut(auth);
    state.isAdminLoggedIn = false;
    updateEditorUI();
    window.switchTab('home');
    window.showToast("Sessão encerrada com segurança.");
    refreshMural();
};

function updateEditorUI() {
    const wixBar = document.getElementById('wix-admin-bar');
    const adminQuizToolbar = document.getElementById('admin-story-toolbar');
    const adminGalleryToolbar = document.getElementById('admin-gallery-toolbar');
    const adminGiftToolbar = document.getElementById('admin-gift-toolbar');
    const adminGuestToolbar = document.getElementById('admin-guest-toolbar');
    const adminRankingCol = document.querySelectorAll('.admin-ranking-col');
    const adminClearRankingBtn = document.getElementById('admin-clear-ranking-btn');

    if (state.isAdminLoggedIn) {
        if (wixBar) wixBar.classList.remove('hidden');
        if (adminQuizToolbar) adminQuizToolbar.classList.remove('hidden');
        if (adminGalleryToolbar) adminGalleryToolbar.classList.remove('hidden');
        if (adminGiftToolbar) adminGiftToolbar.classList.remove('hidden');
        if (adminGuestToolbar) adminGuestToolbar.classList.remove('hidden');
        adminRankingCol.forEach(el => el.classList.remove('hidden'));
        if (adminClearRankingBtn) adminClearRankingBtn.classList.remove('hidden');
    } else {
        if (wixBar) wixBar.classList.add('hidden');
        if (adminQuizToolbar) adminQuizToolbar.classList.add('hidden');
        if (adminGalleryToolbar) adminGalleryToolbar.classList.add('hidden');
        if (adminGiftToolbar) adminGiftToolbar.classList.add('hidden');
        if (adminGuestToolbar) adminGuestToolbar.classList.add('hidden');
        adminRankingCol.forEach(el => el.classList.add('hidden'));
        if (adminClearRankingBtn) adminClearRankingBtn.classList.add('hidden');
    }
    renderGallery();
    renderGifts();
    renderBiography();
    refreshGiftPayments();
}

export const renderGifts = () => {
    const container = document.getElementById('gifts-container');
    if (!container) return;
    container.innerHTML = state.gifts.map(g => {
        const approvedContribs = state.contributions.filter(c => c.giftId === g.id && c.status === 'approved');
        const cur = approvedContribs.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0) + (state.giftPaymentTotals?.find(t => t.giftId === g.id)?.amountCents || 0) / 100;
        const tot = g.totalAmount || 1;
        const rem = Math.max(0, tot - cur), pct = Math.min(100, (cur / tot) * 100);
        const isDone = rem <= 0;
        return `
            <div class="bg-white rounded-3xl overflow-hidden border border-red-200 shadow-sm flex flex-col relative group">
                ${state.isAdminLoggedIn ? `
                    <div class="absolute top-3 right-3 z-20 flex gap-1 bg-white/90 p-1 rounded-xl shadow backdrop-blur">
                        <button type="button" data-edit-gift="${escapeHTML(g.id)}" class="p-1.5" title="Editar presente">Editar</button><button type="button" data-delete-gift="${escapeHTML(g.id)}" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Excluir Presente">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : ''}
                <div class="h-48 w-full bg-stone-100 relative">
                    ${g.imageUrl ? `<img src="${escapeHTML(g.imageUrl)}" class="w-full h-full object-cover"/>` : ''}
                    <span class="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-stone-700">${escapeHTML(g.category || 'Geral')}</span>
                    ${isDone ? `<div class="absolute inset-0 bg-stone-900/60 flex items-center justify-center"><span class="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold">Completo</span></div>` : ''}
                </div>
                <p class="gift-price">Valor do presente: ${Number(g.totalAmount || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</p><div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div><h3 class="font-serif text-lg font-bold text-stone-900">${escapeHTML(g.title)}</h3><p class="text-stone-500 text-xs mt-1">${escapeHTML(g.description || '')}</p></div>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs mb-1 font-semibold"><span class="text-stone-500">${cur.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span><span class="text-red-600">${pct.toFixed(0)}%</span></div>
                            <div class="w-full h-2 bg-red-100 rounded-full overflow-hidden"><div class="h-full bg-red-600" style="width: ${pct}%"></div></div>
                        </div>
                        <button type="button" ${isDone ? 'disabled' : ''} data-pix-gift="${escapeHTML(g.id)}" class="w-full py-3 rounded-xl text-sm font-bold transition-all ${isDone ? 'bg-stone-100 text-stone-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer'}">
                            ${isDone ? 'Concluído' : 'Quero presentear'}
                        </button>
                        <button type="button" data-confirm-gift="${escapeHTML(g.id)}" class="gift-store-link">Confirmar pagamento / compra na loja</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) window.lucide?.createIcons();
};

window.deleteGift = (id) => {
    if (!state.isAdminLoggedIn) return;
    window.openDeleteModal("Deseja realmente excluir este presente?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gifts', id));
            window.showToast("Presente excluído com sucesso!");
        } catch(e) { window.showToast("Erro ao excluir presente.", true); }
    });
};

window.openAddGiftModal = () => {
    if (!state.isAdminLoggedIn) return window.showToast('Entre no painel para cadastrar presentes.', true);
    document.getElementById('gift-modal-heading').textContent = 'Adicionar presente';
    document.getElementById('form-add-gift').reset();
    document.getElementById('ag-id').value = '';
    for (const id of ['ag-image','ag-qr']) document.getElementById(id).dispatchEvent(new Event('input'));
    document.getElementById('modal-add-gift').style.display = 'flex';
};
window.closeAddGiftModal = () => { document.getElementById('modal-add-gift').style.display = 'none'; };

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'form-add-gift') {
        e.preventDefault();
        if (!state.isAdminLoggedIn) return window.showToast('Acesso restrito aos noivos.', true);
        if (e.target.dataset.saving) return;
        const storeUrl = safeStoreUrl(document.getElementById('ag-store').value);
        if (document.getElementById('ag-store').value.trim() && !storeUrl) return window.showToast('Use um link HTTPS válido para a loja.', true);
        const paymentUrl = safeStoreUrl(document.getElementById('ag-payment').value);
        if (document.getElementById('ag-payment').value.trim() && !paymentUrl) return window.showToast('Use um link HTTPS válido para pagamento.', true);
        const qrInput = document.getElementById('ag-qr');
        if (qrInput.dataset.imageBusy) return window.showToast('Aguarde o QR code.', true);
        if (qrInput.value && !validImageSource(qrInput.value)) return window.showToast('Envie uma imagem válida do QR code.', true);
        const amount = Number(document.getElementById('ag-amount').value);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) return window.showToast('Informe um valor de presente válido.', true);
        const giftObj = {
            storeUrl, paymentUrl, qrImageUrl: qrInput.value.trim(),
            title: document.getElementById('ag-title').value.trim(),
            totalAmount: amount,
            category: document.getElementById('ag-category').value.trim() || 'Geral',
            imageUrl: document.getElementById('ag-image').value.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
            description: document.getElementById('ag-desc').value.trim()
        };
        const photoInput = document.getElementById('ag-image');
        if (photoInput.dataset.imageBusy) return window.showToast('Aguarde a preparação da foto.', true);
        if (photoInput.value && !validImageSource(photoInput.value)) return window.showToast('Envie uma foto ou cole um link direto de imagem.', true);
        try {
            e.target.dataset.saving = 'true';
            const id = document.getElementById('ag-id').value;
            if (id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gifts', id), giftObj);
            else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gifts'), giftObj);
            document.getElementById('modal-add-gift').style.display = 'none';
            e.target.reset();
            window.showToast("Presente salvo com sucesso!");
        } catch(err) { window.showToast("Erro ao adicionar presente.", true); }
        finally { delete e.target.dataset.saving; }
    }
});

const startFirebase = async () => {
    seedPreview(db, appId, state);
    if (!isPreview) onAuthStateChanged(auth, async (user) => {
        try {
            const adminSnap = user ? await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', user.uid)) : null;
            if (auth.currentUser?.uid !== user?.uid) return;
            state.isAdminLoggedIn = Boolean(adminSnap?.exists() && adminSnap.data().active === true);
        } catch (error) {
            state.isAdminLoggedIn = false;
            window.showToast('Não foi possível verificar a permissão de administrador. Confira conexão e regras do Firebase.', true);
        }
        if (!state.isAdminLoggedIn && document.body.dataset.adminView === 'true') window.switchTab('home');
        updateEditorUI();
    });

    const reportSyncError = (area, error) => {
        console.error(`Erro ao sincronizar ${area}:`, error);
        window.showToast(`Não foi possível atualizar ${area}. Verifique sua conexão.`, true);
    };

    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), snap => {
        if (snap.exists()) {
            const { adminPass: _legacyPassword, ...publicSettings } = snap.data();
            state.settings = { ...state.settings, ...publicSettings };
            updateSpotify(state.settings.radioUrl);
            updateSiteContent();
            
            if (document.getElementById('config-inputs-container').dataset.dirty) return;
            const cfgNames = document.getElementById('cfg-names');
            const cfgDate = document.getElementById('cfg-date');
            const cfgLoc = document.getElementById('cfg-location');
            const cfgMaps = document.getElementById('cfg-maps');
            const cfgPix = document.getElementById('cfg-pix');
            const cfgReceiver = document.getElementById('cfg-receiver');
            const cfgCity = document.getElementById('cfg-city');
            const cfgWhatsapp = document.getElementById('cfg-whatsapp');
            const cfgHomepageImg = document.getElementById('cfg-homepage-img');
            const cfgRadio = document.getElementById('cfg-radio');
            const cfgPosition = document.getElementById('cfg-hero-position');
            if (cfgPosition) cfgPosition.value = state.settings.heroPosition || '65';

            if (cfgNames && state.settings.names) cfgNames.value = state.settings.names;
            if (cfgDate && state.settings.date) cfgDate.value = state.settings.date;
            if (cfgLoc && state.settings.location) cfgLoc.value = state.settings.location;
            if (cfgMaps && state.settings.maps) cfgMaps.value = state.settings.maps;
            if (cfgPix) cfgPix.value = state.settings.pixKey || '';
            if (cfgReceiver && state.settings.receiverName) cfgReceiver.value = state.settings.receiverName;
            if (cfgCity && state.settings.cityName) cfgCity.value = state.settings.cityName;
            if (cfgWhatsapp && state.settings.whatsappNumber) cfgWhatsapp.value = state.settings.whatsappNumber;
            if (cfgHomepageImg && state.settings.homepageImg) cfgHomepageImg.value = state.settings.homepageImg;
            if (cfgRadio) cfgRadio.value = state.settings.radioUrl || '';
        } else {
            updateSpotify(DEFAULT_SPOTIFY_URL);
        }
    }, error => {
        reportSyncError('as configurações', error);
        document.getElementById('spotify-embed-wrapper').textContent = 'Não foi possível carregar a playlist salva. Recarregue a página.';
    });

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gifts'), snap => {
        state.gifts = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderGifts();
    }, error => reportSyncError('os presentes', error));

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'timeline'), snap => {
        state.timeline = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderBiography();
    }, error => reportSyncError('a história', error));

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), snap => {
        state.gallery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGallery();
    }, error => reportSyncError('a galeria', error));

    // Moderated wall is served by the callable endpoint, never the legacy public collection.

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'guests'), snap => {
        state.guests = snap.docs.map(d => ({id: d.id, ...d.data()}));
        if (state.isAdminLoggedIn) renderAdmin();
        refreshMural();
    }, error => reportSyncError('os convidados', error));

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'contributions'), snap => {
        state.contributions = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderGifts();
    }, error => reportSyncError('as contribuições', error));


};

const updateSiteContent = () => {
    const elNames = document.getElementById('hero-names');
    const elLoc = document.getElementById('hero-location');
    const elMaps = document.getElementById('hero-maps-link');
    const elImg = document.getElementById('homepage-couple-img');
    const elDate = document.getElementById('hero-date');

    if (elNames && state.settings.names) elNames.innerText = state.settings.names;
    if (elLoc && state.settings.location) elLoc.innerText = state.settings.location;
    if (elMaps && state.settings.maps) elMaps.href = state.settings.maps;
    if (elImg) {
        const source = state.settings.homepageImg || '';
        elImg.src = validImageSource(source) ? source : './assets/wedding/hero-rings.png';
        elImg.style.objectPosition = 'center ' + (state.settings.heroPosition ?? 65) + '%';
        elImg.onerror = () => { elImg.onerror = null; elImg.src = './assets/wedding/hero-rings.png'; };
    }
    
    if (state.settings.date && elDate) {
        const dateObj = new Date(state.settings.date);
        if (!isNaN(dateObj.getTime())) {
            elDate.innerText = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    renderGifts();
    renderGallery();
    initMural();
    window.lucide?.createIcons();
    startFirebase();
    initBiography();
    initGifts();
    initAdmin();
    document.getElementById('config-inputs-container').addEventListener('input', () => { document.getElementById('config-inputs-container').dataset.dirty = 'true'; });
    initSpotify();
    initBackgrounds();
    initGuests();
    initMotion();
    mountImageInput('cfg-homepage-img', 'capa do casal');
    mountImageInput('ag-image', 'presente');
    mountImageInput('ag-qr', 'QR code dos noivos');
    document.getElementById('ag-qr').nextElementSibling.querySelector('.upload-choice > span').textContent = 'Enviar QR code';
    document.getElementById('cfg-homepage-img').addEventListener('input', e => {
        if (validImageSource(e.target.value)) document.getElementById('homepage-couple-img').src = e.target.value;
    });
    document.getElementById('cfg-hero-position').addEventListener('input', e => {
        document.getElementById('homepage-couple-img').style.objectPosition = 'center ' + e.target.value + '%';
    });
    if (isPreview) {
        const banner = document.createElement('div');
        banner.className = 'preview-banner';
        banner.textContent = 'PRÉVIA LOCAL · dados fictícios · Painel do Casal abre o editor de teste';
        document.body.prepend(banner);
    }
    updateSiteContent();

    const rsvpInput = document.getElementById('rsvp-search-input');
    const rsvpSuggestions = document.getElementById('rsvp-suggestions');
    const rsvpDetails = document.getElementById('rsvp-details-card');

    if (rsvpInput && rsvpSuggestions) {
        rsvpInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                rsvpSuggestions.classList.add('hidden');
                return;
            }
            const matches = state.guests.filter(g => g.mainName && g.mainName.toLowerCase().includes(query));
            if (!matches.length) {
                rsvpSuggestions.innerHTML = `<div class="p-3 text-xs text-stone-400">Nenhum convidado encontrado.</div>`;
                rsvpSuggestions.classList.remove('hidden');
                return;
            }
            rsvpSuggestions.innerHTML = matches.map(g => `
                <div class="p-3 hover:bg-stone-100 rounded-xl text-xs font-semibold cursor-pointer text-stone-800 transition-colors border-b last:border-0" data-guest-id="${g.id}">
                    ${escapeHTML(g.mainName)} <span class="text-[10px] text-stone-400 block font-normal">${(g.companions || []).length} acompanhante(s)</span>
                </div>
            `).join('');
            rsvpSuggestions.classList.remove('hidden');
        });

        rsvpSuggestions.addEventListener('click', (e) => {
            const item = e.target.closest('[data-guest-id]');
            if (!item) return;
            const guestId = item.dataset.guestId;
            const found = state.guests.find(g => g.id === guestId);
            if (found) {
                state.selectedRsvpGuest = found;
                rsvpInput.value = found.mainName;
                rsvpSuggestions.classList.add('hidden');
                document.getElementById('rsvp-selected-name').innerText = found.mainName;
                document.getElementById('rsvp-companions-list').innerHTML = (found.companions && found.companions.length) ? 
                    found.companions.map(c => `<div class="flex justify-between bg-white p-2 rounded-lg border border-stone-200"><span>${escapeHTML(c.name)}</span><span class="text-stone-400">${escapeHTML(c.relation || '')}${Number.isFinite(c.age) ? ' (' + c.age + 'a)' : ''}</span></div>`).join('') :
                    `<span class="text-stone-400">Nenhum acompanhante cadastrado.</span>`;
                rsvpDetails.classList.remove('hidden');
                window.lucide?.createIcons();
            }
        });
    }
});

window.setAttendanceStatus = async (status) => {
    if (!state.selectedRsvpGuest) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'guests', state.selectedRsvpGuest.id);
        await updateDoc(docRef, { status: status ? 'confirmed' : 'declined' });
        window.showToast(status ? "Presença confirmada com sucesso!" : "Resposta registrada. Sentiremos sua falta!");
        sendWhatsAppAlert(`📋 RSVP de ${state.selectedRsvpGuest.mainName}: ${status ? 'Confirmado' : 'Ausente'}`);
        document.getElementById('rsvp-details-card').classList.add('hidden');
        document.getElementById('rsvp-search-input').value = '';
        state.selectedRsvpGuest = null;
    } catch(err) {
        window.showToast("Erro ao atualizar RSVP.", true);
    }
};

setInterval(() => {
    if (!state.settings.date) return;
    const diff = new Date(state.settings.date).getTime() - new Date().getTime();
    const countdownEl = document.getElementById('countdown');
    if (Number.isFinite(diff) && countdownEl) {
        const {days:d,hours:h,minutes:m,seconds:s} = countdownParts(diff);
        countdownEl.innerHTML = `<div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(d).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Dias</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(h).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Horas</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(m).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Min</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(s).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Seg</span></div>`;
    }
}, 1000);
