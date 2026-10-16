import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { db, state, appId } from './firebase-init.js';
import { participants } from './guests.js';
const ref = (kind,id) => doc(db,'weddingSpark',appId,kind,id);
const col = kind => collection(db,'weddingSpark',appId,kind);
const rows = snapshot => snapshot.docs.map(d=>({id:d.id,...d.data(),timestamp:d.data().createdAt?.toDate().toISOString()||''}));
function personData(key) {
    const person=participants().find(p=>p.key===key);
    if(!person)throw new Error('Selecione seu nome na lista.');
    const split=key.lastIndexOf(':');
    return {guestId:key,groupId:key.slice(0,split),member:key.slice(split+1),author:person.name};
}
function photo(value,required=false) {
    if(typeof value!=='string'||value.length>340000||(required&&!value)||(value&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)))throw new Error('Escolha uma foto válida de até 3 MB.');
    return value;
}
function friendly(error) {
    if(error.code==='permission-denied')return new Error('Envio não autorizado. Confira seu nome, os dados e o limite de envios.');
    if(error.code==='unavailable')return new Error('Sem conexão. O envio não foi confirmado. Tente novamente.');
    return error;
}
export async function sparkMural(action,data={}) {
    try {
        if(action==='list')return {rows:rows(await getDocs(state.isAdminLoggedIn?col('muralNotes'):query(col('muralNotes'),where('status','==','approved')))).sort((a,b)=>b.timestamp.localeCompare(a.timestamp))};
        if(action==='submit') {
            const person=personData(data.guestId),text=String(data.text||'').trim(),image=photo(data.image||'');
            if(!text||text.length>1000)throw new Error('Escreva um recado de até 1.000 caracteres.');
            return await runTransaction(db,async tx=>{
                const quotaRef=ref('muralSlots',data.guestId),snapshot=await tx.get(quotaRef),requests=snapshot.data()?.requests||[];
                const duplicate=requests.indexOf(data.requestId);
                if(duplicate>=0)return {id:data.guestId+'_'+(duplicate+1)};
                if(requests.length>=2)throw new Error('Este convidado já enviou os dois recados permitidos.');
                const slot=requests.length+1,id=data.guestId+'_'+slot;
                tx.set(ref('muralNotes',id),{...person,requestId:data.requestId,slot,text,image,color:data.color,status:'pending',createdAt:serverTimestamp()});
                tx.set(quotaRef,{requests:[...requests,data.requestId]});return {id};
            });
        }
        if(action==='moderate') {
            if(!state.isAdminLoggedIn)throw new Error('Acesso restrito aos noivos.');
            return await runTransaction(db,async tx=>{
                const target=ref('muralNotes',data.id),snapshot=await tx.get(target),row=snapshot.data();
                if(!row)throw new Error('Recado não encontrado.');
                if(row.status===data.status)return {};
                if (!(data.status === 'deleted' || (row.status === 'deleted' && data.status === 'pending') || (row.status === 'pending' && ['approved','rejected'].includes(data.status)))) throw new Error('Ação inválida para este recado.');
                tx.update(target,{status:data.status});return {};
            });
        }
    }catch(e){throw friendly(e);}
}
export async function sparkGifts(action,data={}) {
    try {
        if(action==='list') {
            const [approved,pending]=await Promise.all([getDocs(col('giftApprovals')),state.isAdminLoggedIn?getDocs(query(col('giftClaims'),where('status','==','pending'))):null]);
            const sums=new Map();approved.docs.forEach(d=>{const a=d.data();sums.set(a.giftId,(sums.get(a.giftId)||0)+a.amountCents);});
            return {rows:pending?rows(pending):[],totals:[...sums].map(([giftId,amountCents])=>({giftId,amountCents}))};
        }
        if(action==='submit') {
            const person=personData(data.guestId),receipt=photo(data.receipt,true);
            if(!data.paid||!Number.isInteger(data.amountCents)||data.amountCents<1||data.amountCents>100000000000||!['pix','payment','store'].includes(data.method))throw new Error('Confira o valor e confirme que realizou o pagamento.');
            const gift=state.gifts.find(g=>g.id===data.giftId);if(!gift)throw new Error('Presente não encontrado.');
            return await runTransaction(db,async tx=>{
                const quotaRef=ref('giftSlots',data.guestId),snapshot=await tx.get(quotaRef),quota=snapshot.data(),day=Timestamp.fromDate(new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z'));
                const requests=quota?.day?.isEqual(day)?quota.requests:[];
                if(requests.includes(data.requestId))return {id:data.requestId};
                if(requests.length>=20)throw new Error('Limite diário de comprovantes atingido.');
                tx.set(ref('giftClaims',data.requestId),{...person,requestId:data.requestId,giftId:gift.id,giftTitle:gift.title,amountCents:data.amountCents,method:data.method,receipt,paid:true,status:'pending',createdAt:serverTimestamp()});
                tx.set(quotaRef,{day,requests:[...requests,data.requestId]});return {id:data.requestId};
            });
        }
        if(action==='moderate') {
            if(!state.isAdminLoggedIn)throw new Error('Acesso restrito aos noivos.');
            return await runTransaction(db,async tx=>{
                const target=ref('giftClaims',data.id),snapshot=await tx.get(target),row=snapshot.data();
                if(!row)throw new Error('Comprovante não encontrado.');
                if(row.status===data.status)return {};
                if(row.status!=='pending'||!['approved','rejected'].includes(data.status))throw new Error('Comprovante já analisado.');
                tx.update(target,{status:data.status});
                if(data.status==='approved')tx.set(ref('giftApprovals',data.id),{giftId:row.giftId,amountCents:row.amountCents});
                return {};
            });
        }
    }catch(e){throw friendly(e);}
}
