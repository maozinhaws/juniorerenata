import {state, db, appId} from './firebase-init.js';
import {doc, updateDoc} from './data-store.js';
import {guestLists, statusLabels, createGuestPdf} from './guest-list.js';

function button(label, action) {
    const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=action; return b;
}
async function save(id, patch) {
    if (!state.isAdminLoggedIn) return;
    await updateDoc(doc(db,'artifacts',appId,'public','data','guests',id),patch);
    document.getElementById('guest-manager-status').textContent='Convidado atualizado.';
    window.showToast('Convidado atualizado.');
}
export function renderGuestManager() {
    let dialog=document.getElementById('guest-manager-dialog');
    if (!dialog) {
        dialog=document.createElement('dialog'); dialog.id='guest-manager-dialog';
        dialog.setAttribute('aria-labelledby','guest-manager-title');
        dialog.innerHTML='<header><h2 id="guest-manager-title">Lista de convidados</h2></header><div id="guest-manager-tools"></div><p id="guest-manager-status" role="status" aria-live="polite"></p><p>Cada pessoa tem sua própria situação. Aguardando confirmação não significa ausência. Somente ausentes e banidos ficam riscados em Convidados Off.</p><div id="admin-guest-lists"></div>';
        dialog.querySelector('header').append(button('Fechar',()=>dialog.close())); document.body.append(dialog);
        const tools=dialog.querySelector('#guest-manager-tools');
        tools.append(button('Inserir convidado',()=>window.openAddGuestModal()),button('Baixar PDF',async()=>{
            try { if (!state.guestsLoaded || state.guestsError) throw new Error('Aguarde o carregamento da lista.'); await import('./vendor/jspdf.umd.min.js'); createGuestPdf(state.guests,window.jspdf.jsPDF,state.settings.names).save('lista-de-convidados.pdf'); window.showToast('PDF gerado.'); }
            catch(e){window.showToast(e.message,true);}
        }));
    }
    document.getElementById('open-guest-manager').onclick=()=>{if(state.isAdminLoggedIn)dialog.showModal();};
    const host=dialog.querySelector('#admin-guest-lists'); host.replaceChildren();
    const lists=guestLists(state.guests);
    for (const [title,people,strike] of [['Confirmados',lists.confirmed,false],['Aguardando confirmação',lists.pending,false],['Convidados Off',lists.off,true]]) {
        const section=document.createElement('section'),h=document.createElement('h3');h.textContent=`${title} (${people.length})`;section.append(h);
        for(const p of people){
            const row=document.createElement('div');row.className='admin-guest-row';
            const info=document.createElement('div'),name=document.createElement(strike?'s':'strong'),detail=document.createElement('small');
            name.textContent=p.name;detail.textContent=p.companion?'Acompanhante de '+p.group:'Titular';info.append(name,detail);row.append(info);
            const actions=document.createElement('div');actions.className='guest-actions';
            const select=document.createElement('select');select.setAttribute('aria-label','Situação de '+p.name);
            for(const [value,label] of Object.entries(statusLabels))select.add(new Option(value==='revoked'?'Banido / desconvidado':label,value));select.value=p.status;
            const run=async(fn)=>{if(row.dataset.busy)return;row.dataset.busy='true';try{await fn();}catch(e){document.getElementById('guest-manager-status').textContent='Não foi possível salvar. Confira o nome e tente novamente.';window.showToast('Não foi possível salvar. Tente novamente.',true);select.value=p.status;}finally{delete row.dataset.busy;}};
            select.onchange=()=>run(()=>save(p.id,{['memberStates.'+p.member]:select.value}));
            actions.append(select,button('Editar',()=>{
                const input=document.createElement('input');input.value=p.name;input.maxLength=120;input.setAttribute('aria-label','Nome de '+p.name);
                const commit=button('Salvar nome',()=>run(async()=>{
                    const next=input.value.trim();if(next.length<2)throw new Error('Nome inválido');
                    const g=state.guests.find(g=>g.id===p.id);
                    await save(p.id,p.companion?{companions:g.companions.map((c,i)=>String(i)===p.member?{...c,name:next}:c)}:{mainName:next});
                }));info.replaceChildren(input,commit);input.focus();
            }),button('Excluir',event=>{
                const control=event.currentTarget;
                control.textContent='Confirmar exclusão de '+p.name;
                control.onclick=()=>run(()=>save(p.id,{['memberStates.'+p.member]:'deleted'}));
            }));
            actions.append(button('Adicionar acompanhante',()=>{
                const input=document.createElement('input');input.placeholder='Nome do novo acompanhante';input.maxLength=120;input.setAttribute('aria-label','Novo acompanhante');
                const add=button('Salvar acompanhante',()=>run(async()=>{
                    const name=input.value.trim();if(name.length<2)throw new Error('Nome inválido');
                    const g=state.guests.find(g=>g.id===p.id),companions=[...(g.companions||[]),{name}];
                    await save(p.id,{companions,['memberStates.'+(companions.length-1)]:'pending'});
                }));info.append(input,add);input.focus();
            }));
            row.append(actions);section.append(row);
        }
        host.append(section);
    }
}
