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
    const phone = state.settings.whatsappNumber?.trim() || "5541999999999";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

window.openCalendarModal = () => { document.getElementById('modal-calendar').style.display = 'flex'; lucide.createIcons(); };
window.closeCalendarModal = () => { document.getElementById('modal-calendar').style.display = 'none'; };

function getEventCalendarDetails() {
    const dateStr = state.settings.date || "2026-11-14T17:00";
    const startDate = new Date(dateStr);
    const validStart = isNaN(startDate.getTime()) ? new Date("2026-11-14T17:00") : startDate;
    const endDate = new Date(validStart.getTime() + 6 * 60 * 60 * 1000);
    const formatISO = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const names = state.settings.names || "Júnior & Renata";
    const location = state.settings.location || "Curitiba, PR";
    const mapsUrl = state.settings.maps || "https://maps.google.com";

    return {
        title: `Casamento de ${names}`,
        startISO: formatISO(validStart),
        endISO: formatISO(endDate),
        location: location,
        details: `Celebração do casamento de ${names}.\n\nLocal: ${location}\nGoogle Maps: ${mapsUrl}`
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
    t.className = `fixed top-5 right-5 z-[9999] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${err ? 'bg-red-950 border-red-700' : 'bg-stone-900 border-emerald-600'} show`;
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
        window.switchTab('admin');
        renderAdmin();
        renderGallery();
        window.showToast("Painel desbloqueado com sucesso!");
    } catch (err) {
        window.showToast("Credenciais incorretas ou acesso restrito.", true);
    }
};

window.adminLogout = async () => {
    await signOut(auth);
    state.isAdminLoggedIn = false;
    window.switchTab('home');
    renderGallery();
    window.showToast("Sessão encerrada com segurança.");
};

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
            <div class="bg-white rounded-3xl overflow-hidden border border-red-200 shadow-sm flex flex-col">
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
                        <button ${isDone ? 'disabled' : ''} onclick="window.openPixModal('${g.id}')" class="w-full py-3 rounded-xl text-sm font-bold transition-all ${isDone ? 'bg-stone-100 text-stone-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer'}">
                            ${isDone ? 'Concluído' : 'Presentear com Pix'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

const renderMural = () => {
    const container = document.getElementById('mural-container');
    if (!container) return;
    const visibleMsgs = state.messages.filter(m => !m.hidden);
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
            <article class="real-postit" style="position: absolute; left: ${x}px; top: ${y}px; width: 190px; min-height: 175px; padding: 25px 18px 18px; transform: rotate(${rot}deg); background: ${bg}; box-shadow: 0 10px 15px rgba(0,0,0,0.15);">
                <div style="font-family: var(--font-sans); font-size: 12px; font-weight: 700;">${escapeHTML(m.author)}</div>
                <span style="font-family: var(--font-sans); font-size: 9px; opacity: .65; display:block; margin-bottom:10px;">${escapeHTML(m.relation)}</span>
                <p style="font-family: var(--font-handwriting); font-size: 20px; line-height: 1.1;">${escapeHTML(m.text)}</p>
            </article>`;
    }).join('');
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
            sendWhatsAppAlert(`📌 Novo Recado no Mural!\nAutor: ${msgObj.author}\nMensagem: "${msgObj.text}"`);
        } catch(err) { window.showToast("Erro ao fixar recado.", true); }
    }
});

let threeScene = null, threeCamera = null, threeRenderer = null, heartMeshGroup = [];
const createScene = () => {
    const canvas = document.getElementById('canvas-3d-bg');
    if (!canvas) return;
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    threeCamera.position.z = 25;
    threeRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    threeRenderer.setSize(w, h);
    threeScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xff7788, 1.2); dl.position.set(10, 20, 15); threeScene.add(dl);
    
    const shape = new THREE.Shape();
    shape.moveTo(2.5, 2.5); shape.bezierCurveTo(2.5, 2.5, 2.0, 0, 0, 0); shape.bezierCurveTo(-3, 0, -3, 3.5, -3, 3.5);
    shape.bezierCurveTo(-3, 5.5, -1, 7.7, 2.5, 9.5); shape.bezierCurveTo(6, 7.7, 8, 5.5, 8, 3.5); shape.bezierCurveTo(8, 3.5, 8, 0, 5, 0); shape.bezierCurveTo(3.5, 0, 2.5, 2.5, 2.5, 2.5);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.3, bevelThickness: 0.3 }); geo.center();
    const mat = new THREE.MeshPhongMaterial({ color: 0xbe8a7d, emissive: 0x4a2b25, specular: 0xffffff, shininess: 60, transparent: true, opacity: 0.85 });
    
    for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 18);
        mesh.scale.setScalar(Math.random() * 0.2 + 0.15);
        mesh.userData = { speedY: Math.random() * 0.02 + 0.01, rotX: (Math.random() - 0.5) * 0.02, rotY: (Math.random() - 0.5) * 0.02 };
        threeScene.add(mesh); heartMeshGroup.push(mesh);
    }
    const animate = () => {
        requestAnimationFrame(animate);
        heartMeshGroup.forEach(hm => { hm.position.y += hm.userData.speedY; hm.rotation.x += hm.userData.rotX; if (hm.position.y > 18) hm.position.y = -18; });
        threeRenderer.render(threeScene, threeCamera);
    };
    animate();
};

const startFirebase = async () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', user.uid));
            state.isAdminLoggedIn = adminSnap.exists() && adminSnap.data().active;
        } else {
            state.isAdminLoggedIn = false;
        }
        renderGallery();
        if (state.isAdminLoggedIn) renderAdmin();
    });

    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), snap => {
        if (snap.exists()) { state.settings = { ...state.settings, ...snap.data() }; updateSiteContent(); }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gifts'), snap => {
        if (!snap.empty) { state.gifts = snap.docs.map(d => ({id: d.id, ...d.data()})); renderGifts(); }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'timeline'), snap => {
        if (!snap.empty) { state.timeline = snap.docs.map(d => ({id: d.id, ...d.data()})); if(state.isAdminLoggedIn) renderAdmin(); }
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), snap => {
        state.gallery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGallery();
        if (state.isAdminLoggedIn) renderAdmin();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), snap => {
        state.messages = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderMural(); if(state.isAdminLoggedIn) renderAdmin();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'guests'), snap => {
        state.guests = snap.docs.map(d => ({id: d.id, ...d.data()}));
        if(state.isAdminLoggedIn) renderAdmin();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'contributions'), snap => {
        state.contributions = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderGifts(); if(state.isAdminLoggedIn) renderAdmin();
    }, () => {});

    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), snap => {
        state.rankings = snap.docs.map(d => d.data()).sort((a,b) => b.score - a.score);
        renderRanking();
    }, () => {});
};

const updateSiteContent = () => {
    const elNames = document.getElementById('hero-names');
    const elLoc = document.getElementById('hero-location');
    const elMaps = document.getElementById('hero-maps-link');
    const elImg = document.getElementById('homepage-couple-img');
    const elDate = document.getElementById('hero-date');

    if (elNames) elNames.innerText = state.settings.names;
    if (elLoc) elLoc.innerText = state.settings.location;
    if (elMaps) elMaps.href = state.settings.maps || "#";
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
    createScene();
    lucide.createIcons();
    startFirebase();
    initQuiz();
    initAdmin();

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
                <div class="p-3 hover:bg-red-50 text-xs font-semibold cursor-pointer border-b last:border-0 text-stone-800" data-guest-id="${g.id}">
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
        sendWhatsAppAlert(`📋 Atualização de RSVP!\nConvidado: ${state.selectedRsvpGuest.mainName}\nStatus: ${status ? 'CONFIRMADO ✅' : 'AUSENTE ❌'}`);
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
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)), h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)), s = Math.floor((diff % (1000 * 60)) / 1000);
        countdownEl.innerHTML = `<div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(d).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Dias</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(h).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Horas</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(m).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Min</span></div><div class="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><span class="block font-serif text-4xl font-bold text-red-600">${String(s).padStart(2,'0')}</span><span class="text-xs uppercase text-stone-500">Seg</span></div>`;
    }
}, 1000);
