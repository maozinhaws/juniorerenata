import { db, appId, escapeHTML, state } from './firebase-init.js';
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    if (!state.gallery.length) {
        grid.innerHTML = `<div class="col-span-full bg-white/90 p-8 rounded-3xl text-center text-stone-400 border border-stone-200">Nenhum post do Instagram cadastrado no momento.</div>`;
        return;
    }

    grid.innerHTML = state.gallery.map(g => `
        <div class="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm p-3 flex flex-col justify-between">
            <blockquote class="instagram-media" data-instgrm-permalink="${escapeHTML(g.instagramUrl)}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%;"></blockquote>
            ${state.isAdminLoggedIn ? `<button onclick="window.deleteGalleryPhoto('${g.id}')" class="mt-2 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer">Excluir Post</button>` : ''}
        </div>
    `).join('');

    if (window.instgrm) {
        window.instgrm.Embeds.process();
    } else {
        const script = document.createElement('script');
        script.async = true;
        script.src = "//www.instagram.com/embed.js";
        document.body.appendChild(script);
    }
}

window.deleteGalleryPhoto = (id) => {
    window.openDeleteModal("Deseja realmente remover este post da galeria?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id));
            window.showToast("Post removido com sucesso!");
        } catch(e) { window.showToast("Erro ao excluir.", true); }
    });
};