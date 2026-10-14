import { chapterCuriosity } from './site-values.js';
import { state, db, appId, escapeHTML } from './firebase-init.js';
import { collection, doc, addDoc, updateDoc } from './data-store.js';
import { mountImageInput, validImageSource } from './image-input.js?v=20260925-2329';

export function renderBiography() {
    const target = document.getElementById('biography-chapters');
    if (!target) return;
    const rows = [...state.timeline].sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
    target.innerHTML = rows.map((row, index) => {
        const note = chapterCuriosity(row);
        const photo = row.imageUrl && validImageSource(row.imageUrl) ? row.imageUrl : '';
        return '<article class="bio-chapter"><figure class="bio-memory"><div class="bio-photo">' +
            (photo ? '<img loading="lazy" src="' + escapeHTML(photo) + '" alt="Foto do capítulo ' + escapeHTML(row.heading || row.tag || '') + '">' : '<span aria-hidden="true">⚭</span>') +
            '</div>' + (note.text && photo ? '<aside class="bio-note ' + (note.author === 'noiva' ? 'bride-note' : '') + '"><b>' + (note.author === 'noiva' ? 'Ela conta' : 'Ele conta') + '</b>' + escapeHTML(note.text) + '</aside>' : '') + '</figure><div class="bio-copy"><span class="section-kicker">Capítulo ' + String(index + 1).padStart(2,'0') + '</span><h3>' + escapeHTML(row.heading || row.tag || 'Nossa história') + '</h3><p>' + escapeHTML(row.text || '') + '</p>' + (state.isAdminLoggedIn ? '<button type="button" data-edit-story="' + escapeHTML(row.id) + '">Editar texto, foto e curiosidades</button>' : '') + '</div></article>';
    }).join('') || '<p>Nossa história está sendo preparada com carinho.</p>';
}
export function initBiography() {
    mountImageInput('story-image', 'foto do capítulo');
    const form = document.getElementById('form-story');
    window.editStory = id => {
        if (!state.isAdminLoggedIn) return;
        const row = state.timeline.find(row => row.id === id) || {};
        form.reset();
        const fields = {id:row.id,title:row.heading || row.tag,text:row.text,image:row.imageUrl,author:chapterCuriosity(row).author,curiosity:chapterCuriosity(row).text,order:row.order ?? (row.id ? state.timeline.findIndex(item => item.id === row.id) : state.timeline.length)};
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
        if (image.dataset.imageBusy) return window.showToast('Aguarde a preparação da foto.',true);
        if (image.value && !validImageSource(image.value)) return window.showToast('Escolha uma foto válida.',true);
        const value = name => document.getElementById('story-' + name).value.trim();
        const data = {heading:value('title'),text:value('text'),imageUrl:value('image'),curiosityAuthor:value('author'),curiosity:value('curiosity'),order:Number(value('order'))};
        if (data.curiosity && !data.imageUrl) return window.showToast('Escolha a foto desta curiosidade.',true);
        if (!data.heading || !data.text) return window.showToast('Preencha título e texto.',true);
        form.dataset.saving = 'true'; form.querySelector('[type=submit]').disabled = true;
        try {
            if (value('id')) await updateDoc(doc(db,'artifacts',appId,'public','data','timeline',value('id')),data);
            else await addDoc(collection(db,'artifacts',appId,'public','data','timeline'),data);
            document.getElementById('modal-story').classList.add('hidden');
            window.showToast('Capítulo salvo.');
        } catch { window.showToast('Não foi possível salvar o capítulo. Confira a conexão e as permissões.',true); }
        finally { delete form.dataset.saving; form.querySelector('[type=submit]').disabled = false; }
    });
    renderBiography();
}
