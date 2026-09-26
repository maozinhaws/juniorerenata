import { participants } from './guests.js';
import { state, auth, escapeHTML } from './firebase-init.js';
import { isPreview } from './data-store.js';
import { mountImageInput } from './image-input.js?v=20260925-2329';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';

const previewKey = 'wedding-mural-preview-v1';
let requestId = crypto.randomUUID();
let busy = false;
let rows = [];
let poll;
let selectedGuest = null;
async function api(action, payload = {}) {
    if (!isPreview) return (await httpsCallable(getFunctions(auth.app), 'weddingMural')({ action, ...payload })).data;
    let saved = JSON.parse(localStorage.getItem(previewKey) || '[]');
    if (action === 'submit') {
        const person = participants().find(p => p.key === payload.guestId);
        if (!person) throw new Error('Selecione seu nome na lista.');
        if (saved.some(row => row.requestId === payload.requestId)) return {};
        if (saved.filter(row => row.guestId === payload.guestId).length >= 2) throw new Error('Este convidado já enviou os dois recados permitidos.');
        saved.push({ ...payload, id: crypto.randomUUID(), author: person.name, status: 'pending', timestamp: new Date().toISOString() });
        localStorage.setItem(previewKey, JSON.stringify(saved));
    }
    if (action === 'moderate') {
        saved = saved.map(row => row.id === payload.id ? { ...row, status: payload.status } : row);
        localStorage.setItem(previewKey, JSON.stringify(saved));
    }
    return { rows: saved.filter(row => state.isAdminLoggedIn || row.status === 'approved') };
}
function paint() {
    const container = document.getElementById('mural-container');
    container.style.minHeight = '0';
    container.className = 'memory-grid';
    const published = rows.filter(row => row.status === 'approved');
    container.innerHTML = published.length ? published.map(row => '<article class="memory-note ' + (row.image ? 'has-photo ' : '') + 'note-' + (['yellow','pink','green','blue'].includes(row.color) ? row.color : 'yellow') + '"><span class="board-pin" aria-hidden="true"></span>' +
        (row.image ? '<img loading="lazy" src="' + escapeHTML(row.image) + '" alt="Foto enviada por ' + escapeHTML(row.author) + '">' : '') +
        '<div class="sticky-paper"><p>' + escapeHTML(row.text) + '</p><footer>' + escapeHTML(row.author) + '</footer></div></article>').join('') :
        '<p class="empty-memory">Os primeiros votos de carinho estão a caminho. Deixe o seu!</p>';
    const queue = document.getElementById('mural-moderation');
    queue.hidden = !state.isAdminLoggedIn;
    if (!state.isAdminLoggedIn) return;
    queue.innerHTML = '<h3>Recados para aprovar</h3>' + rows.filter(row => row.status === 'pending').map(row =>
        '<article class="moderation-note"><strong>' + escapeHTML(row.author) + '</strong><p>' + escapeHTML(row.text) + '</p>' +
        (row.image ? '<img src="' + escapeHTML(row.image) + '" alt="Foto aguardando aprovação">' : '') +
        '<button data-moderate="' + row.id + '" data-status="approved">Aprovar</button><button data-moderate="' + row.id + '" data-status="rejected">Recusar</button></article>').join('') +
        (rows.some(row => row.status === 'pending') ? '' : '<p>Nenhum recado pendente.</p>');
}
export async function refreshMural() {
    try {
        const result = await api('list');
        rows = result.rows || []; paint();
        document.getElementById('mural-service-status').textContent = isPreview ? 'Demonstração local · selecione um nome cadastrado na prévia' : '';
    } catch (e) {
        document.getElementById('mural-service-status').textContent = 'O mural está temporariamente indisponível. Seu recado não foi enviado.';
        console.error('Mural:', e);
    }
}
export function initMural() {
    mountImageInput('mural-image', 'opcional');
    const form = document.getElementById('form-mural');
    const nameInput = document.getElementById('mural-name');
    const suggestions = document.getElementById('mural-suggestions');
    nameInput.addEventListener('input', () => {
        selectedGuest = null;
        const query = nameInput.value.trim().toLocaleLowerCase();
        suggestions.hidden = query.length < 2;
        if (suggestions.hidden) return;
        const matches = participants().filter(p => p.name.toLocaleLowerCase().includes(query)).slice(0, 12);
        suggestions.innerHTML = matches.map(p => '<button type="button" data-person="' + escapeHTML(p.key) + '">' + escapeHTML(p.name) + '<small>Convite de ' + escapeHTML(p.group) + '</small></button>').join('') || '<p>Nome não encontrado na lista.</p>';
    });
    suggestions.addEventListener('click', event => {
        const option = event.target.closest('[data-person]');
        if (!option) return;
        selectedGuest = participants().find(p => p.key === option.dataset.person);
        nameInput.value = selectedGuest.name;
        suggestions.hidden = true;
    });
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (busy) return;
        if (!selectedGuest || nameInput.value !== selectedGuest.name) return window.showToast('Selecione seu nome nas sugestões.', true);
        const image = document.getElementById('mural-image');
        if (image.dataset.imageBusy) return window.showToast('Aguarde a preparação da foto.', true);
        // Guest media must be a decoded/re-encoded upload; remote links are not accepted.
        if (image.value && !/^data:image\/jpeg;base64,/.test(image.value)) return window.showToast('Escolha ou cole o arquivo da foto.', true);
        busy = true;
        const button = form.querySelector('[type=submit]');
        button.disabled = true;
        try {
            await api('submit', { guestId: selectedGuest.key, color: form.querySelector('[name=postit-color]:checked')?.value || 'yellow', text: document.getElementById('mural-text').value.trim(), image: image.value, requestId });
            selectedGuest = null; form.reset(); form.querySelectorAll('.photo-editor img').forEach(img => img.hidden = true);
            requestId = crypto.randomUUID();
            window.showToast('Recado recebido! Ele aparecerá após aprovação dos noivos.');
            await refreshMural();
        } catch (error) { window.showToast(error.message || 'Não foi possível enviar. Tente novamente.', true); }
        finally { busy = false; button.disabled = false; }
    });
    document.getElementById('mural-moderation').addEventListener('click', async e => {
        const button = e.target.closest('[data-moderate]');
        if (!button) return;
        button.disabled = true;
        try { await api('moderate', { id: button.dataset.moderate, status: button.dataset.status }); await refreshMural(); }
        catch (error) { window.showToast(error.message, true); button.disabled = false; }
    });
    refreshMural();
    poll = setInterval(() => { if (!document.hidden && document.getElementById('tab-mural').classList.contains('active')) refreshMural(); }, 30000);
    window.addEventListener('pagehide', () => clearInterval(poll), { once: true });
}
