import { state } from './firebase-init.js';

export { safeStoreUrl } from './site-values.js';
import { safeStoreUrl } from './site-values.js';
export function initGifts() {
    window.openPixModal = id => {
        const gift = state.gifts.find(row => row.id === id);
        if (!gift) return;
        state.selectedGift = gift;
        const key = String(state.settings.pixKey || '').trim();
        document.getElementById('pix-title').textContent = gift.title;
        document.getElementById('pix-key').value = key;
        document.getElementById('pix-receiver').textContent = key ? 'Titular: ' + (state.settings.receiverName || 'Confira no seu banco') : '';
        document.getElementById('pix-status').textContent = key ? 'O site nÃ£o confirma pagamentos automaticamente.' : 'Os noivos ainda nÃ£o cadastraram a chave Pix.';
        document.getElementById('btn-copy-pix').disabled = !key;
        const store = document.getElementById('pix-store'), url = safeStoreUrl(gift.storeUrl);
        store.hidden = !url;
        if (url) store.href = url; else store.removeAttribute('href');
        document.getElementById('modal-pix').classList.remove('hidden');
    };
    window.closePixModal = () => document.getElementById('modal-pix').classList.add('hidden');
    window.copyPix = async () => {
        const input = document.getElementById('pix-key');
        if (!input.value) return;
        try {
            await navigator.clipboard.writeText(input.value);
            document.getElementById('pix-status').textContent = 'Chave Pix copiada.';
        } catch {
            input.focus(); input.select();
            document.getElementById('pix-status').textContent = 'Selecione e copie a chave manualmente.';
        }
    };
    document.addEventListener('click', event => {
        const pixButton = event.target.closest('[data-pix-gift]');
        if (pixButton) window.openPixModal(pixButton.dataset.pixGift);
        const deleteButton = event.target.closest('[data-delete-gift]');
        if (deleteButton) window.deleteGift(deleteButton.dataset.deleteGift);
        const button = event.target.closest('[data-edit-gift]');
        if (!button || !state.isAdminLoggedIn) return;
        const gift = state.gifts.find(row => row.id === button.dataset.editGift);
        if (!gift) return;
        window.openAddGiftModal();
        document.getElementById('gift-modal-heading').textContent = 'Editar presente';
        for (const [field, value] of Object.entries({id:gift.id,title:gift.title,amount:gift.totalAmount,category:gift.category,image:gift.imageUrl,desc:gift.description,store:gift.storeUrl})) {
            document.getElementById('ag-' + field).value = value ?? '';
        }
        document.getElementById('ag-image').dispatchEvent(new Event('input'));
    });
}
