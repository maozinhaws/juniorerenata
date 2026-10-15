export function safeStoreUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
}
export function countdownParts(milliseconds) {
    const total = Math.max(0, Math.floor(Number(milliseconds) / 1000) || 0);
    return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}

export function chapterCuriosity(row) {
    if (Object.hasOwn(row, 'curiosity')) return {author:row.curiosityAuthor === 'noiva' ? 'noiva' : 'noivo', text:String(row.curiosity || '')};
    return row.groomNote ? {author:'noivo',text:row.groomNote} : {author:'noiva',text:row.brideNote || ''};
}
