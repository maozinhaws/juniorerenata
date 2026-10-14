import { boardLayout } from './board-layout.js';
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
let board3D, boardLoading, openMemory, demoMode = false;
const demoMessages = ['Que nunca faltem dança e boas risadas nessa casa!', 'Um brinde a vocês e a todas as histórias que ainda vão viver.', 'Amor é encontrar companhia até para as pequenas aventuras.', 'Que o carinho de hoje acompanhe vocês todos os dias.', 'Prometemos dançar até o último acorde!', 'Felicidade é celebrar esse encontro com vocês.'];
const demoRows = isPreview ? Array.from({length:12},(_,i)=>({id:'visual-demo-'+i,author:'Recado demonstrativo '+(i+1),text:demoMessages[i%6],color:['yellow','pink','blue','green'][i%4],status:'approved',image:i%3===0?'./assets/wedding/'+['renata.png','junior.png','rings.png','hero-rings.png'][Math.floor(i/3)]:''})) : [];
function displayedRows() {return demoMode ? demoRows : rows.filter(row=>row.status==='approved');}
function enhanceBoard(published) {
    const host = document.getElementById('mural-webgl');
    if (!host) return;
    if(board3D) {board3D.setRows(published);return;}
    if(boardLoading)return;
    if(host.parentElement.getBoundingClientRect().top > window.innerHeight + 400)return;
    boardLoading = import('./mural-3d.js').then(async module=>{
        await document.fonts.ready;
        board3D=module.createMural3D(host,id=>openMemory(id));
        host.parentElement.classList.add('has-webgl');
        board3D.setRows(displayedRows());
    }).catch(()=>{host.parentElement.classList.remove('has-webgl');});
}
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
    container.dataset.count = displayedRows().length;
    container.className = 'memory-grid';
    const published = displayedRows();
    container.innerHTML = published.length ? published.map(row => '<button type="button" data-open-memory="' + escapeHTML(row.id) + '" aria-label="Ler recado de ' + escapeHTML(row.author) + '" class="memory-note ' + (row.image ? 'has-photo ' : '') + 'note-' + (['yellow','pink','green','blue'].includes(row.color) ? row.color : 'yellow') + '"><span class="board-pin" aria-hidden="true"></span>' +
        (row.image ? '<img loading="lazy" src="' + escapeHTML(row.image) + '" alt="Foto enviada por ' + escapeHTML(row.author) + '">' : '') +
        '<div class="sticky-paper"><p>' + escapeHTML(row.text) + '</p><footer>' + escapeHTML(row.author) + '</footer></div></button>').join('') :
        '<p class="empty-memory">Os primeiros votos de carinho estão a caminho. Deixe o seu!</p>';
    sizeBoard();
    document.getElementById('mural-readable-list').innerHTML = published.map(row=>'<button type="button" data-read-memory="'+escapeHTML(row.id)+'">'+escapeHTML(row.author)+' — '+escapeHTML(row.text.slice(0,80))+'</button>').join('') || '<p>Os primeiros recados estão a caminho.</p>';
    document.getElementById('mural-count').textContent = demoMode ? 'Composição demonstrativa · 12 recados fictícios, sem gravação' : published.length+' lembrança'+(published.length===1?'':'s')+' · toque para ler';
    enhanceBoard(published);
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
        document.getElementById('mural-service-status').textContent = 'Não foi possível conectar ao mural. Tente novamente em instantes.';
        const panel = document.getElementById('mural-moderation');
        panel.hidden = !state.isAdminLoggedIn;
        panel.textContent = 'Não foi possível carregar a fila. O serviço weddingMural precisa estar publicado no Firebase e sua conta deve ter permissão de administrador.';
        console.error('Mural:', e);
    }
}
function sizeBoard() {
    const board = document.getElementById('mural-container');
    const {columns, rows: lines} = boardLayout(board.dataset.count, board.clientWidth, board.clientHeight);
    board.style.setProperty('--board-cols', columns);
    board.style.setProperty('--board-rows', lines);
}
export function initMural() {
    new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))enhanceBoard(displayedRows());},{rootMargin:'400px'}).observe(document.getElementById('mural-webgl').parentElement);
    new ResizeObserver(sizeBoard).observe(document.getElementById('mural-container'));
    document.getElementById('mural-refresh').onclick = refreshMural;
    document.getElementById('open-mural-queue').onclick = () => { refreshMural(); document.getElementById('mural-moderation').parentElement.scrollIntoView({behavior:'smooth',block:'center'}); };
    const viewer = document.createElement('dialog');
    viewer.className = 'memory-viewer';
    viewer.setAttribute('aria-label', 'Leitura do recado');
    viewer.innerHTML = '<button type="button" class="memory-close" aria-label="Fechar recado">×</button><div class="memory-detail"></div>';
    document.body.append(viewer);
    viewer.querySelector('button').onclick = () => viewer.close();
    viewer.addEventListener('click', event => {if(event.target === viewer) viewer.close();});
    openMemory = id => {
        const row = displayedRows().find(row => row.id === id);
        if (!row) return;
        viewer.querySelector('.memory-detail').innerHTML = (row.image ? '<img src="'+escapeHTML(row.image)+'" alt="Foto de '+escapeHTML(row.author)+'">' : '') + '<div><h3>'+escapeHTML(row.author)+'</h3><p>'+escapeHTML(row.text)+'</p></div>';
        viewer.showModal();
    };
    document.getElementById('mural-container').addEventListener('click', event => {
        const button=event.target.closest('[data-open-memory]');if(button)openMemory(button.dataset.openMemory);
    });
    document.getElementById('mural-readable-list').addEventListener('click', event=>{
        const button=event.target.closest('[data-read-memory]');if(button)openMemory(button.dataset.readMemory);
    });
    if(isPreview) {
        const demo=document.getElementById('mural-demo');demo.hidden=false;
        demo.onclick=()=>{demoMode=!demoMode;demo.textContent=demoMode?'Voltar aos recados da prévia':'Ver composição demonstrativa';paint();};
    }
    window.addEventListener('pagehide',()=>board3D?.dispose(),{once:true});
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
