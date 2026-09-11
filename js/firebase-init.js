import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initQuiz, renderRanking } from './quiz.js';
import { renderGallery } from './gallery.js';
import { initAdmin, renderAdmin } from './admin.js';

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
export const db = getFirestore(app);
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
        pixKey: "12345678900", receiverName: "Júnior e Renata", cityName: "Curitiba", radioUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        whatsappNumber: "5541999999999",
        homepageImg: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80"
    }
};

export function sendWhatsAppAlert(text) {
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

window.openCalendarModal = () => { document.getElementById('modal-calendar').style.display = 'flex'; lucide.createIcons(); };
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
    lucide.createIcons();
};
window.closeDeleteModal = () => { state.pendingDelete = null; document.getElementById('modal-delete-confirm').style.display = 'none'; };
window.confirmPendingDelete = async () => { const act = state.pendingDelete; window.closeDeleteModal(); if (typeof act === 'function') await act(); };

window.toggleSidebar = () => {
    state.isSidebarCollapsed = !state.isSidebarCollapsed;
    const sidebar = document.getElementById('app-sidebar');
    const main = document.getElementById('main-content');
    const musicDock = document.getElementById('music-dock');
    const labels = document.querySelectorAll('.sidebar-label');

    if (state.isSidebarCollapsed) {
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.add('sidebar-collapsed');
        main.classList.remove('ml-[270px]');
        main.classList.add('ml-[90px]');
        musicDock.classList.remove('left-[270px]');
        musicDock.classList.add('left-[90px]');
        labels.forEach(l => l.style.opacity = '0');
    } else {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');
        main.classList.remove('ml-[90px]');
        main.classList.add('ml-[270px]');
        musicDock.classList.remove('left-[90px]');
        musicDock.classList.add('left-[270px]');
        setTimeout(() => labels.forEach(l => l.style.opacity = '1'), 150);
    }
};

window.showToast = (msg, err = false) => {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    t.className = `fixed top-16 right-5 z-[9999] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${err ? 'bg-red-950 border-red-700' : 'bg-stone-900 border-emerald-600'} show`;
    document.getElementById('toast-icon').setAttribute('data-lucide', err ? 'alert-circle' : 'check-circle-2');
    lucide.createIcons();
    setTimeout(() => { t.className = t.className.replace('show', ''); }, 4000);
};

export const escapeHTML = v => (v == null ? '' : String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])));

document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab], [data-action]');
    if (!btn) return;
    if (btn.dataset.tab) window.switchTab(btn.dataset.tab);
    else if (btn.dataset.action) {
        const act = btn.dataset.action;
        if (act === 'toggle-music') window.toggleMusicWidget();
        if (act === 'open-admin') window.openAdminModal();
        if (act === 'close-admin') window.closeAdminModal();
        if (act === 'close-pix') window.closePixModal();
        if (act === 'generate-pix') window.generatePix();
        if (act === 'copy-pix') window.copyPix();
        if (act === 'confirm-pix') window.confirmContribution();
        if (act === 'open-add-gift') window.openAddGiftModal();
        if (act === 'close-add-gift') window.closeAddGiftModal();
        if (act === 'open-add-guest') window.openAddGuestModal();
        if (act === 'close-add-guest') window.closeAddGuestModal();
        if (act === 'open-add-timeline') window.openAddTimelineModal();
        if (act === 'close-add-timeline') window.closeAddTimelineModal();
        if (act === 'open-add-gallery') window.openAddGalleryModal();
        if (act === 'close-add-gallery') window.closeAddGalleryModal();
        if (act === 'add-companion-row') window.addCompanionRow();
        if (act === 'toggle-sidebar') window.toggleSidebar();
    }
});

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId)?.classList.add('active');
    document.querySelectorAll('.sidebar-nav-btn').forEach(b => {
        b.className = b.dataset.tab === tabId ? 
            "sidebar-nav-btn w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all bg-red-600 text-white shadow-sm cursor-pointer whitespace-nowrap" : 
            "sidebar-nav-btn w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all hover:bg-red-100 hover:text-red-700 cursor-pointer whitespace-nowrap";
    });
    if (tabId === 'mural') setTimeout(() => renderMural(), 50);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openAdminModal = () => {
    if (auth.currentUser && state.isAdminLoggedIn) { window.switchTab('admin'); renderAdmin(); return; }
    document.getElementById('modal-admin-login').style.display = 'flex';
};
window.closeAdminModal = () => document.getElementById('modal-admin-login').style.display = 'none';

window.submitAdminLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-input-email').value.trim();
    const pass = document.getElementById('admin-input-pass').value.trim();
    if (!email || !pass) return window.showToast("Preencha e-mail e senha!", true);

    try {
        window.showToast("Autenticando...");
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;
        const adminDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'admins', uid);
        const adminSnap = await getDoc(adminDocRef);

        if (!adminSnap.exists() || !adminSnap.data().active) {
            await signOut(auth);
            return window.showToast("Acesso Negado: Conta sem privilégios de administrador.", true);
        }

        state.isAdminLoggedIn = true;
        window.closeAdminModal();
        window.switchTab('home');
        updateEditorUI();
        window.showToast("Modo de Edição ativado (Wix Style)!");
    } catch (err) {
        window.showToast("Credenciais incorretas ou acesso restrito.", true);
    }
};

window.adminLogout = async () => {
    await signOut(auth);
    state.isAdminLoggedIn = false;
    updateEditorUI();
    window.switchTab('home');
    window.showToast("Sessão encerrada com segurança.");
};

function updateEditorUI() {
    const wixBar = document.getElementById('wix-admin-bar');
    const adminQuizToolbar = document.getElementById('admin-quiz-toolbar');
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
    renderRanking();
}

const renderGifts = () => {
    const container = document.getElementById('gifts-container');
    if (!container) return;
    container.innerHTML = state.gifts.map(g => {
        const approvedContribs = state.contributions.filter(c => c.giftId === g.id && c.status === 'approved');
        const cur = approvedContribs.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
        const tot = g.totalAmount || 1;
        const rem = Math.max(0, tot - cur), pct = Math.min(100, (cur / tot) * 100);
        const isDone = rem <= 0;
        return `
            <div class="bg-white rounded-3xl overflow-hidden border border-red-200 shadow-sm flex flex-col relative group">
                ${state.isAdminLoggedIn ? `
                    <div class="absolute top-3 right-3 z-20 flex gap-1 bg-white/90 p-1 rounded-xl shadow backdrop-blur">
                        <button type="button" onclick="window.deleteGift('${g.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Excluir Presente">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                ` : ''}
                <div class="h-48 w-full bg-stone-100 relative">
                    ${g.imageUrl ? `<img src="${escapeHTML(g.imageUrl)}" class="w-full h-full object-cover"/>` : ''}
                    <span class="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-stone-700">${escapeHTML(g.category || 'Geral')}</span>
                    ${isDone ? `<div class="absolute inset-0 bg-stone-900/60 flex items-center justify-center"><span class="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold">Completo</span></div>` : ''}
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div><h3 class="font-serif text-lg font-bold text-stone-900">${escapeHTML(g.title)}</h3><p class="text-stone-500 text-xs mt-1">${escapeHTML(g.description || '')}</p></div>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs mb-1 font-semibold"><span class="text-stone-500">R$ ${cur.toFixed(2)}</span><span class="text-red-600">${pct.toFixed(0)}%</span></div>
                            <div class="w-full h-2 bg-red-100 rounded-full overflow-hidden"><div class="h-full bg-red-600" style="width: ${pct}%"></div></div>
                        </div>
                        <button type="button" ${isDone ? 'disabled' : ''} onclick="window.openPixModal('${g.id}')" class="w-full py-3 rounded-xl text-sm font-bold transition-all ${isDone ? 'bg-stone-100 text-stone-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer'}">
                            ${isDone ? 'Concluído' : 'Presentear com Pix'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
};

window.deleteGift = (id) => {
    window.openDeleteModal("Deseja realmente excluir este presente?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gifts', id));
            window.showToast("Presente excluído com sucesso!");
        } catch(e) { window.showToast("Erro ao excluir presente.", true); }
    });
};

const renderMural = () => {
    const container = document.getElementById('mural-container');
    if (!container) return;
    const visibleMsgs = state.messages.filter(m => state.isAdminLoggedIn || !m.hidden);
    if (!visibleMsgs.length) {
        container.innerHTML = `<div class="absolute inset-0 flex flex-col items-center justify-center text-center text-stone-300 pointer-events-none py-20"><div class="text-6xl mb-4 opacity-75">📌</div><p class="font-serif text-2xl">O mural ainda está vazio</p></div>`;
        return;
    }
    const isMobile = window.innerWidth <= 640;
    container.style.minHeight = `${Math.max(850, Math.ceil(visibleMsgs.length / (isMobile ? 2 : 3)) * 215 + 80)}px`;
    container.innerHTML = visibleMsgs.map((m, i) => {
        const cols = isMobile ? 2 : 3, colWidth = (container.clientWidth || 860) / cols;
        const x = Math.max(10, Math.min(cols * colWidth - 190 - 10, (i % cols) * colWidth + (colWidth - 190) / 2 + (Math.sin(i * 3) * 16)));
        const y = 30 + Math.floor(i / cols) * 210 + (Math.cos(i * 2) * 12);
        const rot = [-5, -3, 1.5, 3, -4, 4][i % 6];
        const bg = { yellow: '#fff59d', pink: '#ffd0dc', green: '#d2f5c8', blue: '#cceeff' }[m.color || 'yellow'];
        return `
            <article class="real-postit group relative" style="position: absolute; left: ${x}px; top: ${y}px; width: 190px; min-height: 175px; padding: 25px 18px 18px; transform: rotate(${rot}deg); background: ${bg}; box-shadow: 0 10px 15px rgba(0,0,0,0.15);">
                ${state.isAdminLoggedIn ? `
                    <div class="absolute top-2 right-2 flex gap-1 z-20">
                        <button type="button" onclick="window.deleteMessage('${m.id}')" class="p-1 bg-red-600 text-white rounded shadow text-[10px] cursor-pointer" title="Excluir Recado">✕</button>
                    </div>
                ` : ''}
                <div style="font-family: var(--font-sans); font-size: 12px; font-weight: 700;">${escapeHTML(m.author)}</div>
                <span style="font-family: var(--font-sans); font-size: 9px; opacity: .65; display:block; margin-bottom:10px;">${escapeHTML(m.relation)}</span>
                <p style="font-family: var(--font-handwriting); font-size: 20px; line-height: 1.1;">${escapeHTML(m.text)}</p>
            </article>`;
    }).join('');
};

window.deleteMessage = (id) => {
    window.openDeleteModal("Deseja realmente excluir este recado do mural?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', id));
            window.showToast("Recado excluído com sucesso!");
        } catch(e) { window.showToast("Erro ao excluir recado.", true); }
    });
};

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'form-mural') {
        e.preventDefault();
        const msgObj = {
            author: document.getElementById('mural-author').value.trim(),
            relation: document.getElementById('mural-relation').value.trim() || 'Convidado(a)',
            text: document.getElementById('mural-text').value.trim(),
            color: document.querySelector('input[name="postit-color"]:checked')?.value || 'yellow',
            hidden: false,
            timestamp: new Date().toISOString()
        };
        e.target.reset();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), msgObj);
            window.showToast("Post-it fixado no mural!");
            sendWhatsAppAlert(`📌 Novo Recado no Mural de ${msgObj.author}`);
        } catch(err) { window.showToast("Erro ao fixar recado.", true); }
    }
    if (e.target && e.target.id === 'form-add-gift') {
        e.preventDefault();
        const giftObj = {
            title: document.getElementById('ag-title').value.trim(),
            totalAmount: parseFloat(document.getElementById('ag-amount').value) || 100,
            category: document.getElementById('ag-category').value.trim() || 'Geral',
            imageUrl: document.getElementById('ag-image').value.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
            description: document.getElementById('ag-desc').value.trim()
        };
        document.getElementById('modal-add-gift').style.display = 'none';
        e.target.reset();
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gifts'), giftObj);
            window.showToast("Presente adicionado com sucesso!");
        } catch(err) { window.showToast("Erro ao adicionar presente.", true); }
    }
});

const startFirebase = async () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', user.uid));
            state.isAdminLoggedIn = adminSnap.exists() && adminSnap.data().active;
        } else {
            state.isAdminLoggedIn = false;
        }
        updateEditorUI();
    });

    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), snap => {
        if (snap.exists()) {
            state.settings = { ...state.settings, ...snap.data() };
            updateSiteContent();
            
            const cfgNames = document.getElementById('cfg-names');
            const cfgDate = document.getElementById('cfg-date');
            const cfgLoc = document.getElementById('cfg-location');
            const cfgMaps = document.getElementById('cfg-maps');
            const cfgPix = document.getElementById('cfg-pix');
            const cfgReceiver = document.getElementById('cfg-receiver');
            const cfgCity = document.getElementById('cfg-city');
            const cfgWhatsapp = document.getElementById('cfg-whatsapp');
            const cfgHomepageImg = document.getElementById('cfg-homepage-img');

            if (cfgNames && state.settings.names) cfgNames.value = state.settings.names;
            if (cfgDate && state.settings.date) cfgDate.value = state.settings.date;
            if (cfgLoc && state.settings.location) cfgLoc.value = state.settings.location;
            if (cfgMaps && state.settings.maps) cfgMaps.value = state.settings.maps;
            if (cfgPix && state.settings.pixKey) cfgPix.value = state.settings.pixKey;
            if (cfgReceiver && state.settings.receiverName) cfgReceiver.value = state.settings.receiverName;
            if (cfgCity && state.settings.cityName) cfgCity.value = state.settings.cityName;
            if (cfgWhatsapp && state.settings.whatsappNumber) cfgWhatsapp.value = state.settings.whatsappNumber;
            if (cfgHomepageImg && state.settings.homepageImg) cfgHomepageImg.value = state.settings.homepageImg;
        }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gifts'), snap => {
        if (!snap.empty) { state.gifts = snap.docs.map(d => ({id: d.id, ...d.data()})); renderGifts(); }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'timeline'), snap => {
        if (!snap.empty) { state.timeline = snap.docs.map(d => ({id: d.id, ...d.data()})); }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), snap => {
        state.gallery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGallery();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), snap => {
        state.messages = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderMural();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'guests'), snap => {
        state.guests = snap.docs.map(d => ({id: d.id, ...d.data()}));
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'contributions'), snap => {
        state.contributions = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderGifts();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), snap => {
        state.rankings = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.score - a.score);
        renderRanking();
    }, () => {});
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
    if (elImg && state.settings.homepageImg) elImg.src = state.settings.homepageImg;
    
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
    renderMural();
    lucide.createIcons();
    startFirebase();
    initQuiz();
    initAdmin();
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
                    found.companions.map(c => `<div class="flex justify-between bg-white p-2 rounded-lg border border-stone-200"><span>${escapeHTML(c.name)}</span><span class="text-stone-400">${escapeHTML(c.relation)} (${c.age}a)</span></div>`).join('') :
                    `<span class="text-stone-400">Nenhum acompanhante cadastrado.</span>`;
                rsvpDetails.classList.remove('hidden');
                lucide.createIcons();
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
    if (diff > 0 && countdownEl) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)), h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60 * 60)), s = Math.floor((diff % (1000 * 60)) / 1000);
        countdownEl.innerHTML = `<div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(d).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Dias</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(h).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Horas</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(m).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Min</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(s).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Seg</span></div>`;
    }
}, 1000);
