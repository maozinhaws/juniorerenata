import { db, appId, state } from './firebase-init.js';
import { doc, onSnapshot, setDoc } from './data-store.js';
import { mountImageInput, validImageSource } from './image-input.js?v=20260925-2006';
const sections = { home:'Início', history:'História & truco', gallery:'Instagram', gifts:'Presentes', mural:'Mural', rsvp:'Presença' };
const saved = {};
let active = 'home';
export function showBackground(section) {
    active = section;
    const config = saved[section];
    const image = document.getElementById('section-backdrop-photo');
    if (!image) return;
    image.hidden = !config?.image;
    if (config?.image) { image.src = config.image; image.style.objectPosition = 'center ' + (config.position ?? 50) + '%'; }
    document.body.dataset.page = section;
}
export function initBackgrounds() {
    const backdrop = document.createElement('div'); backdrop.id = 'section-backdrop'; backdrop.setAttribute('aria-hidden','true');
    backdrop.innerHTML = '<img class="backdrop-bride" src="./assets/wedding/renata.png" alt=""><img class="backdrop-groom" src="./assets/wedding/junior.png" alt=""><img id="section-backdrop-photo" alt="" hidden><div class="backdrop-veil"></div>';
    document.body.prepend(backdrop);
    document.getElementById('section-backdrop-photo').onerror = event => { event.target.hidden = true; };
    const panel = document.createElement('section'); panel.className = 'background-editor';
    panel.innerHTML = '<h3>Planos de fundo por página</h3><p>Escolha a página e envie uma foto. Ao selecionar um arquivo, você poderá arrastar e aproximar a imagem em um recorte 16:9, que funciona no celular e no desktop. Sem foto, aparecem os retratos dos noivos.</p><label for="bg-section">Página</label><select id="bg-section">' + Object.entries(sections).map(([id,label]) => '<option value="'+id+'">'+label+'</option>').join('') + '</select><label for="bg-image">Foto de fundo</label><input id="bg-image" type="text"><input id="bg-position" type="hidden" value="50"><div class="background-actions"><button type="button" id="bg-save">Salvar fundo desta página</button><button type="button" id="bg-clear">Usar retratos dos noivos</button></div><p id="bg-status" role="status"></p>';
    document.getElementById('tab-admin').append(panel);
    mountImageInput('bg-image','plano de fundo');
    const picker = document.getElementById('bg-section'), input = document.getElementById('bg-image'), position = document.getElementById('bg-position');
    const fill = () => { const config = saved[picker.value]; input.value = config?.image || ''; position.value = config?.position ?? 50; input.dispatchEvent(new Event('input')); };
    picker.onchange = () => { delete input.dataset.dirty; fill(); };
    for (const id of Object.keys(sections)) onSnapshot(doc(db,'artifacts',appId,'public','data','backgrounds',id), snap => {
        saved[id] = snap.exists() ? snap.data() : {};
        if (active === id) showBackground(id);
        if (picker.value === id && !input.matches(':focus') && !input.dataset.dirty) fill();
    }, () => { document.getElementById('bg-status').textContent = 'Não foi possível carregar os fundos salvos.'; });
    input.addEventListener('input', () => { if (document.activeElement === input || input.dataset.imageBusy) input.dataset.dirty = 'true'; });
    async function save(clear = false) {
        if (!state.isAdminLoggedIn) return;
        if (input.dataset.imageBusy) return window.showToast('Aguarde a preparação da foto.',true);
        if (!clear && input.value && !validImageSource(input.value)) return window.showToast('Escolha uma foto ou use um link direto de imagem.',true);
        const section = picker.value;
        const config = { image:clear ? '' : input.value.trim(), position:Number(position.value) };
        const button = document.getElementById('bg-save'), clearButton = document.getElementById('bg-clear');
        button.disabled = clearButton.disabled = picker.disabled = true;
        try {
            await setDoc(doc(db,'artifacts',appId,'public','data','backgrounds',section), config);
            saved[section] = config;
            if (active === section) showBackground(section);
            delete input.dataset.dirty; fill();
            document.getElementById('bg-status').textContent = 'Fundo de ' + sections[section] + ' salvo. Abra a página para visualizar.';
        } catch { document.getElementById('bg-status').textContent = 'Não foi possível salvar. Confira conexão e permissões.'; }
        finally { button.disabled = clearButton.disabled = picker.disabled = false; }
    }
    document.getElementById('bg-save').onclick = () => save();
    document.getElementById('bg-clear').onclick = () => save(true);
    showBackground('home');
}
