import { state, auth, escapeHTML, renderGifts } from './firebase-init.js';
import { isPreview } from './data-store.js';
import { participants } from './guests.js';
import { mountImageInput, validImageSource } from './image-input.js?v=20260925-2329';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';
import { safeStoreUrl } from './site-values.js';
export { safeStoreUrl } from './site-values.js';
const $ = id => document.getElementById(id);
const money = cents => (cents / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let amountCents = 0, requestId, submitted = false, busy = false, queue = [], whatsappText = '';
const previewKey = 'wedding-gift-payments-preview-v1';
async function api(action, payload = {}) {
    if (!isPreview) return (await httpsCallable(getFunctions(auth.app),'weddingGifts')({action,...payload})).data;
    let rows = JSON.parse(localStorage.getItem(previewKey) || '[]');
    if (action === 'submit') {
        const person = participants().find(p => p.key === payload.guestId);
        if (!person || !payload.paid || !Number.isInteger(payload.amountCents) || payload.amountCents < 1 || !payload.receipt) throw new Error('Confira seu nome, valor e comprovante.');
        if (!rows.some(r=>r.id === payload.requestId)) {
            rows.push({...payload,id:payload.requestId,author:person.name,giftTitle:state.selectedGift.title,status:'pending',timestamp:new Date().toISOString()});
            localStorage.setItem(previewKey,JSON.stringify(rows));
        }
        return {id:payload.requestId};
    }
    if (action === 'moderate') {
        if (!state.isAdminLoggedIn) throw new Error('Acesso restrito.');
        const row = rows.find(r=>r.id===payload.id);
        if (!row || row.status !== 'pending' || !['approved','rejected'].includes(payload.status)) throw new Error('Solicitação já analisada.');
        row.status = payload.status; localStorage.setItem(previewKey,JSON.stringify(rows));
    }
    const sums = new Map();
    rows.filter(r=>r.status==='approved').forEach(r=>sums.set(r.giftId,(sums.get(r.giftId)||0)+r.amountCents));
    return {rows:state.isAdminLoggedIn ? rows.filter(r=>r.status==='pending') : [],totals:[...sums].map(([giftId,amountCents])=>({giftId,amountCents}))};
}
export async function refreshGiftPayments() {
    const panel = $('gift-moderation'); if (!panel) return;
    try {
        const result = await api('list');
        state.giftPaymentTotals = result.totals || []; queue = state.isAdminLoggedIn ? result.rows || [] : [];
        renderGifts();
        panel.innerHTML = state.isAdminLoggedIn ? queue.map(row=>'<article class="payment-review"><strong>'+escapeHTML(row.author)+' · '+money(row.amountCents)+'</strong><p>'+escapeHTML(row.giftTitle)+' · '+escapeHTML(row.method)+'</p><p>Referência: '+escapeHTML(row.id)+'</p>'+(row.receipt ? '<a href="'+escapeHTML(row.receipt)+'" download="comprovante.jpg"><img src="'+escapeHTML(row.receipt)+'" alt="Comprovante enviado por '+escapeHTML(row.author)+'">Baixar comprovante</a>' : '')+'<button data-payment-review="'+escapeHTML(row.id)+'" data-status="approved">Aprovar pagamento</button><button data-payment-review="'+escapeHTML(row.id)+'" data-status="rejected">Recusar</button></article>').join('') || '<p>Nenhum pagamento pendente.</p>' : '';
    } catch { panel.textContent = 'Não foi possível carregar os pagamentos. A aprovação em produção depende da função weddingGifts publicada.'; }
}
function amountValue() {
    const value = Number($('donation-amount').value);
    return Number.isFinite(value) && value > 0 && value <= 1000000000 && Math.abs(value * 100 - Math.round(value * 100)) < .00001 ? Math.round(value * 100) : 0;
}
function configureLink(id, value) {
    const link = $(id), url = safeStoreUrl(value);
    link.hidden = !url; if (url) link.href = url; else link.removeAttribute('href');
    return url;
}
export function initGifts() {
    mountImageInput('gift-receipt','comprovante');
    window.openPixModal = (id, method = 'pix') => {
        if(busy)return window.showToast('Aguarde o envio do comprovante.',true);
        const gift = state.gifts.find(row=>row.id===id); if (!gift) return;
        state.selectedGift=gift; amountCents=0; requestId=crypto.randomUUID(); submitted=false;
        $('gift-amount-form').reset(); $('gift-confirm-form').reset(); $('gift-method').value=method;
        $('gift-receipt').dispatchEvent(new Event('input'));
        $('gift-payment-details').hidden=true; $('gift-whatsapp').hidden=true; $('gift-confirm-form').hidden=false;
        $('gift-amount-form').querySelector('button').disabled=false; $('donation-amount').disabled=false;
        $('pix-title').textContent=gift.title; $('pix-status').textContent='Informe o valor antes de acessar o QR code e os links.';
        $('gift-guest').innerHTML='<option value="">Selecione seu nome</option>'+participants().map(p=>'<option value="'+escapeHTML(p.key)+'">'+escapeHTML(p.name)+' — convite de '+escapeHTML(p.group)+'</option>').join('');
        $('modal-pix').classList.remove('hidden');
    };
    window.closePixModal=()=>$('modal-pix').classList.add('hidden');
    $('donation-amount').addEventListener('input',()=>{amountCents=0;$('gift-payment-details').hidden=true;});
    $('gift-amount-form').addEventListener('submit',event=>{
        event.preventDefault(); if(submitted)return;
        amountCents=amountValue(); if(!amountCents)return window.showToast('Informe um valor positivo com até duas casas decimais.',true);
        const gift=state.selectedGift, key=String(state.settings.pixKey||'').trim();
        $('donation-summary').textContent='Sua contribuição: '+money(amountCents);
        $('pix-key').value=key; $('btn-copy-pix').disabled=!key;
        $('pix-receiver').textContent=key?'Titular: '+(state.settings.receiverName||'Confira no banco'): 'Chave Pix ainda não cadastrada.';
        const qr=gift.qrImageUrl && validImageSource(gift.qrImageUrl);
        $('gift-qr').hidden=!qr; $('gift-qr-empty').hidden=!!qr;
        if(qr)$('gift-qr').src=gift.qrImageUrl;else $('gift-qr').removeAttribute('src');
        $('gift-copy-link').hidden=!configureLink('gift-payment-link',gift.paymentUrl);
        configureLink('pix-store',gift.storeUrl); $('gift-payment-details').hidden=false;
        $('pix-status').textContent='Valor definido. O pagamento só será confirmado após a aprovação dos noivos.';
    });
    window.copyPix=async()=>{
        if(!amountCents || !$('pix-key').value)return;
        try {await navigator.clipboard.writeText($('pix-key').value);$('pix-status').textContent='Chave Pix copiada.';}
        catch {$('pix-key').focus();$('pix-key').select();$('pix-status').textContent='Selecione e copie a chave manualmente.';}
    };
    $('gift-copy-link').onclick=async()=>{
        if(!amountCents)return;const url=safeStoreUrl(state.selectedGift.paymentUrl);if(!url)return;
        try {await navigator.clipboard.writeText(url);$('pix-status').textContent='Link copiado.';}catch{$('pix-status').textContent='Abra o link de pagamento e copie o endereço no navegador.';}
    };
    $('gift-confirm-form').addEventListener('submit',async event=>{
        event.preventDefault();if(busy||submitted)return;
        if(!amountCents || amountCents!==amountValue())return window.showToast('Confirme o valor da contribuição.',true);
        const receipt=$('gift-receipt');
        if(receipt.dataset.imageBusy)return window.showToast('Aguarde o comprovante.',true);
        if(!/^data:image\/jpeg;base64,/.test(receipt.value) || !validImageSource(receipt.value))return window.showToast('Envie ou cole a imagem do comprovante (até 3 MB).',true);
        const person=participants().find(p=>p.key===$('gift-guest').value);
        if(!person)return window.showToast('Selecione seu nome na lista.',true);
        busy=true;$('gift-submit').disabled=true;
        try {
            const result=await api('submit',{requestId,giftId:state.selectedGift.id,guestId:person.key,amountCents,method:$('gift-method').value,receipt:receipt.value,paid:$('gift-paid').checked});
            window.showToast('Comprovante enviado para aprovação.');
            submitted=true;$('gift-confirm-form').hidden=true;$('gift-whatsapp').hidden=false;$('donation-amount').disabled=true;$('gift-amount-form').querySelector('button').disabled=true;
            $('gift-confirm-status').textContent='Comprovante recebido. Aguardando aprovação dos noivos. Referência: '+result.id;
            whatsappText='Olá! Enviei pelo site meu comprovante de '+money(amountCents)+' para '+state.selectedGift.title+'. Nome: '+person.name+'. Referência: '+result.id+'. Aguardo aprovação.';
            const phone=String(state.settings.whatsappNumber||'').replace(/\D/g,'');
            $('gift-whatsapp-link').hidden=!/^\d{10,15}$/.test(phone);
            if(!$('gift-whatsapp-link').hidden)$('gift-whatsapp-link').href='https://wa.me/'+phone+'?text='+encodeURIComponent(whatsappText);
            $('gift-share-status').textContent='O comprovante já está no painel. Para enviá-lo também pelo WhatsApp, compartilhe a imagem ou anexe-a na conversa. Abrir a conversa não envia automaticamente.';
            await refreshGiftPayments();
        }catch{$('pix-status').textContent='Não foi possível registrar o comprovante. Nada foi confirmado. Tente novamente; o mesmo pedido não será duplicado.';}
        finally{busy=false;$('gift-submit').disabled=false;}
    });
    $('gift-share-receipt').onclick=async()=>{
        const source=$('gift-receipt').value;if(!submitted||!source)return;
        const blob=await (await fetch(source)).blob(), file=new File([blob],'comprovante.jpg',{type:'image/jpeg'});
        if(navigator.canShare?.({files:[file]})) {
            try{await navigator.share({files:[file],text:whatsappText,title:'Comprovante para os noivos'});}catch(e){if(e.name!=='AbortError')$('gift-share-status').textContent='Não foi possível compartilhar. Abra a conversa e anexe o comprovante.';}
        }else{
            const link=document.createElement('a');link.href=source;link.download='comprovante.jpg';link.click();
            $('gift-share-status').textContent='Comprovante baixado. Abra a conversa no WhatsApp e anexe esse arquivo antes de enviar.';
        }
    };
    $('gift-refresh').onclick=refreshGiftPayments;
    document.addEventListener('click',async event=>{
        const confirm=event.target.closest('[data-confirm-gift]');if(confirm)window.openPixModal(confirm.dataset.confirmGift,'store');
        const pix=event.target.closest('[data-pix-gift]');if(pix)window.openPixModal(pix.dataset.pixGift);
        const del=event.target.closest('[data-delete-gift]');if(del)window.deleteGift(del.dataset.deleteGift);
        const review=event.target.closest('[data-payment-review]');
        if(review && state.isAdminLoggedIn){review.disabled=true;try{await api('moderate',{id:review.dataset.paymentReview,status:review.dataset.status});window.showToast(review.dataset.status==='approved'?'Comprovante aprovado. Contribuição confirmada.':'Comprovante recusado.');await refreshGiftPayments();}catch{window.showToast('Não foi possível aprovar. Atualize a lista e tente novamente.',true);}finally{review.disabled=false;}}
        const edit=event.target.closest('[data-edit-gift]');if(!edit||!state.isAdminLoggedIn)return;
        const gift=state.gifts.find(r=>r.id===edit.dataset.editGift);if(!gift)return;
        window.openAddGiftModal();$('gift-modal-heading').textContent='Editar presente';
        for(const [field,value] of Object.entries({id:gift.id,title:gift.title,amount:gift.totalAmount,category:gift.category,image:gift.imageUrl,desc:gift.description,store:gift.storeUrl,qr:gift.qrImageUrl,payment:gift.paymentUrl}))$('ag-'+field).value=value??'';
        for(const id of ['ag-image','ag-qr'])$(id).dispatchEvent(new Event('input'));
    });
    refreshGiftPayments();
    setInterval(()=>{if(!document.hidden)refreshGiftPayments();},60000);
}
