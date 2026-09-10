import { db, appId, escapeHTML, state } from './firebase-init.js';
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    // Filtra apenas links válidos do Instagram para evitar caixas brancas quebradas
    const validGallery = state.gallery.filter(g => {
        const url = g.instagramUrl || '';
        return url.includes('instagram.com/p/') || url.includes('instagram.com/reel/');
    });

    if (!validGallery.length) {
        grid.innerHTML = `<div class="col-span-full bg-white/90 p-8 rounded-3xl text-center text-stone-400 border border-stone-200">Nenhum post válido do Instagram cadastrado no momento. Cole o link completo de um post ou reels (ex: https://www.instagram.com/p/ABC123xyz/).</div>`;
        return;
    }

    grid.innerHTML = validGallery.map(g => `
        <div class="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm p-4 flex flex-col items-center justify-center">
            <div class="w-full max-w-[400px] flex justify-center overflow-hidden min-h-[300px]">
                <blockquote class="instagram-media" data-instgrm-permalink="${escapeHTML(g.instagramUrl)}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:12px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 0 auto; max-width:540px; min-width:280px; padding:0; width:100%;"></blockquote>
            </div>
            ${state.isAdminLoggedIn ? `
                <div class="w-full pt-3 mt-3 border-t border-stone-100">
                    <button type="button" onclick="window.deleteGalleryPhoto('${g.id}')" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer">
                        Excluir Post da Galeria
                    </button>
                </div>` : ''}
        </div>
    `).join('');

    // Processa os embeds do Instagram de forma segura
    if (window.instgrm && typeof window.instgrm.Embeds.process === 'function') {
        window.instgrm.Embeds.process();
    } else {
        const existingScript = document.querySelector('script[src*="//www.instagram.com/embed.js"]');
        if (!existingScript) {
            const script = document.createElement('script');
            script.async = true;
            script.src = "//www.instagram.com/embed.js";
            document.body.appendChild(script);
        }
    }
}

// Expõe explicitamente a função de exclusão para o escopo global do navegador
window.deleteGalleryPhoto = (id) => {
    window.openDeleteModal("Deseja realmente remover este post da galeria?", async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id));
            window.showToast("Post removido com sucesso!");
        } catch(e) {
            console.error("Erro ao excluir post:", e);
            window.showToast("Erro ao excluir. Verifique permissões.", true);
        }
    });
};
