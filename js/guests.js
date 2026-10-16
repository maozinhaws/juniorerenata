import { guestLists } from './guest-list.js';
import { state, db, appId } from './firebase-init.js';
import { collection, addDoc, doc, updateDoc } from './data-store.js';

export function participants() {
    return guestLists(state.guests).people.filter(p => p.status !== 'revoked').map(p => ({key:p.id+':'+p.member,name:p.name,group:p.group}));
}
export function initGuests() {
    const modal = document.getElementById('modal-add-guest');
    const form = document.getElementById('form-add-guest');
    window.openAddGuestModal = () => {
        if (!state.isAdminLoggedIn) return;
        document.getElementById('guest-manager-dialog')?.close();
        form.reset();
        document.getElementById('companions-container').replaceChildren();
        modal.style.display = 'flex';
        document.getElementById('guest-main-name').focus();
    };
    window.closeAddGuestModal = () => { modal.style.display = 'none'; };
    window.addCompanionRow = () => {
        const row = document.createElement('div');
        row.className = 'companion-row flex gap-2';
        row.innerHTML = '<input required maxlength="120" aria-label="Nome do acompanhante" class="w-full px-4 py-3 border rounded-xl" placeholder="Nome do acompanhante"><button type="button" aria-label="Remover acompanhante">×</button>';
        row.querySelector('button').onclick = () => row.remove();
        document.getElementById('companions-container').append(row);
    };
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!state.isAdminLoggedIn || form.dataset.saving) return;
        const mainName = document.getElementById('guest-main-name').value.trim();
        if (mainName.length < 2 || mainName.length > 120) return window.showToast('Informe um nome de 2 a 120 caracteres.', true);
        const companions = [...form.querySelectorAll('.companion-row input')].map(input => ({ name: input.value.trim() }));
        if (companions.some(p => p.name.length < 2 || p.name.length > 120)) return window.showToast('Confira o nome dos acompanhantes.', true);
        const id = document.getElementById('edit-guest-id').value;
        if (!id && state.guests.some(g => g.mainName.toLocaleLowerCase() === mainName.toLocaleLowerCase())) return window.showToast('Este nome já está cadastrado.', true);
        const button = form.querySelector('[type=submit]');
        form.dataset.saving = 'true'; button.disabled = true;
        try {
            const value = { mainName, companions };
            if (id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'guests', id), value);
            else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'guests'), { ...value, status: 'pending' });
            window.closeAddGuestModal(); window.showToast('Convidado e acompanhantes salvos na lista.');
        } catch (error) { console.error(error); window.showToast('Não foi possível salvar. Confira a conexão e as permissões.', true); }
        finally { delete form.dataset.saving; button.disabled = false; }
    });
}
