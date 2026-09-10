import { db, appId, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    if (!state.gallery.length) {
        grid.innerHTML = `<div class="col-span-full bg-white/90 p-8 rounded-3xl text-center text-stone-400 border border-stone-200">Nenhum post cadastrado na galeria no momento.</div>`;
        return;
    }

    grid.innerHTML = state.gallery.map(g => {
        const url = escapeHTML(g.instagramUrl || '#');
        const imgUrl = escapeHTML(g.imageUrl || g.instagramUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80');
        const caption = escapeHTML(g.caption || 'Momento especial do casal 💍');

        return `
            <div class="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm flex flex-col justify-between group relative">
                ${state.isAdminLoggedIn ? `
                    <div class="absolute top-3 right-3 z-30 flex gap-1.5 bg-white/90 p-1.5 rounded-2xl shadow-xl backdrop-blur">
                        <button type="button" onclick="window.deleteGalleryPhoto('${g.id}')" class="px-2.5 py-1 bg-red-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer hover:bg-red-700">Excluir</button>
                    </div>
                ` : ''}
                <div class="relative w-full h-80 bg-stone-100 overflow-hidden cursor-pointer" onclick="window.openLightbox('${imgUrl}')">
                    <img src="${imgUrl}" alt="Post Galeria" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'"/>
                    <div class="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="bg-white/90 text-stone-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg">🔍 Ampliar Foto</span>
                    </div>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="absolute top-3 left-3 bg-stone-900/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur shadow transition-all flex items-center gap-1.5 z-10" onclick="event.stopPropagation()">
                        <i data-lucide="instagram" class="w-3.5 h-3.5"></i> Ver no Instagram
                    </a>
                </div>
                <div class="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <p class="text-xs text-stone-600 line-clamp-2">${caption}</p>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.openLightbox = (imgUrl) => {
    let lb = document.getElementById('lightbox-modal');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox-modal';
        lb.className = 'fixed inset-0 z-[99999] bg-stone-950/90 backdrop-blur-md hidden items-center justify-center p-4';
        lb.innerHTML = `
            <div class="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                <button onclick="document.getElementById('lightbox-modal').style.display='none'" class="absolute -top-12 right-0 text-white bg-stone-800 hover:bg-red-600 p-2.5 rounded-full font-bold cursor-pointer transition-colors shadow-lg">✕ Fechar</button>
                <img id="lightbox-img" src="" class="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-stone-800"/>
            </div>
        `;
        lb.addEventListener('click', (e) => { if (e.target === lb) lb.style.display = 'none'; });
        document.body.appendChild(lb);
    }
    document.getElementById('lightbox-img').src = imgUrl;
    lb.style.display = 'flex';
};

window.deleteGalleryPhoto = (id) => {
    window.openDeleteModal("Deseja realmente remover este post da galeria?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id));
            window.showToast("Post removido com sucesso!");
        } catch(e) {
            window.showToast("Erro ao excluir post.", true);
        }
    });
};
// Admin gallery controls. These functions are intentionally defined in the gallery module,
// so the Wix-style editor and the delegated data-action buttons share the same implementation.
window.openAddGalleryModal = () => {
    if (!state.isAdminLoggedIn) {
        return window.showToast("Faça login como administrador para adicionar posts.", true);
    }
    const modal = document.getElementById('modal-add-gallery');
    const input = document.getElementById('gal-instagram');
    if (!modal) return window.showToast("Modal da galeria não encontrado.", true);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    if (input) {
        input.value = '';
        requestAnimationFrame(() => input.focus());
    }
    if (window.lucide) lucide.createIcons();
};

window.closeAddGalleryModal = () => {
    const modal = document.getElementById('modal-add-gallery');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
};

const normalizeInstagramUrl = (value) => {
    try {
        const url = new URL(value.trim());
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        if (host !== 'instagram.com') return null;
        if (!/^\/(p|reel|tv)\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) return null;
        return `https://www.instagram.com${url.pathname.replace(/\/$/, '')}/`;
    } catch (_) {
        return null;
    }
};

// One delegated submit listener is used because the modal exists in the static HTML,
// while the editor can be entered/exited without reloading the page.
if (!window.__gallerySubmitBound) {
    window.__gallerySubmitBound = true;
    document.addEventListener('submit', async (e) => {
        if (e.target?.id !== 'form-add-gallery') return;
        e.preventDefault();
        e.stopPropagation();

        if (!state.isAdminLoggedIn) {
            return window.showToast("Acesso negado. Faça login como administrador.", true);
        }

        const input = document.getElementById('gal-instagram');
        const submit = e.target.querySelector('button[type="submit"]');
        const instagramUrl = normalizeInstagramUrl(input?.value || '');
        if (!instagramUrl) {
            return window.showToast("Cole um link válido de um Post, Reels ou vídeo do Instagram.", true);
        }

        const duplicated = state.gallery.some(item => item.instagramUrl === instagramUrl);
        if (duplicated) {
            return window.showToast("Esse post já está cadastrado na galeria.", true);
        }

        const originalLabel = submit?.innerHTML;
        try {
            if (submit) {
                submit.disabled = true;
                submit.innerHTML = 'Adicionando...';
            }

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), {
                instagramUrl,
                caption: 'Momento especial do casal 💍',
                createdAt: new Date().toISOString()
            });

            window.closeAddGalleryModal();
            e.target.reset();
            window.showToast("Post do Instagram adicionado com sucesso!");
        } catch (err) {
            console.error('Erro ao adicionar post da galeria:', err);
            window.showToast("Erro ao adicionar o post. Verifique sua conexão e as permissões do Firebase.", true);
        } finally {
            if (submit) {
                submit.disabled = false;
                submit.innerHTML = originalLabel || 'Adicionar Post';
            }
        }
    });
}
