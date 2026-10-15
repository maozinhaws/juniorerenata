export const statusLabels = { confirmed: 'Confirmado', pending: 'Sem confirmação', declined: 'Não comparecerá', revoked: 'Desconvidado' };

export function guestLists(groups) {
    const people = groups.flatMap(g => [
        { name: g.mainName, group: g.mainName, id: g.id, companion: false, status: g.status },
        ...(g.companions || []).map(p => ({ name: p.name, group: g.mainName, id: g.id, companion: true, status: g.status }))
    ]).filter(p => typeof p.name === 'string' && p.name.trim()).map(p => ({ ...p, status: statusLabels[p.status] ? p.status : 'pending' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return { people, confirmed: people.filter(p => p.status === 'confirmed'), off: people.filter(p => p.status !== 'confirmed') };
}

export function createGuestPdf(groups, JsPDF, title = 'Lista de convidados') {
    const lists = guestLists(groups);
    const pdf = new JsPDF({ unit: 'mm', format: 'a4' });
    let y = 20;
    const heading = label => {
        pdf.setTextColor(70, 20, 40); pdf.setFontSize(18); pdf.text(label, 18, y); y += 10;
        pdf.setTextColor(35); pdf.setFontSize(10);
    };
    heading('Lista de convidados');
    const titleLines = pdf.splitTextToSize(title, 174);
    pdf.text(titleLines, 18, y); y += titleLines.length * 5 + 5;
    pdf.text(`${lists.confirmed.length} confirmados | ${lists.off.length} Off | ${lists.people.length} pessoas`, 18, y); y += 12;
    for (const [label, rows, strike] of [['Presença confirmada', lists.confirmed, false], ['Convidados Off', lists.off, true]]) {
        if (y > 240) { pdf.addPage(); y = 20; }
        heading(label);
        if (!rows.length) { pdf.text('Nenhum convidado nesta lista.', 18, y); y += 10; }
        for (const p of rows) {
            pdf.setFontSize(11);
            const lines = pdf.splitTextToSize(p.name, 170);
            pdf.setFontSize(9);
            const detail = pdf.splitTextToSize(`${p.companion ? 'Acompanhante de ' + p.group : 'Titular'} — ${statusLabels[p.status]}`, 170);
            const height = (lines.length + detail.length) * 5 + 5;
            if (y + height > 275) { pdf.addPage(); y = 20; heading(label + ' (continuação)'); }
            pdf.setFontSize(11); pdf.setTextColor(30);
            for (const line of lines) {
                pdf.text(line, 18, y);
                if (strike) { pdf.setDrawColor(80); pdf.line(18, y - 1, 18 + pdf.getTextWidth(line), y - 1); }
                y += 5;
            }
            pdf.setFontSize(9); pdf.setTextColor(90); pdf.text(detail, 18, y); y += detail.length * 5 + 5;
        }
        y += 6;
    }
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
        pdf.setPage(page); pdf.setFontSize(9); pdf.setTextColor(90);
        pdf.text(`Página ${page} de ${pdf.getNumberOfPages()}`, 18, 287);
    }
    return pdf;
}
