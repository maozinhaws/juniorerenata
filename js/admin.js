import { guestLists, statusLabels, createGuestPdf } from './guest-list.js';
import { db, appId, state } from './firebase-init.js';
import { setDoc, doc, updateDoc } from './data-store.js';
import { validImageSource } from './image-input.js?v=20260925-2329';
import { spotifyEmbed } from './spotify.js';

export function initAdmin() {
    window.saveAllPanelChanges = async () => {
        if (!state.isAdminLoggedIn) return window.showToast('Entre no painel para salvar.', true);
        const spotify = document.getElementById('cfg-radio').value.trim();
        if (spotify && !spotifyEmbed(spotify)) return window.showToast('Cole o link completo de uma música, álbum ou playlist em open.spotify.com.', true);
        const photo = document.getElementById('cfg-homepage-img');
        if (photo.dataset.imageBusy) return window.showToast('Aguarde a preparação da foto.', true);
        if (photo.value && !validImageSource(photo.value) && photo.value !== './assets/wedding/hero-rings.png') return window.showToast('Escolha uma foto. Links de perfil do Instagram não são imagens.', true);
        const saveButton = document.querySelector('[onclick="window.saveAllPanelChanges()"]');
        const previousLabel = saveButton?.innerHTML;
        const nextSettings = {
            ...state.settings,
            names: document.getElementById('cfg-names')?.value.trim() || state.settings.names,
            date: document.getElementById('cfg-date')?.value || state.settings.date,
            location: document.getElementById('cfg-location')?.value.trim() || state.settings.location,
            maps: document.getElementById('cfg-maps')?.value.trim() || state.settings.maps,
            pixKey: document.getElementById('cfg-pix').value.trim(),
            receiverName: document.getElementById('cfg-receiver')?.value.trim() || state.settings.receiverName,
            cityName: document.getElementById('cfg-city')?.value.trim() || 'Curitiba',
            radioUrl: spotify,
            whatsappNumber: document.getElementById('cfg-whatsapp')?.value.trim() || state.settings.whatsappNumber,
            homepageImg: document.getElementById('cfg-homepage-img')?.value.trim() || state.settings.homepageImg,
            heroPosition: document.getElementById('cfg-hero-position').value
        };
        try {
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = 'Salvando...';
            }

            // Apply immediately; onSnapshot will reconcile the cached value with
            // the server response without making the editor wait for a round trip.

            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), nextSettings, { merge: true });
            delete document.getElementById('config-inputs-container').dataset.dirty;
            window.showToast("Configurações salvas com sucesso!");
        } catch (err) {
            console.error(err);
            window.showToast("Erro ao salvar alterações.", true);
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = previousLabel || 'Salvar Configurações';
            }
        }
    };
}

export function renderAdmin() {
    const lists = guestLists(state.guests);
    document.getElementById('stat-total-guests').textContent = lists.people.length;
    document.getElementById('stat-confirmed-guests').textContent = lists.confirmed.length;
    let host = document.getElementById('admin-guest-lists');
    if (!host) return;
    host.replaceChildren();
    const exportButton = document.createElement('button');
    exportButton.type = 'button'; exportButton.className = 'btn-primary';
    exportButton.textContent = 'Baixar lista em PDF';
    exportButton.disabled = !state.guestsLoaded || !!state.guestsError;
    exportButton.onclick = async () => {
        exportButton.disabled = true;
        try {
            await import('./vendor/jspdf.umd.min.js');
            createGuestPdf(state.guests, window.jspdf.jsPDF, state.settings.names).save('lista-de-convidados.pdf');
            window.showToast('PDF gerado. Confira os downloads do navegador.');
        } catch (error) { console.error(error); window.showToast('Não foi possível gerar o PDF. Tente novamente.', true); }
        finally { exportButton.disabled = false; }
    };
    host.append(exportButton);
    const help = document.createElement('p');
    help.textContent = state.guestsError ? 'Não foi possível carregar a lista. Recarregue a página.' : !state.guestsLoaded ? 'Carregando convidados…' : `${lists.confirmed.length} pessoas confirmadas, incluindo ${lists.confirmed.filter(p => p.companion).length} acompanhantes. As alterações de presença abaixo valem para todo o grupo.`;
    host.append(help);
    for (const [title, people, off] of [['Presença confirmada', lists.confirmed, false], ['Convidados Off', lists.off, true]]) {
        const section = document.createElement('section');
        const heading = document.createElement('h4'); heading.textContent = `${title} (${people.length})`; section.append(heading);
        if (!people.length) { const empty = document.createElement('p'); empty.textContent = 'Nenhum convidado nesta lista.'; section.append(empty); }
        for (const p of people) {
            const row = document.createElement('div'); row.className = 'admin-guest-row';
            const label = document.createElement('div');
            const name = document.createElement(off ? 's' : 'strong'); name.textContent = p.name;
            const detail = document.createElement('small'); detail.textContent = `${p.companion ? 'Acompanhante de ' + p.group : 'Titular'} · ${statusLabels[p.status]}`;
            label.append(name, detail); row.append(label);
            if (!p.companion) {
                const select = document.createElement('select'); select.setAttribute('aria-label', 'Presença do grupo de ' + p.name);
                for (const [value, text] of Object.entries(statusLabels)) { const option = new Option(text, value); select.add(option); }
                select.value = p.status;
                select.onchange = async () => {
                    select.disabled = true;
                    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'guests', p.id), { status: select.value }); window.showToast('Presença do grupo atualizada.'); }
                    catch (error) { select.value = p.status; window.showToast('Não foi possível atualizar a presença.', true); }
                    finally { select.disabled = false; }
                };
                row.append(select);
            }
            section.append(row);
        }
        host.append(section);
    }
    if (window.lucide) window.lucide?.createIcons();
}
