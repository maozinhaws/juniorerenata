import { state, db, appId, escapeHTML } from './firebase-init.js';
import { collection, doc, addDoc, updateDoc } from './data-store.js';
import { mountImageInput, validImageSource } from './image-input.js?v=20260925-2329';

export function renderBiography() {
    const target = document.getElementById('biography-chapters');
    if (!target) return;
    const rows = [...state.timeline].sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
    target.innerHTML = rows.map((row, index) => {
        const photo = row.imageUrl && validImageSource(row.imageUrl) ? row.imageUrl : '';
        return '<article class="bio-chapter"><div class="bio-photo">' +
            (photo ? '<img loading="lazy" src="' + escapeHTML(photo) + '" alt="Foto do capÃ­tulo ' + escapeHTML(row.heading || row.tag || '') + '">' : '<span aria-hidden="true">âš­</span>') +
            '</div><div class="bio-copy"><span class="section-kicker">CapÃ­tulo ' + String(index + 1).padStart(2,'0') + '</span><h3>' + escapeHTML(row.heading || row.tag || 'Nossa histÃ³ria') + '</h3><p>' + escapeHTML(row.text || '') + '</p><div class="bio-notes">' +
            (row.groomNote ? '<aside class="bio-note"><b>Ele conta</b>' + escapeHTML(row.groomNote) + '</aside>' : '') +
            (row.brideNote ? '<aside class="bio-note bride-note"><b>Ela conta</b>' + escapeHTML(row.brideNote) + '</aside>' : '') +
            '</div>' + (state.isAdminLoggedIn ? '<button type="button" data-edit-story="' + escapeHTML(row.id) + '">Editar texto, foto e curiosidades</button>' : '') + '</div></article>';
    }).join('') || '<p>Nossa histÃ³ria estÃ¡ sendo preparada com carinho.</p>';
}
export function initBiography() {
    mountImageInput('story-image', 'foto do capÃ­tulo');
    const form = document.getElementById('form-story');
    window.editStory = id => {
        if (!state.isAdminLoggedIn) return;
        const row = state.timeline.find(row => row.id === id) || {};
        form.reset();
        const fields = {id:row.id,title:row.heading || row.tag,text:row.text,image:row.imageUrl,groom:row.groomNote,bride:row.brideNote,order:row.order ?? (row.id ? state.timeline.findIndex(item => item.id === row.id) : state.timeline.length)};
        for (const [key,value] of Object.entries(fields)) document.getElementById('story-' + key).value = value ?? '';
        document.getElementById('story-image').dispatchEvent(new Event('input'));
        document.getElementById('modal-story').classList.remove('hidden');
    };
    document.addEventListener('click', e => {
        const button = e.target.closest('[data-edit-story]');
        if (button) window.editStory(button.dataset.editStory);
    });
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!state.isAdminLoggedIn || form.dataset.saving) return;
        const image = document.getElementById('story-image');
        if (image.dataset.imageBusy) return window.showToast('Aguarde a preparaÃ§Ã£o da foto.',true);
        if (image.value && !validImageSource(image.value)) return window.showToast('Escolha uma foto vÃ¡lida.',true);
        const value = name => document.getElementById('story-' + name).value.trim();
        const data = {heading:value('title'),text:value('text'),imageUrl:value('image'),groomNote:value('groom'),brideNote:value('bride'),order:Number(value('order'))};
        if (!data.heading || !data.text) return window.showToast('Preencha tÃ­tulo e texto.',true);
        form.dataset.saving = 'true'; form.querySelector('[type=submit]').disabled = true;
        try {
            if (value('id')) await updateDoc(doc(db,'artifacts',appId,'public','data','timeline',value('id')),data);
            else await addDoc(collection(db,'artifacts',appId,'public','data','timeline'),data);
            document.getElementById('modal-story').classList.add('hidden');
            window.showToast('CapÃ­tulo salvo.');
        } catch { window.showToast('NÃ£o foi possÃ­vel salvar o capÃ­tulo. Confira a conexÃ£o e as permissÃµes.',true); }
        finally { delete form.dataset.saving; form.querySelector('[type=submit]').disabled = false; }
    });
    renderBiography();
}
