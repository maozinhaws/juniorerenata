export function boardLayout(count, width, height) {
    const total = Math.max(1, Number(count) || 0);
    const columns = Math.max(2, Math.round(Math.sqrt(total * Math.max(1, width) / Math.max(1, height))));
    return {columns, rows:Math.max(2, Math.ceil(total / columns))};
}
