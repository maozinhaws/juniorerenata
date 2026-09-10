import { db, appId, escapeHTML, state } from './firebase-init.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function initAdmin() {
    window.saveAllPanelChanges = async () => {
        state.settings = {
            ...state.settings,
            names: document.getElementById('cfg-names').value.trim(),
            date: document.getElementById('cfg-date').value,
            location: document.getElementById('cfg-location').value.trim(),
            maps: document.getElementById('cfg-maps').value.trim(),
            pixKey: document.getElementById('cfg-pix').value.trim(),
            receiverName: document.getElementById('cfg-receiver').value.trim(),
            cityName: document.getElementById('cfg-city').value.trim() || 'Curitiba',
            radioUrl: document.getElementById('cfg-radio').value.trim(),
            whatsappNumber: document.getElementById('cfg-whatsapp').value.trim(),
            homepageImg: document.getElementById('cfg-homepage-img').value.trim() || state.settings.homepageImg
        };
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), state.settings, { merge: true });
            window.showToast("Configurações salvas com sucesso!");
        } catch(err) { window.showToast("Erro ao salvar alterações.", true); }
    };

    window.openAddGuestModal = (id = null) => {
        document.getElementById('edit-guest-id').value = '';
        document.getElementById('guest-main-name').value = '';
        document.getElementById('companions-container').innerHTML = '';
        document.getElementById('modal-guest-title').innerText = "Cadastrar Convidado";
        if (id) {
            const g = state.guests.find(x => x.id === id);
            if (g) {
                document.getElementById('edit-guest-id').value = g.id;
                document.getElementById('guest-main-name').value = g.mainName;
                document.getElementById('modal-guest-title').innerText = "Editar Convidado";
                (g.companions || []).forEach(c => window.addCompanionRow(c.name, c.age, c.relation));
            }
        }
        document.getElementById('modal-add-guest').style.display = 'flex';
    };
    window.closeAddGuestModal = () => document.getElementById('modal-add-guest').style.display = 'none';

    window.openAddTimelineModal = (id = null) => {
        document.getElementById('edit-timeline-id').value = '';
        document.getElementById('tl-tag').value = '';
        document.getElementById('tl-title').value = '';
        document.getElementById('tl-opt-0').value = '';
        document.getElementById('tl-opt-1').value = '';
        document.getElementById('tl-opt-2').value = '';
        document.getElementById('tl-opt-3').value = '';
        document.getElementById('tl-correct').value = '0';
        document.getElementById('tl-text').value = '';
        if (id) {
            const item = state.timeline.find(x => x.id === id);
            if (item) {
                document.getElementById('edit-timeline-id').value = item.id;
                document.getElementById('tl-tag').value = item.tag;
                document.getElementById('tl-title').value = item.title;
                if (item.options && item.options.length >= 4) {
                    document.getElementById('tl-opt-0').value = item.options[0];
                    document.getElementById('tl-opt-1').value = item.options[1];
                    document.getElementById('tl-opt-2').value = item.options[2];
                    document.getElementById('tl-opt-3').value = item.options[3];
                }
                document.getElementById('tl-correct').value = item.correct !== undefined ? item.correct : 0;
                document.getElementById('tl-text').value = item.text;
            }
        }
        document.getElementById('modal-add-timeline').style.display = 'flex';
    };
    window.closeAddTimelineModal = () => document.getElementById('modal-add-timeline').style.display = 'none';

    window.openAddGalleryModal = () => {
        document.getElementById('gal-instagram').value = '';
        document.getElementById('modal-add-gallery').style.display = 'flex';
    };
    window.closeAddGalleryModal = () => document.getElementById('modal-add-gallery').style.display = 'none';

    window.addCompanionRow = (name = '', age = '', rel = 'Amigo') => {
        const container = document.getElementById('companions-container');
        const row = document.createElement('div');
        row.className = "flex gap-2 items-center bg-stone-50 p-2.5 rounded-xl border border-stone-200 companion-row";
        row.innerHTML = `
            <input type="text" placeholder="Nome Acompanhante" value="${escapeHTML(name)}" class="comp-name w-2/5 px-3 py-2 border rounded-lg text-xs bg-white"/>
            <input type="number" placeholder="Idade" value="${escapeHTML(age)}" class="comp-age w-1/5 px-3 py-2 border rounded-lg text-xs bg-white"/>
            <select class="comp-relation w-2/5 px-2 py-2 border rounded-lg text-xs bg-white">
                <option value="Pai/Mãe" ${rel==='Pai/Mãe'?'selected':''}>Pai/Mãe</option><option value="Filho(a)" ${rel==='Filho(a)'?'selected':''}>Filho(a)</option><option value="Irmão(ã)" ${rel==='Irmão(ã)'?'selected':''}>Irmão(ã)</option><option value="Amigo(a)" ${rel==='Amigo(a)'?'selected':''}>Amigo(a)</option><option value="Outro" ${rel==='Outro'?'selected':''}>Outro</option>
            </select>
            <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-1 cursor-pointer">✕</button>
        `;
        container.appendChild(row);
    };

    window.deleteTimeline = (id) => {
        window.openDeleteModal("Deseja realmente excluir esta pergunta do quiz?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'timeline', id));
                window.showToast("Pergunta excluída com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir pergunta.", true); }
        });
    };

    window.deleteGalleryPhoto = (id) => {
        window.openDeleteModal("Deseja realmente remover este post da galeria?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id));
                window.showToast("Post removido com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir post.", true); }
        });
    };

    window.toggleMessageVisibility = async (id, hidden) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', id), { hidden: !hidden });
            window.showToast("Visibilidade do recado atualizada!");
        } catch(e) { window.showToast("Erro ao atualizar recado.", true); }
    };

    window.deleteMessage = (id) => {
        window.openDeleteModal("Deseja realmente excluir este recado do mural?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', id));
                window.showToast("Recado excluído com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir recado.", true); }
        });
    };

    window.deleteGuest = (id) => {
        window.openDeleteModal("Deseja realmente excluir este convidado da lista oficial?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'guests', id));
                window.showToast("Convidado excluído com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir convidado.", true); }
        });
    };

    window.deleteContribution = (id) => {
        window.openDeleteModal("Deseja realmente excluir esta contribuição Pix?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contributions', id));
                window.showToast("Contribuição excluída com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir contribuição.", true); }
        });
    };

    window.deleteRankingEntry = (id) => {
        window.openDeleteModal("Deseja realmente excluir esta pontuação do ranking (teste do quiz)?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rankings', id));
                window.showToast("Pontuação excluída com sucesso!");
            } catch(e) { window.showToast("Erro ao excluir pontuação.", true); }
        });
    };

    document.getElementById('form-add-timeline').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-timeline-id').value;
        const obj = { 
            tag: document.getElementById('tl-tag').value.trim(), 
            title: document.getElementById('tl-title').value.trim(), 
            options: [document.getElementById('tl-opt-0').value.trim(), document.getElementById('tl-opt-1').value.trim(), document.getElementById('tl-opt-2').value.trim(), document.getElementById('tl-opt-3').value.trim()],
            correct: parseInt(document.getElementById('tl-correct').value, 10),
            text: document.getElementById('tl-text').value.trim()
        };
        window.closeAddTimelineModal();
        if (editId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'timeline', editId), obj);
        else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'timeline'), obj);
        window.showToast("Pergunta salva!");
    });

    document.getElementById('form-add-gallery').addEventListener('submit', async (e) => {
        e.preventDefault();
        const instagramUrl = document.getElementById('gal-instagram').value.trim();
        window.closeAddGalleryModal(); e.target.reset();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), { instagramUrl });
        window.showToast("Post adicionado com sucesso!");
    });

    document.getElementById('form-add-guest').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-guest-id').value;
        const mainName = document.getElementById('guest-main-name').value.trim();
        const companions = [];
        document.querySelectorAll('.companion-row').forEach(row => {
            const name = row.querySelector('.comp-name').value.trim();
            const age = row.querySelector('.comp-age').value.trim();
            const relation = row.querySelector('.comp-relation').value;
            if (name) companions.push({ name, age: age || '0', relation });
        });
        window.closeAddGuestModal();
        const obj = { mainName, companions };
        if (editId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'guests', editId), obj);
        else { obj.status = 'pending'; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'guests'), obj); }
        window.showToast("Convidado salvo!");
    });
}

export function renderAdmin() {
    let totalGenerated = 0, totalConfirmed = 0;
    state.guests.forEach(g => {
        const groupSize = 1 + (g.companions ? g.companions.length : 0);
        totalGenerated += groupSize;
        if (g.status === 'confirmed') totalConfirmed += groupSize;
    });
    document.getElementById('stat-total-guests').innerText = totalGenerated;
    document.getElementById('stat-confirmed-guests').innerText = totalConfirmed;

    document.getElementById('admin-timeline-list').innerHTML = state.timeline.map(t => `
        <tr>
            <td class="py-3 font-bold text-red-600">${escapeHTML(t.tag)}</td>
            <td class="py-3"><b class="text-stone-900">${escapeHTML(t.title)}</b><p class="text-xs text-stone-500 truncate max-w-xs">${escapeHTML(t.text)}</p></td>
            <td class="py-3 flex gap-3">
                <button type="button" onclick="window.openAddTimelineModal('${t.id}')" class="text-blue-600 font-bold text-xs cursor-pointer">Editar</button>
                <button type="button" onclick="window.deleteTimeline('${t.id}')" class="text-red-500 font-bold text-xs cursor-pointer">Excluir</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('admin-gallery-grid').innerHTML = state.gallery.map(g => `
        <div class="bg-white rounded-2xl border border-stone-200 p-3 flex flex-col justify-between shadow-xs">
            <a href="${escapeHTML(g.instagramUrl)}" target="_blank" class="text-xs text-pink-600 underline truncate block font-medium mb-2">${escapeHTML(g.instagramUrl)}</a>
            <button type="button" onclick="window.deleteGalleryPhoto('${g.id}')" class="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Excluir Post</button>
        </div>
    `).join('');

    document.getElementById('admin-messages-list').innerHTML = state.messages.map(m => `
        <tr>
            <td class="py-3 font-bold">${escapeHTML(m.author)}</td>
            <td class="py-3 text-xs truncate max-w-xs">${escapeHTML(m.text)}</td>
            <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.hidden ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${m.hidden ? 'Oculto' : 'Visível'}</span></td>
            <td class="py-3 flex gap-3">
                <button type="button" onclick="window.toggleMessageVisibility('${m.id}', ${!!m.hidden})" class="text-amber-600 font-bold text-xs cursor-pointer">${m.hidden ? 'Exibir' : 'Ocultar'}</button>
                <button type="button" onclick="window.deleteMessage('${m.id}')" class="text-red-500 font-bold text-xs cursor-pointer">Excluir</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('admin-guests-list').innerHTML = state.guests.map(g => {
        const compStr = (g.companions || []).map(c => `${escapeHTML(c.name)} (${c.age}a)`).join(', ') || 'Nenhum';
        const stClass = g.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : (g.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800');
        const stText = g.status === 'confirmed' ? 'Confirmado' : (g.status === 'declined' ? 'Ausente' : 'Pendente');
        return `
            <tr>
                <td class="py-3 font-bold">${escapeHTML(g.mainName)}</td>
                <td class="py-3 text-xs">${compStr}</td>
                <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${stClass}">${stText}</span></td>
                <td class="py-3 flex gap-3">
                    <button type="button" onclick="window.openAddGuestModal('${g.id}')" class="text-blue-600 font-bold text-xs cursor-pointer">Editar</button>
                    <button type="button" onclick="window.deleteGuest('${g.id}')" class="text-red-500 font-bold text-xs cursor-pointer">Excluir</button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('admin-contribs-list').innerHTML = state.contributions.map(c => `
        <tr>
            <td class="py-3 font-bold">${escapeHTML(c.guestName)}</td>
            <td class="py-3 font-bold text-emerald-600">R$ ${parseFloat(c.amount).toFixed(2)}</td>
            <td class="py-3 text-xs">${escapeHTML(c.giftTitle)}</td>
            <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${c.status === 'approved' ? 'Aprovado' : 'Pendente'}</span></td>
            <td class="py-3 flex gap-3">
                <button type="button" onclick="window.deleteContribution('${c.id}')" class="text-red-500 font-bold text-xs cursor-pointer">Excluir</button>
            </td>
        </tr>
    `).join('');

    // Renderiza a tabela de gerenciamento do Ranking (Quiz) no painel admin
    const adminRankingList = document.getElementById('admin-ranking-list');
    if (adminRankingList) {
        if (!state.rankings.length) {
            adminRankingList.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-stone-400 text-xs">Nenhum registro no ranking.</td></tr>`;
        } else {
            adminRankingList.innerHTML = state.rankings.map((r, i) => `
                <tr>
                    <td class="py-3 font-bold text-red-600">#${i + 1}</td>
                    <td class="py-3 font-bold text-stone-900">${escapeHTML(r.guestName)}</td>
                    <td class="py-3 text-emerald-600 font-bold">${r.score} pts</td>
                    <td class="py-3">
                        <button type="button" onclick="window.deleteRankingEntry('${r.id}')" class="text-red-500 font-bold text-xs cursor-pointer">Excluir Teste</button>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    lucide.createIcons();
}
