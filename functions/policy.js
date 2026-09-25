export function validateSubmission(data) {
    if (typeof data.guestId !== 'string' || !/^[\w-]+:(main|[0-9]+)$/.test(data.guestId)) throw new Error('Selecione seu nome na lista.');
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 1000) throw new Error('Escreva um recado de até 1.000 caracteres.');
    if (typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.requestId)) throw new Error('Identificador inválido.');
    if (typeof data.image !== 'string' || data.image.length > 340000 || (data.image && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.image))) throw new Error('Foto inválida. Envie uma foto pelo seletor.');
    if (data.image) {
        const bytes = Buffer.from(data.image.split(',')[1], 'base64');
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('O arquivo não é uma foto JPEG válida.');
    }
}
export function nextSlot(existing, requestId) {
    const duplicate = existing.find(row => row.requestId === requestId);
    if (duplicate) return { duplicate: true, id: duplicate.id };
    if (existing.length >= 2) throw new Error('Este convidado já enviou os dois recados permitidos.');
    return { slot: existing.length + 1 };
}
