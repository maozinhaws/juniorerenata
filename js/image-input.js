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

function canvasToDataURL(canvas) {
    for (const quality of [.86, .72, .58, .42, .28]) {
        const result = canvas.toDataURL('image/jpeg', quality);
        if (result.length <= 340000) return result;
    }
    throw new Error('Esta foto tem muitos detalhes. Escolha uma imagem menor.');
}

async function prepareWithoutCrop(file) {
    const bitmap = await createImageBitmap(file);
    try {
        if (bitmap.width * bitmap.height > 40000000) throw new Error('A resolução desta foto é muito alta. Escolha uma versão menor.');
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f6f0e6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvasToDataURL(canvas);
    } finally { bitmap.close(); }
}

function cropFile(file, mode) {
    if (!window.Cropper) return Promise.reject(new Error('A ferramenta de recorte ainda está carregando. Tente novamente em alguns segundos.'));
    const profile = mode === 'profile';
    const aspectRatio = profile ? 1 : 16 / 9;
    const title = profile ? 'Ajustar foto de perfil' : 'Ajustar foto de fundo';
    const hint = profile ? 'Arraste e use o zoom para centralizar o rosto no quadrado.' : 'Arraste e use o zoom para escolher a área da capa. O recorte funciona em celular e desktop.';
    const url = URL.createObjectURL(file);
    const modal = document.createElement('div');
    modal.className = 'image-crop-modal';
    modal.innerHTML = `<div class="image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="image-crop-title"><div class="image-crop-header"><div><h3 id="image-crop-title">${title}</h3><p>${hint}</p></div><button type="button" class="image-crop-cancel" aria-label="Cancelar recorte">×</button></div><div class="image-crop-stage"><img alt="Prévia para recorte"></div><div class="image-crop-actions"><button type="button" class="image-crop-cancel">Cancelar</button><button type="button" class="image-crop-confirm">Usar este recorte</button></div></div>`;
    document.body.append(modal);
    const image = modal.querySelector('img'); image.src = url;
    let cropper;
    const cleanup = () => { cropper?.destroy(); URL.revokeObjectURL(url); modal.remove(); };
    return new Promise((resolve, reject) => {
        const cancel = () => { cleanup(); reject(new Error('Recorte cancelado.')); };
        modal.querySelectorAll('.image-crop-cancel').forEach(button => button.addEventListener('click', cancel));
        modal.addEventListener('click', e => { if (e.target === modal) cancel(); });
        image.onload = () => {
            cropper = new window.Cropper(image, { aspectRatio, viewMode: 1, dragMode: 'move', autoCropArea: .9, responsive: true, background: false, guides: true, center: true, cropBoxMovable: true, cropBoxResizable: !profile });
        };
        modal.querySelector('.image-crop-confirm').addEventListener('click', () => {
            if (!cropper) return;
            try {
                const canvas = cropper.getCroppedCanvas({ maxWidth: profile ? 1000 : 1800, maxHeight: profile ? 1000 : 1013, fillColor: '#f6f0e6', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
                const result = canvasToDataURL(canvas); cleanup(); resolve(result);
            } catch (error) { cleanup(); reject(error); }
        });
    });
}

export async function prepareImage(file, mode = 'free') {
    validateImageFile(file);
    if (mode === 'profile' || mode === 'background') return cropFile(file, mode);
    return prepareWithoutCrop(file);
}

function modeForLabel(label) {
    if (/perfil|avatar/i.test(label)) return 'profile';
    if (/capa|fundo|plano/i.test(label)) return 'background';
    return 'free';
}

export function mountImageInput(inputId, label) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.imageBound) return;
    input.dataset.imageBound = 'true'; input.type = 'text';
    const mode = modeForLabel(label);
    input.placeholder = 'Cole uma foto ou um link direto de imagem';
    const box = document.createElement('div'); box.className = 'photo-editor';
    const modeText = mode === 'profile' ? 'Recorte quadrado · arraste e use o zoom' : mode === 'background' ? 'Recorte 16:9 · funciona no mobile e desktop' : 'JPG, PNG ou WebP · até 3 MB';
    box.innerHTML = '<label class="upload-choice"><span>Escolher foto · ' + label + '</span><input type="file" accept="image/jpeg,image/png,image/webp"></label><p>' + modeText + ' · você também pode colar uma foto aqui (Ctrl+V).</p><img alt="Prévia da foto selecionada" hidden><p class="photo-error" role="status"></p>';
    input.after(box);
    const fileInput = box.querySelector('input'), preview = box.querySelector('img'), error = box.querySelector('[role=status]');
    let version = 0;
    async function accept(file) {
        const ticket = ++version; error.textContent = mode === 'free' ? 'Preparando foto…' : 'Abra o recorte para ajustar a foto…'; input.dataset.imageBusy = 'true';
        try {
            const source = await prepareImage(file, mode);
            if (ticket !== version) return;
            input.value = source; input.dispatchEvent(new Event('input', { bubbles: true }));
            preview.src = source; preview.hidden = false; error.textContent = 'Foto pronta para salvar.';
        } catch (e) { if (ticket === version && e.message !== 'Recorte cancelado.') error.textContent = e.message; }
        finally { if (ticket === version) { delete input.dataset.imageBusy; fileInput.value = ''; } }
    }
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) accept(fileInput.files[0]); });
    const paste = e => { const file = [...(e.clipboardData?.items || [])].find(item => item.kind === 'file')?.getAsFile(); if (file) { e.preventDefault(); accept(file); } };
    input.addEventListener('paste', paste); box.addEventListener('paste', paste);
    input.addEventListener('input', () => {
        if (isInstagramLink(input.value)) error.textContent = 'Este é um link do Instagram. Baixe a foto e escolha o arquivo acima; o link do perfil não é uma imagem.';
        else { error.textContent = ''; preview.hidden = !validImageSource(input.value); if (!preview.hidden) preview.src = input.value; }
    });
    preview.onerror = () => { preview.hidden = true; error.textContent = 'Não foi possível abrir essa imagem. Envie o arquivo da foto.'; };
}
