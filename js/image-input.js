export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const allowed = ['image/jpeg', 'image/png', 'image/webp'];
export function validateImageFile(file) {
    if (!file || !allowed.includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP. Vídeos e GIFs não são aceitos.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('A foto deve ter no máximo 3 MB.');
}
export function isInstagramLink(value) {
    try { return /(^|\.)instagram\.com$/i.test(new URL(value).hostname); } catch { return false; }
}
export function validImageSource(value) {
    if (value === './assets/wedding/hero-rings.png') return true;
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)) return value.length < 350000;
    try { return new URL(value).protocol === 'https:' && !isInstagramLink(value); } catch { return false; }
}
export async function prepareImage(file) {
    validateImageFile(file);
    const bitmap = await createImageBitmap(file);
    try {
        if (bitmap.width * bitmap.height > 40000000) throw new Error('A resolução desta foto é muito alta. Escolha uma versão menor.');
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f6f0e6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [.86, .72, .58, .42, .28]) {
            const result = canvas.toDataURL('image/jpeg', quality);
            if (result.length <= 340000) return result;
        }
        throw new Error('Esta foto tem muitos detalhes. Escolha uma imagem menor.');
    } finally { bitmap.close(); }
}
export function mountImageInput(inputId, label) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.imageBound) return;
    input.dataset.imageBound = 'true'; input.type = 'text';
    input.placeholder = 'Cole uma foto ou um link direto de imagem';
    const box = document.createElement('div');
    box.className = 'photo-editor';
    box.innerHTML = '<label class="upload-choice"><span>Escolher foto · ' + label + '</span><input type="file" accept="image/jpeg,image/png,image/webp"></label><p>JPG, PNG ou WebP · até 3 MB · você também pode colar uma foto aqui (Ctrl+V).</p><img alt="Prévia da foto selecionada" hidden><p class="photo-error" role="status"></p>';
    input.after(box);
    const fileInput = box.querySelector('input');
    const preview = box.querySelector('img');
    const error = box.querySelector('[role=status]');
    let version = 0;
    async function accept(file) {
        const ticket = ++version;
        error.textContent = 'Preparando foto…';
        input.dataset.imageBusy = 'true';
        try {
            const source = await prepareImage(file);
            if (ticket !== version) return;
            input.value = source; input.dispatchEvent(new Event('input', { bubbles: true }));
            preview.src = source; preview.hidden = false; error.textContent = 'Foto pronta para salvar.';
        } catch (e) { if (ticket === version) error.textContent = e.message; }
        finally { if (ticket === version) delete input.dataset.imageBusy; fileInput.value = ''; }
    }
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) accept(fileInput.files[0]); });
    const paste = e => {
        const file = [...(e.clipboardData?.items || [])].find(item => item.kind === 'file')?.getAsFile();
        if (file) { e.preventDefault(); accept(file); }
    };
    input.addEventListener('paste', paste); box.addEventListener('paste', paste);
    input.addEventListener('input', () => {
        if (isInstagramLink(input.value)) error.textContent = 'Este é um link do Instagram. Baixe a foto e escolha o arquivo acima; o link do perfil não é uma imagem.';
        else { error.textContent = ''; preview.hidden = !validImageSource(input.value); if (!preview.hidden) preview.src = input.value; }
    });
    preview.onerror = () => { preview.hidden = true; error.textContent = 'Não foi possível abrir essa imagem. Envie o arquivo da foto.'; };
}
