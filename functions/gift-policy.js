export function validateGiftClaim(data) {
    if (!/^[\w-]+:(main|\d+)$/.test(data.guestId || '')) throw new Error('Selecione seu nome.');
    if (!/^[\w-]{1,150}$/.test(data.giftId || '')) throw new Error('Presente inválido.');
    if (!/^[a-f0-9-]{36}$/.test(data.requestId || '')) throw new Error('Pedido inválido.');
    if (!Number.isInteger(data.amountCents) || data.amountCents < 1 || data.amountCents > 100000000000) throw new Error('Informe um valor positivo com até duas casas decimais.');
    if (!['pix','payment','store'].includes(data.method) || data.paid !== true) throw new Error('Confirme que realizou o pagamento.');
    const receipt = data.receipt || '';
    if (typeof receipt !== 'string' || !receipt || receipt.length > 340000 || (receipt && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(receipt))) throw new Error('Envie uma imagem de comprovante válida.');
    if (receipt) {
        const bytes = Buffer.from(receipt.split(',')[1], 'base64');
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Comprovante inválido.');
    }
}
export function giftDecision(previous, next) {
    if (!['approved','rejected'].includes(next)) throw new Error('Decisão inválida.');
    if (previous !== 'pending' && previous !== next) throw new Error('Este pagamento já foi analisado.');
    return next;
}
